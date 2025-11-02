// auth.js — tiny auth helper + navbar controller

window.HealthAuth = {
  user: null,

  async me() {
    try {
      const res = await fetch('/auth/me', { credentials: 'same-origin' });
      const data = await res.json();
      this.user = data.user || null;
      return this.user;
    } catch {
      this.user = null;
      return null;
    }
  },

  async logout() {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    this.user = null;
    location.reload();
  }
};

async function initNavbar() {
  const user = await HealthAuth.me();

  const loginBtn  = document.querySelector('[data-nav="login"]');
  const logoutBtn = document.querySelector('[data-nav="logout"]');
  const adminBtn  = document.querySelector('[data-nav="admin"]');

  if (user) {
    if (loginBtn)  loginBtn.style.display = 'none';
    if (logoutBtn) {
      logoutBtn.style.display = '';
      logoutBtn.onclick = (e) => { e.preventDefault(); HealthAuth.logout(); };
    }
    if (adminBtn)  adminBtn.style.display = (user.role === 'admin') ? '' : 'none';
  } else {
    if (loginBtn)  loginBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (adminBtn)  adminBtn.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initNavbar);
