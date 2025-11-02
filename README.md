# Health+ Subscriptions Mini‑Shop


**Stack:** Node 22, Express, Stripe Checkout (payment + subscription), vanilla HTML/CSS/JS storefront, React (CDN) admin, Power BI placeholder.


## Run locally
1. `npm i`
2. Create `.env` with Stripe keys (test mode). Add `STRIPE_WEBHOOK_SECRET` after step 4.
3. In Stripe Dashboard, create 2–3 Products with **one‑time** and **monthly** Prices. Put their **Price IDs** into `data/products.json`.
4. Start server: `npm run dev` → http://localhost:3000
5. (Optional, for metrics via webhooks) Install Stripe CLI and run:
```bash
stripe listen --forward-to localhost:3000/webhook