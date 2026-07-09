'use strict';

/* ── Currency rates (approximate, update via API in production) ─────────── */
const RATES = { USD: 1, EUR: 0.92, GBP: 0.79 };
const SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };
let currentCurrency = localStorage.getItem('mcg_currency') || 'USD';

function convertPrice(usd) {
  return (usd * RATES[currentCurrency]).toFixed(2);
}
function fmtPrice(usd) {
  return `${SYMBOLS[currentCurrency]}${convertPrice(usd)}`;
}

function updatePrices() {
  document.querySelectorAll('[data-usd]').forEach(el => {
    el.textContent = fmtPrice(parseFloat(el.dataset.usd));
  });
  document.querySelectorAll('[data-usd-secondary]').forEach(el => {
    const usd = parseFloat(el.dataset.usdSecondary);
    const alt = currentCurrency === 'USD' ? 'EUR' : 'USD';
    const sym = SYMBOLS[alt];
    const rate = RATES[alt];
    el.textContent = `≈ ${sym}${(usd * rate).toFixed(2)}`;
  });
  // Update cart totals
  if (window.renderCartTotals) renderCartTotals();
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('currencySelect');
  if (sel) {
    sel.value = currentCurrency;
    sel.addEventListener('change', () => {
      currentCurrency = sel.value;
      localStorage.setItem('mcg_currency', currentCurrency);
      updatePrices();
    });
  }
  updatePrices();
});

/* ── Cart ───────────────────────────────────────────────────────────────── */
let cart = JSON.parse(localStorage.getItem('mcg_cart') || '[]');

function saveCart() {
  localStorage.setItem('mcg_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
}

window.addToCart = function(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart();
  renderCartItems();
  showToast(`✓ ${product.name}`, 'Añadido al carrito');
  // GA4 event
  if (window.gtag) gtag('event', 'add_to_cart', { item_name: product.name, value: product.price });
};

window.removeFromCart = function(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCartItems();
};

window.renderCartItems = function() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  if (!cart.length) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🧺</div>
        <p>Tu carrito está vacío</p>
        <a href="catalogo.html" class="btn btn--outline btn--sm" style="margin-top:1rem" data-i18n="cat_see_all">Ver catálogo</a>
      </div>`;
    renderCartTotals();
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item__img">
        <img src="${item.img}" alt="${item.name}" />
      </div>
      <div class="cart-item__info">
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__artisan">${item.artisan}</div>
        <div class="cart-item__price" data-usd="${item.price}">${fmtPrice(item.price)}</div>
        <button class="cart-item__remove" onclick="removeFromCart('${item.id}')">✕ Eliminar</button>
      </div>
    </div>
  `).join('');
  renderCartTotals();
};

window.renderCartTotals = function() {
  const subtotalEl = document.getElementById('cartSubtotal');
  const shippingEl = document.getElementById('cartShipping');
  const totalEl    = document.getElementById('cartTotal');
  if (!subtotalEl) return;

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const country  = document.getElementById('shippingCountry')?.value || '';
  const shipping  = !cart.length ? 0 : country === 'PE' ? 8 : country ? 22 : 0;
  const total     = subtotal + shipping;

  subtotalEl.textContent = fmtPrice(subtotal);
  shippingEl.textContent = shipping === 0 ? (cart.length ? '— Selecciona país' : '—') : fmtPrice(shipping);
  if (totalEl) totalEl.innerHTML = `<span class="price">${fmtPrice(total)}</span>`;
};

function openCart() {
  document.getElementById('cartSidebar')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartItems();
}
function closeCart() {
  document.getElementById('cartSidebar')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.cart-btn, [data-open-cart]').forEach(btn => {
    btn.addEventListener('click', openCart);
  });
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('shippingCountry')?.addEventListener('change', renderCartTotals);
  updateCartBadge();
});

/* ── Toast ──────────────────────────────────────────────────────────────── */
window.showToast = function(title, message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.querySelector('.toast__title').textContent = title;
  toast.querySelector('.toast__msg').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
};

/* ── Nav scroll ─────────────────────────────────────────────────────────── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 38);
}, { passive: true });

/* ── Reveal on scroll ───────────────────────────────────────────────────── */
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revObs.unobserve(e.target); }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revObs.observe(el));
  // Fallback for mobile/slow connections
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => el.classList.add('visible'));
  }, 1500);
});

/* ── Counter animation ──────────────────────────────────────────────────── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  let current = 0;
  const step = target / (1800 / 16);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current) + suffix;
  }, 16);
}
const cntObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); cntObs.unobserve(e.target); } });
}, { threshold: 0.5 });
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.stat__num[data-target]').forEach(el => cntObs.observe(el));
});

/* ── Lazy images ────────────────────────────────────────────────────────── */
function lazyLoadImages(root) {
  const imgs = (root || document).querySelectorAll('img[data-src]');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const img = e.target;
          img.src = img.dataset.src;
          img.onload = () => img.classList.add('loaded');
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '300px' });
    imgs.forEach(img => obs.observe(img));
  } else {
    imgs.forEach(img => { img.src = img.dataset.src; img.onload = () => img.classList.add('loaded'); });
  }
}
document.addEventListener('DOMContentLoaded', () => lazyLoadImages());

/* ── Smooth scroll ──────────────────────────────────────────────────────── */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.querySelector(a.getAttribute('href'));
  if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});

/* ── Mobile burger ──────────────────────────────────────────────────────── */
const burger = document.getElementById('navBurger');
let mMenu = null;
burger?.addEventListener('click', () => {
  if (mMenu) { mMenu.remove(); mMenu = null; return; }
  mMenu = document.createElement('div');
  mMenu.style.cssText = 'position:fixed;top:62px;left:0;right:0;background:rgba(26,16,10,.98);backdrop-filter:blur(16px);padding:1.5rem 2rem;z-index:199;border-bottom:1px solid rgba(196,118,74,.2);animation:slideDown .25s ease both';
  const base = location.pathname.includes('/pages/') ? '..' : '.';
  mMenu.innerHTML = [
    ['nav_nosotros',`${base}/index.html#nosotros`],
    ['nav_catalogo',`${base}/pages/catalogo.html`],
    ['nav_artesanos',`${base}/pages/artesanos.html`],
    ['nav_mercados',`${base}/index.html#mercados`],
    ['nav_blog',`${base}/pages/blog.html`],
    ['nav_contacto',`${base}/pages/contacto.html`],
  ].map(([k,h]) => `<a href="${h}" style="display:block;font-family:Outfit,sans-serif;font-size:.95rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:rgba(242,232,217,.8);padding:.85rem 0;border-bottom:1px solid rgba(196,118,74,.1)" data-i18n="${k}">${(window.t && window.t(k)) || k}</a>`).join('') +
  `<div style="display:flex;gap:.75rem;margin-top:1.25rem">
    <a href="${base}/pages/login.html" style="flex:1;text-align:center;padding:.75rem;border:1px solid rgba(242,232,217,.25);color:rgba(242,232,217,.8);border-radius:4px;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:600;text-transform:uppercase" data-i18n="nav_login">Ingresar</a>
    <a href="${base}/pages/register.html" style="flex:1;text-align:center;padding:.75rem;background:#C4764A;color:#FEFCF8;border-radius:4px;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:600;text-transform:uppercase" data-i18n="nav_register">Registrarse</a>
  </div>`;
  document.body.appendChild(mMenu);
  if (window.applyTranslations) applyTranslations();
});

/* ── FAQ accordion ──────────────────────────────────────────────────────── */
document.addEventListener('click', e => {
  const btn = e.target.closest('.faq-question');
  if (!btn) return;
  const answer = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-question.open').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling?.classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    answer?.classList.add('open');
  }
});

/* ── Artisan modal ──────────────────────────────────────────────────────── */
window.openArtisanModal = function(data) {
  const o = document.getElementById('artisanModal');
  if (!o) return;
  o.querySelector('.modal__img img').src = data.img;
  o.querySelector('.modal__tag').textContent = data.tag;
  o.querySelector('.modal__body h2').textContent = data.name;
  o.querySelector('.modal__village').textContent = '◎ ' + data.village;
  const ps = o.querySelectorAll('.modal__para');
  if (ps[0]) ps[0].textContent = data.bio;
  if (ps[1]) ps[1].textContent = data.story;
  const ms = o.querySelectorAll('.modal__metric');
  data.metrics.forEach((m, i) => {
    if (ms[i]) {
      ms[i].querySelector('strong').textContent = m.value;
      ms[i].querySelector('span').textContent = m.label;
    }
  });
  o.querySelector('.modal__tags').innerHTML = data.products.map(p => `<span class="modal__tag-item">${p}</span>`).join('');
  o.classList.add('open');
  document.body.style.overflow = 'hidden';
};
window.closeArtisanModal = function() {
  document.getElementById('artisanModal')?.classList.remove('open');
  document.body.style.overflow = '';
};
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeArtisanModal(); closeCart(); } });

/* ── Newsletter ─────────────────────────────────────────────────────────── */
document.addEventListener('submit', e => {
  if (!e.target.classList.contains('newsletter-form-el')) return;
  e.preventDefault();
  const email = e.target.querySelector('input').value;
  if (email) {
    showToast('✓ ¡Suscripción exitosa!', 'Te mantendremos informado.');
    e.target.reset();
    if (window.gtag) gtag('event', 'newsletter_signup', { email });
  }
});

/* ── Google Analytics 4 placeholder ────────────────────────────────────── */
// Replace G-XXXXXXXXXX with your real GA4 Measurement ID
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
// gtag('config', 'G-XXXXXXXXXX'); // uncomment and add your ID
