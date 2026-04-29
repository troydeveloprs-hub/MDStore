/* ===================================================================
   MDBOUTIQUEE — Features Module
   Smart Search, Recently Viewed, WhatsApp, Stock Counter,
   Loyalty Points, Analytics, Newsletter, Notifications, Comparison
   =================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  if (!window.MDB) return;

  function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/collections/') || path.includes('/Pages/')) return '../';
    return '';
  }

  function resolveImagePath(image) {
    if (!image) return '';
    if (/^(https?:)?\/\//.test(image) || image.startsWith('data:') || image.startsWith('/')) return image;
    if (image.startsWith('../') || image.startsWith('./')) return image;
    return getBasePath() + image;
  }

  /* ===================================================================
     1. SMART SEARCH — Live autocomplete overlay
     =================================================================== */
  const SearchEngine = {
    init() {
      const searchInputs = document.querySelectorAll('.search-input');
      searchInputs.forEach(input => {
        // Create results dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(dropdown);

        let debounce;
        input.addEventListener('input', () => {
          clearTimeout(debounce);
          const q = input.value.trim();
          if (q.length < 2) { dropdown.classList.remove('open'); return; }
          debounce = setTimeout(() => this.search(q, dropdown, input), 250);
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') dropdown.classList.remove('open');
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
          if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('open');
        });
      });
    },

    async search(query, dropdown, input) {
      if (window.MDB && window.MDB.Analytics) {
        window.MDB.Analytics.trackSearch(query);
      }
      const results = await MDB.Products.search(query);
      if (!results.length) {
        dropdown.innerHTML = `<div class="search-no-results"><i class="fa-solid fa-magnifying-glass"></i><p>No products found for "${query}"</p></div>`;
        dropdown.classList.add('open');
        return;
      }

      const basePath = getBasePath();
      dropdown.innerHTML = `
        <div class="search-results-header"><span>${results.length} result${results.length > 1 ? 's' : ''}</span></div>
        ${results.slice(0, 6).map(p => `
          <a href="${basePath}product.html?id=${p.id}" class="search-result-item">
            <img src="${resolveImagePath(p.image)}" alt="${p.name}" class="search-result-img">
            <div class="search-result-info">
              <span class="search-result-brand">${p.brand}</span>
              <span class="search-result-name">${p.name}</span>
              <span class="search-result-price">${MDB.UI.formatPrice(p.price)}</span>
            </div>
          </a>
        `).join('')}
        ${results.length > 6 ? `<a href="#" class="search-view-all" onclick="return false;">View all ${results.length} results</a>` : ''}
      `;
      dropdown.classList.add('open');
    },

  };
  SearchEngine.init();

  /* ===================================================================
     2. RECENTLY VIEWED â€” Track & display
     =================================================================== */
  const RecentlyViewed = {
    KEY: 'mdb_recently_viewed',
    MAX: 10,

    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
    _save(items) { localStorage.setItem(this.KEY, JSON.stringify(items)); },

    add(product) {
      let items = this.get().filter(i => i.id !== product.id);
      items.unshift({ id: product.id, name: product.name, brand: product.brand, price: product.price, image: product.image, viewedAt: new Date().toISOString() });
      if (items.length > this.MAX) items = items.slice(0, this.MAX);
      this._save(items);
    },

    render(containerId, basePath = '') {
      const el = document.getElementById(containerId);
      if (!el) return;
      const items = this.get();
      if (!items.length) { el.style.display = 'none'; return; }
      el.innerHTML = `
        <div class="section-header"><h2 class="section-title">Recently Viewed</h2></div>
        <div class="recently-viewed-scroll">
          ${items.map(i => `
            <a href="${basePath}product.html?id=${i.id}" class="rv-item">
              <img src="${resolveImagePath(i.image)}" alt="${i.name}">
              <span class="rv-brand">${i.brand}</span>
              <span class="rv-name">${i.name}</span>
              <span class="rv-price">${MDB.UI.formatPrice(i.price)}</span>
            </a>
          `).join('')}
        </div>`;
      el.style.display = '';
    }
  };
  window.MDB.RecentlyViewed = RecentlyViewed;

  // Track product view on product pages
  if (window.location.pathname.includes('product.html')) {
    const pid = new URLSearchParams(window.location.search).get('id');
    if (pid) {
      MDB.Products.getById(pid).then(p => { if (p) RecentlyViewed.add(p); });
    }
  }

  // Render recently viewed on homepage
  const rvContainer = document.getElementById('recently-viewed');
  if (rvContainer) RecentlyViewed.render('recently-viewed');

  /* ===================================================================
     3. WHATSAPP FLOATING BUTTON
     =================================================================== */
  const whatsappNum = '201001234567'; // Change to real number
  const waBtn = document.createElement('a');
  waBtn.href = `https://wa.me/${whatsappNum}?text=${encodeURIComponent('Hi MDBoutiquee! I have a question.')}`;
  waBtn.target = '_blank';
  waBtn.className = 'whatsapp-float';
  waBtn.setAttribute('aria-label', 'Chat on WhatsApp');
  waBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
  document.body.appendChild(waBtn);

  // WhatsApp order sharing
  window.MDB.shareOrderWhatsApp = function(orderId) {
    const order = MDB.Orders.getById(orderId);
    if (!order) return;
    const items = order.items.map(i => `• ${i.name} (${i.variant}) x${i.qty} — ${MDB.UI.formatPrice(i.price * i.qty)}`).join('\n');
    const msg = `🛍️ New Order: ${order.id}\n\n${items}\n\n💰 Total: ${MDB.UI.formatPrice(order.total)}\n📍 ${order.customer.address}, ${order.customer.city}\n📞 ${order.customer.phone}`;
    window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  /* ===================================================================
     4. STOCK COUNTER — Show on product cards & pages
     =================================================================== */
  const StockCounter = {
    async init() {
      // On product page
      if (window.location.pathname.includes('product.html')) {
        const pid = new URLSearchParams(window.location.search).get('id');
        if (!pid) return;
        const p = await MDB.Products.getById(pid);
        if (!p) return;
        const priceEl = document.querySelector('.product-detail-price');
        if (priceEl && p.stock <= 10) {
          const badge = document.createElement('div');
          badge.className = 'stock-warning';
          badge.innerHTML = `<i class="fa-solid fa-fire"></i> Only ${p.stock} left in stock!`;
          priceEl.after(badge);
        }
      }
    }
  };
  StockCounter.init();

  /* ===================================================================
     5. LOYALTY POINTS
     =================================================================== */
  const Loyalty = {
    KEY: 'mdb_loyalty',
    POINTS_PER_LE: 1, // 1 point per 1 LE spent
    POINTS_TO_LE: 100, // 100 points = 1 LE discount

    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || { points: 0, history: [] }; } catch { return { points: 0, history: [] }; } },
    _save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },

    addPoints(amount, reason) {
      const data = this.get();
      const pts = Math.floor(amount * this.POINTS_PER_LE);
      data.points += pts;
      data.history.unshift({ type: 'earned', points: pts, reason, date: new Date().toISOString() });
      this._save(data);
      return pts;
    },

    redeemPoints(points) {
      const data = this.get();
      if (data.points < points) return { success: false, message: 'Not enough points' };
      const discount = Math.floor(points / this.POINTS_TO_LE);
      data.points -= points;
      data.history.unshift({ type: 'redeemed', points: -points, reason: `Redeemed for ${discount} LE discount`, date: new Date().toISOString() });
      this._save(data);
      return { success: true, discount, remaining: data.points };
    },

    getBalance() { return this.get().points; },
    getHistory() { return this.get().history; },
    getDiscountValue() { return Math.floor(this.getBalance() / this.POINTS_TO_LE); }
  };
  window.MDB.Loyalty = Loyalty;

  // Auto-add points when order is created (hook)
  document.addEventListener('mdb:cart:updated', () => {
    // Points will be added in checkout
  });

  /* ===================================================================
     6. ANALYTICS — Track page views, cart actions
     =================================================================== */
  const Analytics = {
    KEY: 'mdb_analytics',

    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || { views: [], cartAdds: [], searches: [], orders: 0, revenue: 0 }; } catch { return { views: [], cartAdds: [], searches: [], orders: 0, revenue: 0 }; } },
    _save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },

    trackView(page) {
      const data = this.get();
      data.views.push({ page, date: new Date().toISOString() });
      if (data.views.length > 500) data.views = data.views.slice(-500);
      this._save(data);
    },

    trackCartAdd(productId) {
      const data = this.get();
      data.cartAdds.push({ productId, date: new Date().toISOString() });
      if (data.cartAdds.length > 200) data.cartAdds = data.cartAdds.slice(-200);
      this._save(data);
    },

    trackSearch(query) {
      const data = this.get();
      data.searches.push({ query, date: new Date().toISOString() });
      if (data.searches.length > 100) data.searches = data.searches.slice(-100);
      this._save(data);
    },

    trackOrder(total) {
      const data = this.get();
      data.orders++;
      data.revenue += total;
      this._save(data);
    },

    getStats() {
      const data = this.get();
      const today = new Date().toDateString();
      return {
        totalViews: data.views.length,
        todayViews: data.views.filter(v => new Date(v.date).toDateString() === today).length,
        totalOrders: data.orders,
        totalRevenue: data.revenue,
        topSearches: this._topItems(data.searches.map(s => s.query)),
        topProducts: this._topItems(data.cartAdds.map(c => c.productId))
      };
    },

    _topItems(arr) {
      const freq = {};
      arr.forEach(i => freq[i] = (freq[i] || 0) + 1);
      return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }
  };
  window.MDB.Analytics = Analytics;
  Analytics.trackView(window.location.pathname);

  /* ===================================================================
     7. NEWSLETTER BACKEND — Save subscribers
     =================================================================== */
  const Newsletter = {
    KEY: 'mdb_newsletter',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
    _save(subs) { localStorage.setItem(this.KEY, JSON.stringify(subs)); },

    subscribe(email) {
      const subs = this.get();
      if (subs.some(s => s.email === email.toLowerCase())) return { success: false, message: 'Already subscribed' };
      subs.push({ email: email.toLowerCase(), date: new Date().toISOString() });
      this._save(subs);
      return { success: true };
    },

    count() { return this.get().length; }
  };
  window.MDB.Newsletter = Newsletter;

  // Hook into existing newsletter forms
  document.querySelectorAll('[data-newsletter-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value.includes('@')) {
        Newsletter.subscribe(input.value.trim());
      }
    });
  });

  /* ===================================================================
     8. NOTIFICATIONS CENTER
     =================================================================== */
  const Notifications = {
    KEY: 'mdb_notifications',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
    _save(notifs) { localStorage.setItem(this.KEY, JSON.stringify(notifs)); },

    add(title, message, type = 'info') {
      const notifs = this.get();
      notifs.unshift({ id: Date.now(), title, message, type, read: false, date: new Date().toISOString() });
      if (notifs.length > 50) notifs.pop();
      this._save(notifs);
      this._updateBadge();
    },

    markRead(id) {
      const notifs = this.get();
      const n = notifs.find(x => x.id === id);
      if (n) { n.read = true; this._save(notifs); this._updateBadge(); }
    },

    markAllRead() {
      const notifs = this.get();
      notifs.forEach(n => n.read = true);
      this._save(notifs);
      this._updateBadge();
    },

    unreadCount() { return this.get().filter(n => !n.read).length; },

    _updateBadge() {
      const count = this.unreadCount();
      document.querySelectorAll('.notif-badge').forEach(b => {
        b.textContent = count;
        b.style.display = count > 0 ? 'flex' : 'none';
      });
    }
  };
  window.MDB.Notifications = Notifications;

  // Welcome notification
  if (!localStorage.getItem('mdb_welcomed')) {
    Notifications.add('Welcome! 🎉', 'Thanks for visiting MDBoutiquee. Use code MDB10 for 10% off!', 'promo');
    localStorage.setItem('mdb_welcomed', '1');
  }

  /* ===================================================================
     9. PRODUCT COMPARISON
     =================================================================== */
  const Compare = {
    KEY: 'mdb_compare',
    MAX: 4,
    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
    _save(items) { localStorage.setItem(this.KEY, JSON.stringify(items)); this._updateBar(); },

    add(product) {
      const items = this.get();
      if (items.length >= this.MAX) { MDB.UI.toast(`Max ${this.MAX} products to compare`, 'warning'); return false; }
      if (items.some(i => i.id === product.id)) { MDB.UI.toast('Already in comparison', 'info'); return false; }
      items.push({ id: product.id, name: product.name, brand: product.brand, price: product.price, image: product.image, category: product.category });
      this._save(items);
      MDB.UI.toast('Added to compare', 'success');
      return true;
    },

    remove(id) {
      const items = this.get().filter(i => i.id !== id);
      this._save(items);
    },

    clear() { this._save([]); },
    count() { return this.get().length; },

    _updateBar() {
      let bar = document.getElementById('compare-bar');
      const items = this.get();
      if (!items.length) { if (bar) bar.remove(); return; }
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'compare-bar';
        document.body.appendChild(bar);
      }
      const bp = getBasePath();
      bar.innerHTML = `
        <div class="compare-bar-inner">
          <div class="compare-bar-items">${items.map(i => `
            <div class="compare-bar-item"><img src="${resolveImagePath(i.image)}" alt="${i.name}"><button onclick="MDB.Compare.remove('${i.id}')" class="compare-bar-remove">&times;</button></div>
          `).join('')}</div>
          <div class="compare-bar-actions">
            <span class="compare-bar-count">${items.length} item${items.length > 1 ? 's' : ''}</span>
            <a href="${bp}Pages/compare.html" class="btn btn-primary btn-sm">Compare Now</a>
            <button class="btn btn-outline btn-sm" onclick="MDB.Compare.clear()">Clear</button>
          </div>
        </div>`;
    }
  };
  window.MDB.Compare = Compare;
  Compare._updateBar();

  /* ===================================================================
     10. ADVANCED COUPONS (enhance existing)
     =================================================================== */
  const Coupons = {
    KEY: 'mdb_coupons_used',
    getUsed() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
    _saveUsed(codes) { localStorage.setItem(this.KEY, JSON.stringify(codes)); },

    validate(code) {
      const allCoupons = {
        'MDB10':    { type: 'percent', value: 10, label: '10% Off', minOrder: 0, maxUses: 99, expiry: '2027-12-31' },
        'MDB20':    { type: 'percent', value: 20, label: '20% Off', minOrder: 500, maxUses: 5, expiry: '2027-06-30' },
        'SAVE50':   { type: 'fixed', value: 50, label: '50 LE Off', minOrder: 200, maxUses: 10, expiry: '2027-12-31' },
        'SAVE100':  { type: 'fixed', value: 100, label: '100 LE Off', minOrder: 800, maxUses: 3, expiry: '2027-06-30' },
        'FREESHIP': { type: 'fixed', value: 50, label: 'Free Shipping', minOrder: 0, maxUses: 99, expiry: '2027-12-31' },
        'VIP30':    { type: 'percent', value: 30, label: '30% VIP Discount', minOrder: 1000, maxUses: 1, expiry: '2027-03-31' },
        'WELCOME15':{ type: 'percent', value: 15, label: '15% Welcome Discount', minOrder: 0, maxUses: 1, expiry: '2027-12-31' },
        'BEAUTY25': { type: 'percent', value: 25, label: '25% Off Beauty', minOrder: 300, maxUses: 2, expiry: '2027-09-30' },
      };

      const upper = (code || '').trim().toUpperCase();
      const coupon = allCoupons[upper];
      if (!coupon) return { success: false, message: 'Invalid coupon code' };

      // Check expiry
      if (new Date(coupon.expiry) < new Date()) return { success: false, message: 'This coupon has expired' };

      // Check min order
      const subtotal = MDB.Cart.subtotal();
      if (subtotal < coupon.minOrder) return { success: false, message: `Minimum order ${MDB.UI.formatPrice(coupon.minOrder)} required` };

      // Check usage
      const used = this.getUsed();
      const usageCount = used.filter(c => c === upper).length;
      if (usageCount >= coupon.maxUses) return { success: false, message: 'Coupon usage limit reached' };

      return { success: true, coupon: { code: upper, ...coupon } };
    },

    apply(code) {
      const result = this.validate(code);
      if (!result.success) return result;
      localStorage.setItem('mdb_applied_promo', JSON.stringify(result.coupon));
      return result;
    },

    markUsed(code) {
      const used = this.getUsed();
      used.push(code.toUpperCase());
      this._saveUsed(used);
    }
  };
  window.MDB.Coupons = Coupons;

  /* ===================================================================
     11. DYNAMIC SETTINGS — Sync UI with Admin settings
     =================================================================== */
  const DynamicSettings = {
    init() {
      if (!MDB.Settings) return;
      const s = MDB.Settings.get();
      
      // 1. Announcement Bar
      const annText = document.querySelector('.announcement-text');
      if (annText && s.announcement) {
          // preserve the link if it exists
          const link = annText.querySelector('a');
          const prefix = s.announcement + ' — ';
          annText.innerHTML = prefix;
          if (link) annText.appendChild(link);
      }

      // 2. Cart Shipping Note
      const cartNote = document.querySelector('.cart-shipping-note');
      if (cartNote) {
          cartNote.innerHTML = `<i class="fa-solid fa-truck-fast"></i> Free shipping on orders over ${s.shippingThreshold} LE`;
      }

      // 3. Contact Email in footer
      const footerEmail = document.querySelector('.footer-contact-info p:first-child');
      if (footerEmail && s.contactEmail) {
          footerEmail.innerHTML = `<i class="fa-solid fa-envelope"></i> ${s.contactEmail}`;
      }
    }
  };
  /* ===================================================================
     12. QUICK VIEW — Product preview modal
     =================================================================== */
  

  // Handle dynamically rendered product cards from store.js
  document.addEventListener('click', async (e) => {
    const atcBtn = e.target.closest('.btn-atc[data-id]');
    if (!atcBtn) return;

    e.preventDefault();
    const card = atcBtn.closest('.product-card');
    if (!card) return;

    const pid = atcBtn.dataset.id || card.dataset.id;
    const product = await MDB.Products.getById(pid);
    const payload = product ? {
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      variant: (product.variants && product.variants[0]) || 'Default',
      qty: 1
    } : {
      id: pid,
      name: card.dataset.name || '',
      brand: card.dataset.brand || '',
      price: parseFloat(card.dataset.price || 0),
      image: (card.dataset.image || '').replace(/^(\.\.\/)+/, ''),
      variant: card.dataset.variant || 'Default',
      qty: 1
    };

    MDB.Cart.add(payload);
    MDB.UI.toast('Added to cart', 'success');
  });

  DynamicSettings.init();
});
