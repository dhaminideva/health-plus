import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from 'fs';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import session from 'express-session';
import bcrypt from 'bcryptjs';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ------------------------------------------------------------------
// Basic app setup
// ------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Small health check
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ------------------------------------------------------------------
// STRIPE WEBHOOK — must be BEFORE any JSON body parser
// ------------------------------------------------------------------
const metrics = { kpis: { revenue: 0, mrr: 0, activeSubs: 0, orders: 0 }, recent: [] };

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.sendStatus(400);
  }

  const pushRecent = (type, data) => {
    metrics.recent.unshift({ ts: new Date().toISOString(), type, data });
    metrics.recent = metrics.recent.slice(0, 20);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      const isSub = s.mode === 'subscription';
      const amountTotal = s.amount_total ? s.amount_total / 100 : 0;
      metrics.kpis.revenue += amountTotal;
      metrics.kpis.orders += 1;
      if (isSub) metrics.kpis.activeSubs += 1;
      pushRecent('order', { id: s.id, mode: s.mode, amount: amountTotal, customer: s.customer_email });
      break;
    }
    case 'customer.subscription.created': {
      const sub = event.data.object;
      const mrr = sub.items.data.reduce((acc, i) => acc + (i.price.unit_amount || 0), 0) / 100;
      metrics.kpis.mrr += mrr;
      metrics.kpis.activeSubs += 1;
      pushRecent('subscription_created', { id: sub.id, mrr });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const mrr = sub.items.data.reduce((acc, i) => acc + (i.price.unit_amount || 0), 0) / 100;
      metrics.kpis.mrr = Math.max(0, metrics.kpis.mrr - mrr);
      metrics.kpis.activeSubs = Math.max(0, metrics.kpis.activeSubs - 1);
      pushRecent('subscription_canceled', { id: sub.id, mrr });
      break;
    }
    default:
      break;
  }
  res.json({ received: true });
});

// ------------------------------------------------------------------
// Sessions, JSON body
// ------------------------------------------------------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 4 } // 4h
}));
app.use(express.json());

// ------------------------------------------------------------------
// Users (file-backed)
// ------------------------------------------------------------------
const USERS_PATH = path.join(__dirname, 'data', 'users.json');
function ensureUsersFile() { if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, '[]', 'utf8'); }
function loadUsers() { ensureUsersFile(); try { return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')); } catch { return []; } }
function saveUsers(users) { fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8'); }
function findUserByEmail(email) {
  return loadUsers().find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
}

const requireAuth = (req, res, next) => req.session.user ? next() : res.status(401).json({ error: 'Unauthenticated' });
const requireRole = role => (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (req.session.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// ------------------------------------------------------------------
// Auth routes
// ------------------------------------------------------------------
app.post('/auth/signup', async (req, res) => {
  const { email, password, adminInvite } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 chars' });

  const users = loadUsers();
  if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase()))
    return res.status(409).json({ error: 'Account already exists' });

  const role = (adminInvite && process.env.ADMIN_INVITE_CODE && adminInvite === process.env.ADMIN_INVITE_CODE)
    ? 'admin'
    : 'user';

  const user = {
    id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    email: String(email).trim(),
    role,
    passwordHash: await bcrypt.hash(String(password), 10)
  };
  users.push(user);
  saveUsers(users);

  req.session.user = { id: user.id, email: user.email, role: user.role };
  res.json({ ok: true, user: req.session.user });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.user = { id: user.id, email: user.email, role: user.role };
  res.json({ ok: true, user: req.session.user });
});

app.post('/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/auth/me', (req, res) => res.json({ authenticated: !!req.session.user, user: req.session.user || null }));

// ------------------------------------------------------------------
// Gate the admin dashboard HTML BEFORE static handler
// ------------------------------------------------------------------
app.get('/admin.html', requireRole('admin'), (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ------------------------------------------------------------------
// Static assets (login.html, register.html, index.html, etc.)
// ------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------
// Products API
// ------------------------------------------------------------------
function loadProductsFile() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));
}
app.get('/api/products', (_req, res) => res.json(loadProductsFile()));

// ------------------------------------------------------------------
// Admin metrics (demo)
// ------------------------------------------------------------------
app.get('/api/metrics', requireRole('admin'), (_req, res) => res.json(metrics));

// ------------------------------------------------------------------
// Checkout (supports logged-in users and guests)
// ------------------------------------------------------------------
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { lineItems, mode, guestEmail } = req.body || {};
    if (!Array.isArray(lineItems) || !lineItems.length) return res.status(400).json({ error: 'No line items' });
    if (!['payment', 'subscription'].includes(mode)) return res.status(400).json({ error: 'Invalid mode' });

    const prods = loadProductsFile();
    const oneTimeSet = new Set(prods.map(p => p.oneTimePriceId).filter(Boolean));
    const subSet = new Set(prods.map(p => p.subscriptionPriceId).filter(Boolean));

    if (mode === 'payment') {
      for (const li of lineItems) {
        if (!oneTimeSet.has(li.priceId)) return res.status(400).json({ error: 'Cart has subscription items. Use "Checkout (Subscription)".' });
      }
    } else {
      for (const li of lineItems) {
        if (!subSet.has(li.priceId)) return res.status(400).json({ error: 'Cart has one-time items. Use "Checkout (One-time)".' });
      }
    }

    // Logged-in email wins; otherwise require a guest email
    const sessionEmail = req.session?.user?.email;
    const customerEmail = sessionEmail || (guestEmail ? String(guestEmail).trim() : undefined);
    if (!customerEmail) return res.status(400).json({ error: 'Email required (login or guest email)' });

    const stripeSession = await stripe.checkout.sessions.create({
      mode,
      line_items: lineItems.map(({ priceId, qty }) => ({ price: priceId, quantity: qty || 1 })),
      customer_email: customerEmail,
      success_url: `${BASE_URL}/admin.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/index.html?canceled=true`,
      allow_promotion_codes: true
    });

    res.json({ url: stripeSession.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Health+ running on ${BASE_URL}`);
});

