```markdown
# 🩺 Health+ E-Commerce Platform

A modern **Node.js + Express + HTML/CSS** demo showcasing a subscription-based wellness brand storefront — built to demonstrate clean UI, modular routing, and seamless client interactions.

---

## 🚀 Overview

**Health+** is a lightweight, full-stack web application designed for e-commerce and subscription workflows.  
It blends a responsive, polished UI with a simple backend written in Express.js.

Key features include:

* 💎 **Modern responsive layout** with Flexbox & CSS Grid  
* 🧾 **Dynamic product catalog** (JSON-driven or static HTML)  
* 💳 **Local “cart” simulation** with one-time & subscription checkout  
* 🔐 **Auth simulation** (Admin/User roles via `auth.js`)  
* 📦 **Modular file structure** — easy to extend  
* 🌈 **Aesthetic gradient theming** and fully centered hero section  

---




## ⚙️ Installation & Setup

### 1️⃣ Prerequisites

Make sure you have:

* **Node.js v18+**
* **npm** (bundled with Node)
* Any modern browser (Chrome/Edge recommended)

### 2️⃣ Clone and Install

```bash
git clone https://github.com/dhaminideva/health-plus.git
cd health-plus
npm install
````

### 3️⃣ Run the Server

```bash
node server.js
```

App runs at 👉 **[http://localhost:3000](http://localhost:3000)**

### 4️⃣ Default Users

| Role  | Email               | Password |
| ----- | ------------------- | -------- |
| Admin | `admin@example.com` | `q`      |
| User  | `user@example.com`  | `a`      |

---

## 🖼️ Core Pages

### 🏠 **index.html**

* Landing 
* Feature cards (shipping, quality, etc.)
* Customer testimonials
* Product grid (three hard-coded examples)
* Minimal working cart simulation
* Subscribe/newsletter band
* Footer with company, help, and legal links

### 🔑 **login.html**

* Form-based mock authentication
* Redirects to home/dashboard upon login

### 🧰 **admin.html**

* Restricted route (protected via `requireRole('admin')` in server.js)

---

## 🧠 How It Works

1. **Express.js** serves static HTML/CSS/JS from `/public`.
2. **Session middleware** stores mock login state.
3. **/api/products** endpoint returns JSON product data (from `data/products.json`).
4. **Cart** logic is managed client-side with in-memory arrays (no database).

---

## 🌐 Tech Stack

| Layer    | Technology                                |
| -------- | ----------------------------------------- |
| Frontend | HTML5, CSS3, Vanilla JS                   |
| Backend  | Node.js + Express                         |
| Auth     | Simulated sessions (no DB)                |
| Data     | Static JSON / Local storage               |
| Styling  | Custom CSS, Flexbox, CSS Grid             |
| Hosting  | Localhost or any Node-compatible platform |

---

## 💡 Highlights

* **Single-page flow:** Everything visible above the fold — no excessive scrolling.
* **Fully responsive:** Optimized for 13–15" screens and mobile breakpoints.
* **Gradient design:** Dual-radial + linear gradient hero background for a sleek look.
* **Customizable:** Add products easily by extending `products.json` and updating images.
* **Accessible:** Semantic HTML5 structure and ARIA attributes in cart and forms.

---

## 🧱 Next Steps / Extensions

* Integrate a **MongoDB** or **SQLite** layer for persistent carts.
* Replace mock auth with **JWT-based authentication**.
* Add **Stripe API** for live checkout.
* Implement **Admin metrics dashboard** for product analytics.
* Deploy via **Render / Vercel / AWS Elastic Beanstalk**.

---

## 👩‍💻 Credits

Built with ❤️ by **Dhamini Devaraj**
Master’s in Computer Science, UMass Amherst — specializing in **Cybersecurity & Full-Stack Systems**.
*Clean UI. Modular code. Secure by design.*

---

## 🪪 License

This project is open for educational and demonstration purposes.
© 2025 Health+ Demo — All rights reserved.

```
```
