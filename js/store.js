/* ===================================================================
   MDBOUTIQUEE — Local Store Engine
   All data persists in localStorage. No server needed.
   =================================================================== */
const MDB = (() => {
  'use strict';

  /* ─── Storage Keys ─── */
  const KEYS = {
    CART:      'mdb_cart',
    WISHLIST:  'mdb_wishlist',
    ORDERS:    'mdb_orders',
    USER:      'mdb_user',
    SESSION:   'mdb_session',
    REVIEWS:   'mdb_reviews',
    ADDRESSES: 'mdb_addresses',
    PROMO:     'mdb_applied_promo',
    CUSTOM_PRODUCTS: 'mdb_custom_products',
    CUSTOM_COUPONS: 'mdb_custom_coupons',
    SETTINGS: 'mdb_settings',
  };

  /* ─── Helpers ─── */
  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
  function _uid() {
    return 'MDB-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  function _dateNow() {
    return new Date().toISOString();
  }

  /* ===================================================================
     PRODUCTS  — Fetch from local JSON
     =================================================================== */
  const Products = {
    _cache: null,

    async getAll() {
      if (this._cache) return this._cache;
      
      let all = [];
      // Determine base path (works from any subfolder)
      const paths = ['data/products.json', '../data/products.json', '../../data/products.json'];
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (res.ok) { all = await res.json(); break; }
        } catch { /* try next */ }
      }
      
      // Merge with custom products from localStorage
      const custom = _get(KEYS.CUSTOM_PRODUCTS) || [];
      
      // Handle deleted products (stored as IDs in custom products with a deleted flag)
      const deletedIds = custom.filter(p => p.isDeleted).map(p => p.id);
      all = all.filter(p => !deletedIds.includes(p.id));
      
      // Handle updated products
      custom.filter(p => !p.isDeleted).forEach(cp => {
        const idx = all.findIndex(p => p.id === cp.id);
        if (idx > -1) all[idx] = { ...all[idx], ...cp };
        else all.push(cp);
      });

      this._cache = all;
      return all;
    },

    async save(product) {
      const custom = _get(KEYS.CUSTOM_PRODUCTS) || [];
      const idx = custom.findIndex(p => p.id === product.id);
      
      if (idx > -1) custom[idx] = { ...custom[idx], ...product };
      else {
        if (!product.id) product.id = 'P' + Date.now();
        custom.push(product);
      }
      
      _set(KEYS.CUSTOM_PRODUCTS, custom);
      this._cache = null; // Invalidate cache
      return product;
    },

    async delete(id) {
      const custom = _get(KEYS.CUSTOM_PRODUCTS) || [];
      const idx = custom.findIndex(p => p.id === id);
      
      // Check if it's a JSON product or a custom one
      const res = await fetch('data/products.json').catch(() => null);
      let isJson = false;
      if (res && res.ok) {
        const json = await res.json();
        isJson = json.some(p => p.id === id);
      }

      if (isJson) {
        // Mark as deleted in custom storage
        const deletedEntry = custom.find(p => p.id === id);
        if (deletedEntry) deletedEntry.isDeleted = true;
        else custom.push({ id, isDeleted: true });
      } else {
        // Remove from custom storage
        if (idx > -1) custom.splice(idx, 1);
      }

      _set(KEYS.CUSTOM_PRODUCTS, custom);
      this._cache = null;
    },

    async getById(id) {
      const all = await this.getAll();
      return all.find(p => p.id === id) || null;
    },

    async getByCategory(cat) {
      const all = await this.getAll();
      return all.filter(p => p.category === cat);
    },

    async getBySubcategory(sub) {
      const all = await this.getAll();
      return all.filter(p => p.subcategory === sub);
    },

    async search(query) {
      const all = await this.getAll();
      const q = query.toLowerCase();
      return all.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q)
      );
    },

    async getFeatured() {
      const all = await this.getAll();
      return all.filter(p => p.isFeatured);
    },

    async getNewArrivals() {
      const all = await this.getAll();
      return all.filter(p => p.isNewArrival);
    },

    async getOnSale() {
      const all = await this.getAll();
      return all.filter(p => p.originalPrice && p.originalPrice > p.price);
    },

    async getRelated(productId, limit = 4) {
      const product = await this.getById(productId);
      if (!product) return [];
      const all = await this.getAll();
      return all
        .filter(p => p.id !== productId && (p.category === product.category || p.brand === product.brand))
        .slice(0, limit);
    }
  };

  /* ===================================================================
     CART
     =================================================================== */
  const Cart = {
    get() { return _get(KEYS.CART) || []; },
    _save(items) { _set(KEYS.CART, items); this._notify(); },

    add(item) {
      const items = this.get();
      const idx = items.findIndex(i => i.id === item.id && i.variant === item.variant);
      if (idx > -1) {
        items[idx].qty += (item.qty || 1);
      } else {
        items.push({
          id: item.id,
          name: item.name,
          brand: item.brand || '',
          price: parseFloat(item.price) || 0,
          image: item.image || '',
          variant: item.variant || 'Default',
          qty: item.qty || 1,
          addedAt: _dateNow()
        });
      }
      this._save(items);
      return items;
    },

    remove(id, variant) {
      const items = this.get().filter(i => !(i.id === id && i.variant === (variant || 'Default')));
      this._save(items);
      return items;
    },

    updateQty(id, variant, qty) {
      const items = this.get();
      const item = items.find(i => i.id === id && i.variant === (variant || 'Default'));
      if (item) {
        item.qty = Math.max(1, qty);
        this._save(items);
      }
      return items;
    },

    clear() { this._save([]); },

    count() { return this.get().reduce((s, i) => s + i.qty, 0); },

    subtotal() { return this.get().reduce((s, i) => s + (i.price * i.qty), 0); },

    shipping() {
      const sub = this.subtotal();
      const threshold = Settings.get().shippingThreshold || 3500;
      return sub >= threshold ? 0 : 50;
    },

    total() {
      let t = this.subtotal() + this.shipping();
      const promo = this.getAppliedPromo();
      if (promo) {
        if (promo.type === 'percent') t = t * (1 - promo.value / 100);
        else if (promo.type === 'fixed') t = Math.max(0, t - promo.value);
      }
      return Math.round(t * 100) / 100;
    },

    discount() {
      const promo = this.getAppliedPromo();
      if (!promo) return 0;
      const base = this.subtotal() + this.shipping();
      if (promo.type === 'percent') return Math.round(base * promo.value / 100);
      if (promo.type === 'fixed') return Math.min(promo.value, base);
      return 0;
    },

      const fixedPromos = {
        'MDB10':   { code: 'MDB10',   type: 'percent', value: 10, label: '10% Off' },
        'MDB20':   { code: 'MDB20',   type: 'percent', value: 20, label: '20% Off' },
        'SAVE50':  { code: 'SAVE50',  type: 'fixed',   value: 50, label: '50 LE Off' },
        'FREESHIP': { code: 'FREESHIP', type: 'fixed', value: 50, label: 'Free Shipping' },
      };
      
      const customPromos = _get(KEYS.CUSTOM_COUPONS) || [];
      const upper = (code || '').trim().toUpperCase();
      
      const found = fixedPromos[upper] || customPromos.find(p => p.code.toUpperCase() === upper);
      
      if (found) {
        _set(KEYS.PROMO, found);
        return { success: true, promo: found };
      }
      return { success: false, message: 'Invalid promo code' };
    },

    removePromo() { localStorage.removeItem(KEYS.PROMO); },

    getAppliedPromo() { return _get(KEYS.PROMO); },

    _notify() {
      document.dispatchEvent(new CustomEvent('mdb:cart:updated', { detail: { count: this.count(), total: this.total() } }));
    }
  };

  /* ===================================================================
     WISHLIST
     =================================================================== */
  const Wishlist = {
    get() { return _get(KEYS.WISHLIST) || []; },
    _save(items) { _set(KEYS.WISHLIST, items); this._notify(); },

    add(product) {
      const items = this.get();
      if (items.some(i => i.id === product.id)) return items; // already exists
      items.push({
        id: product.id,
        name: product.name,
        brand: product.brand || '',
        price: parseFloat(product.price) || 0,
        image: product.image || '',
        addedAt: _dateNow()
      });
      this._save(items);
      return items;
    },

    remove(id) {
      const items = this.get().filter(i => i.id !== id);
      this._save(items);
      return items;
    },

    toggle(product) {
      if (this.has(product.id)) {
        this.remove(product.id);
        return false; // removed
      } else {
        this.add(product);
        return true; // added
      }
    },

    has(id) { return this.get().some(i => i.id === id); },

    count() { return this.get().length; },

    clear() { this._save([]); },

    _notify() {
      document.dispatchEvent(new CustomEvent('mdb:wishlist:updated', { detail: { count: this.count() } }));
    }
  };

  /* ===================================================================
     ORDERS
     =================================================================== */
  const Orders = {
    get() { return _get(KEYS.ORDERS) || []; },
    _save(orders) { _set(KEYS.ORDERS, orders); },

    create(orderData) {
      const orders = this.get();
      const order = {
        id: _uid(),
        items: Cart.get(),
        subtotal: Cart.subtotal(),
        shipping: Cart.shipping(),
        discount: Cart.discount(),
        promoCode: Cart.getAppliedPromo()?.code || null,
        total: Cart.total(),
        customer: {
          name: orderData.name || '',
          email: orderData.email || '',
          phone: orderData.phone || '',
          address: orderData.address || '',
          city: orderData.city || '',
          notes: orderData.notes || ''
        },
        paymentMethod: orderData.paymentMethod || 'cash',
        status: 'pending',
        statusHistory: [
          { status: 'pending', date: _dateNow(), note: 'Order placed' }
        ],
        createdAt: _dateNow(),
        updatedAt: _dateNow()
      };
      orders.unshift(order);
      this._save(orders);
      // Clear cart & promo after order
      Cart.clear();
      Cart.removePromo();
      return order;
    },

    getById(id) {
      return this.get().find(o => o.id === id) || null;
    },

    getByEmail(email) {
      return this.get().filter(o => o.customer.email.toLowerCase() === email.toLowerCase());
    },

    getForCurrentUser() {
      const user = Auth.getUser();
      if (!user) return [];
      return this.get().filter(o => o.customer.email.toLowerCase() === user.email.toLowerCase());
    },

    updateStatus(id, newStatus, note) {
      const orders = this.get();
      const order = orders.find(o => o.id === id);
      if (order) {
        order.status = newStatus;
        order.updatedAt = _dateNow();
        order.statusHistory.push({ status: newStatus, date: _dateNow(), note: note || '' });
        this._save(orders);
      }
      return order;
    },

    count() { return this.get().length; }
  };

  /* ===================================================================
     AUTH  — Local user management
     =================================================================== */
  const Auth = {
    _getUsers() { return _get('mdb_users') || []; },
    _saveUsers(users) { _set('mdb_users', users); },

    register(data) {
      const users = this._getUsers();
      const email = (data.email || '').trim().toLowerCase();

      if (!email || !data.password) {
        return { success: false, message: 'Email and password are required' };
      }
      if (data.password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
      }
      if (users.some(u => u.email === email)) {
        return { success: false, message: 'An account with this email already exists' };
      }

      const user = {
        id: _uid(),
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: email,
        phone: data.phone || '',
        password: btoa(data.password), // simple encoding (NOT for production)
        address: data.address || '',
        city: data.city || '',
        createdAt: _dateNow()
      };
      users.push(user);
      this._saveUsers(users);
      // Auto login
      this._setSession(user);
      return { success: true, user: this._sanitize(user) };
    },

    login(email, password) {
      const users = this._getUsers();
      const target = (email || '').trim().toLowerCase();
      const user = users.find(u => u.email === target && u.password === btoa(password));
      if (!user) {
        return { success: false, message: 'Invalid email or password' };
      }
      this._setSession(user);
      return { success: true, user: this._sanitize(user) };
    },

    logout() {
      sessionStorage.removeItem(KEYS.SESSION);
      localStorage.removeItem(KEYS.SESSION);
      document.dispatchEvent(new CustomEvent('mdb:auth:changed', { detail: { user: null } }));
    },

    isLoggedIn() {
      return !!this.getUser();
    },

    getUser() {
      return _get(KEYS.SESSION) || JSON.parse(sessionStorage.getItem(KEYS.SESSION) || 'null');
    },

    updateProfile(data) {
      const users = this._getUsers();
      const current = this.getUser();
      if (!current) return { success: false, message: 'Not logged in' };

      const idx = users.findIndex(u => u.id === current.id);
      if (idx === -1) return { success: false, message: 'User not found' };

      if (data.firstName !== undefined) users[idx].firstName = data.firstName;
      if (data.lastName !== undefined) users[idx].lastName = data.lastName;
      if (data.phone !== undefined) users[idx].phone = data.phone;
      if (data.address !== undefined) users[idx].address = data.address;
      if (data.city !== undefined) users[idx].city = data.city;

      this._saveUsers(users);
      this._setSession(users[idx]);
      return { success: true, user: this._sanitize(users[idx]) };
    },

    changePassword(currentPass, newPass) {
      const users = this._getUsers();
      const current = this.getUser();
      if (!current) return { success: false, message: 'Not logged in' };

      const idx = users.findIndex(u => u.id === current.id);
      if (idx === -1) return { success: false, message: 'User not found' };
      if (users[idx].password !== btoa(currentPass)) return { success: false, message: 'Current password is incorrect' };
      if (newPass.length < 6) return { success: false, message: 'New password must be at least 6 characters' };

      users[idx].password = btoa(newPass);
      this._saveUsers(users);
      return { success: true };
    },

    _setSession(user) {
      const safe = this._sanitize(user);
      _set(KEYS.SESSION, safe);
      sessionStorage.setItem(KEYS.SESSION, JSON.stringify(safe));
      document.dispatchEvent(new CustomEvent('mdb:auth:changed', { detail: { user: safe } }));
    },

    _sanitize(user) {
      const { password, ...safe } = user;
      return safe;
    }
  };

  /* ===================================================================
     REVIEWS
     =================================================================== */
  const Reviews = {
    get() { return _get(KEYS.REVIEWS) || []; },
    _save(reviews) { _set(KEYS.REVIEWS, reviews); },

    getForProduct(productId) {
      return this.get().filter(r => r.productId === productId);
    },

    add(data) {
      const user = Auth.getUser();
      const reviews = this.get();
      const review = {
        id: _uid(),
        productId: data.productId,
        rating: Math.min(5, Math.max(1, parseInt(data.rating) || 5)),
        text: data.text || '',
        authorName: user ? (user.firstName + ' ' + user.lastName).trim() : (data.authorName || 'Anonymous'),
        authorEmail: user ? user.email : (data.authorEmail || ''),
        isVerified: !!user,
        createdAt: _dateNow()
      };
      reviews.unshift(review);
      this._save(reviews);
      return review;
    },

    getAverageRating(productId) {
      const pr = this.getForProduct(productId);
      if (pr.length === 0) return 0;
      return Math.round((pr.reduce((s, r) => s + r.rating, 0) / pr.length) * 10) / 10;
    },

    remove(reviewId) {
      const reviews = this.get().filter(r => r.id !== reviewId);
    getForProduct(pid) { return this.get().filter(r => r.productId === pid); },
    add(review) {
      const all = this.get();
      all.push({
        id: 'R' + Date.now(),
        authorName: _get(KEYS.USER)?.firstName || 'Anonymous',
        rating: 5,
        text: '',
        isVerified: true,
        createdAt: _dateNow(),
        ...review
      });
      _set(KEYS.REVIEWS, all);
    },
    delete(id) {
        const all = this.get().filter(r => r.id !== id);
        _set(KEYS.REVIEWS, all);
    }
  };

  /* ===================================================================
     SETTINGS & COUPONS (ADMIN)
     =================================================================== */
  const Settings = {
      get() {
          return _get(KEYS.SETTINGS) || {
              announcement: 'Free shipping on orders over 3500 LE',
              shippingThreshold: 3500,
              contactEmail: 'hello@mdboutiquee2.com',
              currency: 'LE'
          };
      },
      save(settings) {
          _set(KEYS.SETTINGS, { ...this.get(), ...settings });
      }
  };

  const Coupons = {
      get() { return _get(KEYS.CUSTOM_COUPONS) || []; },
      add(coupon) {
          const all = this.get();
          all.push(coupon);
          _set(KEYS.CUSTOM_COUPONS, all);
      },
      delete(code) {
          const all = this.get().filter(c => c.code !== code);
          _set(KEYS.CUSTOM_COUPONS, all);
      }
  };

  /* ===================================================================
     ADDRESSES
     =================================================================== */
  const Addresses = {
    get() { return _get(KEYS.ADDRESSES) || []; },
    _save(addrs) { _set(KEYS.ADDRESSES, addrs); },

    add(addr) {
      const addrs = this.get();
      const entry = {
        id: _uid(),
        label: addr.label || 'Home',
        name: addr.name || '',
        phone: addr.phone || '',
        address: addr.address || '',
        city: addr.city || '',
        isDefault: addrs.length === 0,
        createdAt: _dateNow()
      };
      addrs.push(entry);
      this._save(addrs);
      return entry;
    },

    remove(id) {
      const addrs = this.get().filter(a => a.id !== id);
      this._save(addrs);
    },

    setDefault(id) {
      const addrs = this.get();
      addrs.forEach(a => a.isDefault = (a.id === id));
      this._save(addrs);
    },

    getDefault() {
      return this.get().find(a => a.isDefault) || this.get()[0] || null;
    }
  };

  /* ===================================================================
     UI HELPERS
     =================================================================== */
  const UI = {
    /** Format price with LE */
    formatPrice(n) {
      return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 0 }) + ' LE';
    },

    /** Generate product card HTML */
    productCardHTML(p, basePath = '') {
      const imgPath = basePath + p.image;
      const productUrl = basePath + 'product.html?id=' + p.id;
      const badgeHTML = p.badge ? `<span class="badge badge-${p.badge}">${p.badge === 'new' ? 'New' : 'Sale'}</span>` : '';
      const priceHTML = p.originalPrice
        ? `<span class="price-current price-sale">${this.formatPrice(p.price)}</span><span class="price-original">${this.formatPrice(p.originalPrice)}</span>`
        : `<span class="price-current">${this.formatPrice(p.price)}</span>`;
      const wishlisted = Wishlist.has(p.id);

      return `
        <div class="product-card" data-id="${p.id}" data-name="${p.name}" data-brand="${p.brand}" data-price="${p.price}" data-image="${imgPath}">
          <div class="product-card-image-wrap">
            <a href="${productUrl}"><img src="${imgPath}" alt="${p.name}" class="product-card-img product-card-img-primary"></a>
            <a href="${productUrl}"><img src="${imgPath}" alt="${p.name} alternate" class="product-card-img product-card-img-secondary"></a>
            ${badgeHTML ? `<div class="product-card-badges">${badgeHTML}</div>` : ''}
            <button class="product-card-wishlist${wishlisted ? ' active' : ''}" aria-label="Add to wishlist" data-wishlist-toggle="${p.id}">
              <i class="${wishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
            <div class="product-card-actions">
              <button class="product-card-quickview" data-quickview="${p.id}">Quick View</button>
            </div>
          </div>
          <div class="product-card-info">
            <span class="product-card-brand">${p.brand}</span>
            <h3 class="product-card-name"><a href="${productUrl}">${p.name}</a></h3>
            <div class="product-card-price">${priceHTML}</div>
            <button class="product-card-atc" data-atc="${p.id}">Add to Cart</button>
          </div>
        </div>`;
    },

    /** Show toast notification */
    toast(message, type = 'success', duration = 3000) {
      let container = document.getElementById('mdb-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'mdb-toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = `mdb-toast mdb-toast-${type}`;
      const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
      toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
      }, duration);
    },

    /** Update all cart badges in the DOM */
    updateCartBadges() {
      const c = Cart.count();
      document.querySelectorAll('.cart-badge').forEach(b => {
        b.textContent = c;
        b.classList.toggle('visible', c > 0);
      });
      document.querySelectorAll('.mob-cart-badge').forEach(b => {
        b.textContent = c;
        b.style.display = c > 0 ? 'flex' : 'none';
      });
    },

    /** Update auth-related UI elements */
    updateAuthUI() {
      const user = Auth.getUser();
      document.querySelectorAll('[data-auth-only]').forEach(el => {
        el.style.display = user ? '' : 'none';
      });
      document.querySelectorAll('[data-guest-only]').forEach(el => {
        el.style.display = user ? 'none' : '';
      });
      document.querySelectorAll('[data-user-name]').forEach(el => {
        el.textContent = user ? (user.firstName || user.email) : '';
      });
    }
  };

  /* ─── Auto-update badges on cart change ─── */
  document.addEventListener('mdb:cart:updated', () => UI.updateCartBadges());
  document.addEventListener('mdb:auth:changed', () => UI.updateAuthUI());

  /* ─── Init on load ─── */
  document.addEventListener('DOMContentLoaded', () => {
    UI.updateCartBadges();
    UI.updateAuthUI();
  });

  /* ─── Public API ─── */
  return { Products, Cart, Wishlist, Orders, Auth, Reviews, Addresses, UI, KEYS };
})();

/* Make globally accessible */
if (typeof window !== 'undefined') window.MDB = MDB;
