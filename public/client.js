// client.js — products, cart, checkout (with guest email)

const state = { products: [], cart: {} }; // cart key: `${prodId}:${which}`

async function fetchProducts() {
  const res = await fetch('/api/products', { credentials: 'same-origin' });
  state.products = await res.json();
}

function addToCart(prodId, whichKey) {
  const key = `${prodId}:${whichKey}`;
  state.cart[key] = (state.cart[key] || 0) + 1;
  renderCart();
}

function inc(key) { state.cart[key] = (state.cart[key] || 1) + 1; renderCart(); }
function dec(key) { state.cart[key] = Math.max(1, (state.cart[key] || 1) - 1); renderCart(); }
function rem(key) { delete state.cart[key]; renderCart(); }

function renderProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = state.products.map(p => `
    <div class="card">
      <img class="card-img" src="${p.image}" alt="${p.name}">
      <div class="card-body">
        <h3 class="card-title">${p.name}</h3>
        <p class="card-sub">${p.description}</p>
        <div class="badges">
          ${p.highlights.map(h => `<span class="badge">${h}</span>`).join('')}
        </div>
        <div class="card-actions">
          <button class="btn" onclick="addToCart('${p.id}','oneTimePriceId')">Add One-time</button>
          <button class="btn outline" onclick="addToCart('${p.id}','subscriptionPriceId')">Add Subscription</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCart() {
  const wrap = document.getElementById('cartItems');
  const badge = document.getElementById('cartBadge');
  const guestBlock = document.getElementById('guestBlock');

  const entries = Object.entries(state.cart);
  const totalQty = entries.reduce((s, [, q]) => s + q, 0);

  if (badge) {
    badge.hidden = totalQty === 0;
    badge.textContent = totalQty;
  }

  if (!entries.length) {
    wrap.innerHTML = '<p class="muted">Cart is empty</p>';
    if (guestBlock) guestBlock.hidden = true;
    return;
  }

  // show guest email when NOT logged in
  const showGuestEmail = !(window.HealthAuth && HealthAuth.user);
  if (guestBlock) guestBlock.hidden = !showGuestEmail;

  const rows = entries.map(([k, qty]) => {
    const [prodId, which] = k.split(':');
    const p = state.products.find(p => p.id === prodId);
    const label = which === 'oneTimePriceId' ? 'One-time' : 'Subscription';
    return `
      <div class="cart-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed rgba(255,255,255,.08)">
        <span>${p.name} — <em>${label}</em></span>
        <div class="cart-qty">
          <button class="btn outline" onclick="dec('${k}')">-</button>
          <span class="qty" style="padding:0 10px;display:inline-block;min-width:24px;text-align:center">${qty}</span>
          <button class="btn" onclick="inc('${k}')">+</button>
          <button class="btn outline" style="margin-left:6px;" onclick="rem('${k}')">Remove</button>
        </div>
      </div>
    `;
  }).join('');
  wrap.innerHTML = rows;
}

async function checkout(mode) {
  const items = Object.entries(state.cart).map(([k, qty]) => {
    const [prodId, which] = k.split(':');
    const p = state.products.find(p => p.id === prodId);
    const priceId = p[which];
    return { priceId, qty };
  });
  if (!items.length) { alert('Cart is empty'); return; }

  // if not logged in, supply guest email for receipt
  let guestEmail;
  if (!(window.HealthAuth && HealthAuth.user)) {
    guestEmail = document.getElementById('guestEmail')?.value.trim();
  }

  const res = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ mode, lineItems: items, guestEmail })
  });

  const data = await res.json();
  if (res.ok && data.url) window.location = data.url;
  else alert((data && data.error) || 'Checkout failed');
}

async function initShop() {
  // Ensure we know auth state BEFORE rendering cart (guest email visibility)
  if (window.HealthAuth && !HealthAuth.user) {
    try { await HealthAuth.me(); } catch {}
  }

  await fetchProducts();
  renderProducts();
  renderCart();

  document.getElementById('checkoutOneTime').onclick = () => checkout('payment');
  document.getElementById('checkoutSubscription').onclick = () => checkout('subscription');
}

document.addEventListener('DOMContentLoaded', initShop);
