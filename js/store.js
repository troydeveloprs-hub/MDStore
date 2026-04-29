/* ===================================================================
   MDBOUTIQUEE — Store Engine
   Products are loaded from Supabase; other storefront modules remain local.
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

  const SUPABASE_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.99.0/dist/umd/supabase.min.js';
  const SUPABASE_CONFIG_PATHS = [
    'js/supabase-config.js',
    '../js/supabase-config.js',
    '../../js/supabase-config.js'
  ];

  function _isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function _safeObject(value) {
    return _isObject(value) ? value : {};
  }

  function _isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function _loadScript(src, test) {
    if (typeof test === 'function' && test()) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function _loadSupabaseConfig() {
    if (_isObject(window.MDB_SUPABASE_CONFIG)) return window.MDB_SUPABASE_CONFIG;

    for (const path of SUPABASE_CONFIG_PATHS) {
      try {
        await _loadScript(path, () => _isObject(window.MDB_SUPABASE_CONFIG));
        if (_isObject(window.MDB_SUPABASE_CONFIG)) return window.MDB_SUPABASE_CONFIG;
      } catch {
        // Try the next relative path.
      }
    }

    throw new Error('Supabase config not found. Create js/supabase-config.js and set window.MDB_SUPABASE_CONFIG.');
  }

  function _dispatchProductsEvent(type, detail = {}) {
    document.dispatchEvent(new CustomEvent(`mdb:products:${type}`, { detail }));
  }

  function _normalizeProductImages(product) {
    const images = [...new Set([
      ...(Array.isArray(product.images) ? product.images : []),
      product.image
    ].filter(Boolean))];

    return {
      ...product,
      image: product.image || images[0] || '',
      images
    };
  }

  async function _loadProductsScript() {
    if (Array.isArray(window.MDB_BASE_PRODUCTS)) return window.MDB_BASE_PRODUCTS;

    const paths = ['data/products.js', '../data/products.js', '../../data/products.js'];
    for (const path of paths) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = path;
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        if (Array.isArray(window.MDB_BASE_PRODUCTS)) return window.MDB_BASE_PRODUCTS;
      } catch {
        // Try the next relative path.
      }
    }

    return [];
  }

  /* ===================================================================
     PRODUCTS  — Supabase-backed product catalog
     =================================================================== */
  const Products = {
    _cache: null,
    _client: null,
    _clientPromise: null,
    _table: 'products',

    _defaults() {
      return {
        name: '',
        brand: '',
        category: '',
        subcategory: '',
        price: 0,
        originalPrice: null,
        badge: null,
        image: '',
        images: [],
        description: '',
        details: '',
        ingredients: [],
        variants: [],
        variantGroups: [],
        stock: 0,
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        isNewArrival: false,
        createdAt: _dateNow()
      };
    },

    _fallbackCardHTML(product) {
      const image = product.image || 'img/logo.svg';
      const price = Number(product.price || 0);
      return `
        <article class="product-card" data-id="${product.id}">
          <a class="product-card-media" href="product.html?id=${encodeURIComponent(product.id)}">
            <img src="${image}" alt="${product.name}">
          </a>
          <div class="product-card-body">
            <h3 class="product-card-title">${product.name}</h3>
            <p class="product-card-price">${price.toFixed(2)}</p>
          </div>
        </article>
      `;
    },

    _normalizeCreatedAt(value) {
      const date = value ? new Date(value) : new Date();
      return Number.isNaN(date.getTime()) ? _dateNow() : date.toISOString();
    },

    _mapRow(row) {
      const metadata = _safeObject(row?.metadata);
      return _normalizeProductImages({
        ...this._defaults(),
        ...metadata,
        id: row?.id || '',
        name: row?.name || metadata.name || '',
        price: Number(row?.price || metadata.price || 0),
        image: row?.image || metadata.image || '',
        description: row?.description || metadata.description || '',
        createdAt: row?.created_at || metadata.createdAt || _dateNow()
      });
    },

    _toRow(product) {
      const base = _normalizeProductImages({
        ...this._defaults(),
        ...product,
        price: Number(product?.price || 0),
        stock: Number(product?.stock || 0),
        rating: Number(product?.rating || 0),
        reviewCount: Number(product?.reviewCount || 0),
        createdAt: product?.createdAt || _dateNow()
      });

      const metadata = {
        ...base,
        createdAt: this._normalizeCreatedAt(base.createdAt)
      };

      delete metadata.id;
      delete metadata.name;
      delete metadata.price;
      delete metadata.image;
      delete metadata.description;

      if (product?.id && !_isUuid(product.id)) {
        metadata.legacyId = String(product.id).trim();
      }

      const row = {
        name: base.name,
        price: Number(base.price || 0),
        image: base.image || '',
        description: base.description || null,
        created_at: this._normalizeCreatedAt(base.createdAt),
        metadata
      };

      if (_isUuid(product?.id)) row.id = product.id;
      return row;
    },

    async _ensureClient() {
      if (this._client) return this._client;
      if (this._clientPromise) return this._clientPromise;

      this._clientPromise = (async () => {
        if (!window.supabase?.createClient) {
          await _loadScript(SUPABASE_SCRIPT_URL, () => !!window.supabase?.createClient);
        }

        const config = await _loadSupabaseConfig();
        const url = String(config.url || config.supabaseUrl || '').trim();
        const anonKey = String(config.anonKey || config.supabaseAnonKey || '').trim();

        if (!url || !anonKey) {
          throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in js/supabase-config.js.');
        }

        this._client = window.supabase.createClient(url, anonKey);
        return this._client;
      })();

      try {
        return await this._clientPromise;
      } finally {
        this._clientPromise = null;
      }
    },

    async _run(operation, task, fallbackValue, shouldCache = false) {
      _dispatchProductsEvent('loading', { operation, loading: true });
      try {
        const result = await task();
        if (shouldCache) this._cache = result;
        return result;
      } catch (error) {
        console.error(`MDB.Products.${operation} failed`, error);
        _dispatchProductsEvent('error', { operation, error });
        if (fallbackValue !== undefined) return fallbackValue;
        throw error;
      } finally {
        _dispatchProductsEvent('loading', { operation, loading: false });
      }
    },

    async getAll(forceRefresh = false) {
      if (!forceRefresh && this._cache) return this._cache;

      return this._run('getAll', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .select('id, name, price, image, description, created_at, metadata')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(row => this._mapRow(row));
      }, this._cache || [], true);
    },

    async seedFromJson(options = {}) {
      return this._run('seedFromJson', async () => {
        const client = await this._ensureClient();
        const baseProducts = await (async () => {
          const paths = ['data/products.json', '../data/products.json', '../../data/products.json'];
          for (const path of paths) {
            try {
              const res = await fetch(path);
              if (res.ok) return await res.json();
            } catch {
              // Try the next relative path.
            }
          }
          return _loadProductsScript();
        })();

        if (!Array.isArray(baseProducts) || !baseProducts.length) return [];

        const force = !!options.force;
        const existing = force ? [] : await this.getAll(true);
        const existingLegacyIds = new Set(existing.map(product => String(product.legacyId || '').trim()).filter(Boolean));
        const rows = baseProducts
          .filter(product => force || !existingLegacyIds.has(String(product.id || '').trim()))
          .map(product => this._toRow(product));

        if (!rows.length) return [];

        const { data, error } = await client
          .from(this._table)
          .insert(rows)
          .select('id, name, price, image, description, created_at, metadata');

        if (error) throw error;

        this._cache = null;
        const seeded = (data || []).map(row => this._mapRow(row));
        _dispatchProductsEvent('changed', { operation: 'seed', count: seeded.length });
        return seeded;
      }, []);
    },

    async getById(id) {
      if (!id) return null;

      const cached = this._cache?.find(product => product.id === id);
      if (cached) return cached;

      if (!_isUuid(id)) {
        const products = await this.getAll();
        return products.find(product => product.id === id || product.legacyId === id) || null;
      }

      return this._run('getById', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .select('id, name, price, image, description, created_at, metadata')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        return data ? this._mapRow(data) : null;
      }, null);
    },

    async save(product) {
      return this._run('save', async () => {
        const client = await this._ensureClient();
        const row = this._toRow(product);
        const query = row.id
          ? client.from(this._table).upsert(row, { onConflict: 'id' })
          : client.from(this._table).insert(row);

        const { data, error } = await query
          .select('id, name, price, image, description, created_at, metadata')
          .single();

        if (error) throw error;

        this._cache = null;
        const saved = this._mapRow(data);
        _dispatchProductsEvent('changed', { operation: 'save', product: saved });
        return saved;
      });
    },

    async delete(id) {
      if (!_isUuid(id)) {
        throw new Error('Supabase products use UUID ids. This product id is not valid for delete.');
      }

      return this._run('delete', async () => {
        const client = await this._ensureClient();
        const { error } = await client.from(this._table).delete().eq('id', id);
        if (error) throw error;
        this._cache = null;
        _dispatchProductsEvent('changed', { operation: 'delete', id });
        return true;
      });
    },

    async upsert(product) {
      return this.save(product);
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
      const q = String(query || '').toLowerCase().trim();
      if (!q) return all;
      return all.filter(p =>
        String(p.id || '').toLowerCase().includes(q) ||
        String(p.legacyId || '').toLowerCase().includes(q) ||
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.brand || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q) ||
        String(p.subcategory || '').toLowerCase().includes(q) ||
        String(p.description || '').toLowerCase().includes(q)
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
    },

    async renderInto(containerOrSelector = '#products', products = null) {
      const container = typeof containerOrSelector === 'string'
        ? document.querySelector(containerOrSelector)
        : containerOrSelector;

      if (!container) return [];

      container.innerHTML = '<p class="products-loading">Loading products...</p>';

      const items = Array.isArray(products) ? products : await this.getAll();
      if (!items.length) {
        container.innerHTML = '<p class="products-empty">No products found.</p>';
        return [];
      }

      const renderer = window.MDB?.UI?.productCardHTML
        ? product => window.MDB.UI.productCardHTML(product)
        : product => this._fallbackCardHTML(product);

      container.innerHTML = items.map(renderer).join('');
      return items;
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

    applyPromo(code) {
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
      const target = (email || '').trim().toLowerCase();
      // Special check for Admin - accepts both 'admin' username and 'admin@mdboutiquee.com' email
      if ((target === 'admin' || target === 'admin@mdboutiquee.com') && password === 'admin123') {
        const adminUser = { id: 'admin', firstName: 'Site', lastName: 'Admin', email: 'admin@mdboutiquee.com', role: 'admin' };
        this._setSession(adminUser);
        return { success: true, user: adminUser, isAdmin: true };
      }

      const users = this._getUsers();
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
      this._save(reviews);
      return reviews;
    },

    delete(reviewId) { return this.remove(reviewId); }
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
    productCardHTML(p, basePathOverride = null) {
      const basePath = typeof basePathOverride === 'string'
        ? basePathOverride
        : (window.location.pathname.includes('/collections/') || window.location.pathname.includes('/Pages/') ? '../' : '');
      const image = p.image || 'img/logo.svg';
      const oldPrice = p.originalPrice || p.oldPrice;
      const badge = typeof p.badge === 'string' ? p.badge.trim() : '';
      const badgeText = badge ? badge.charAt(0).toUpperCase() + badge.slice(1) : '';
      const reviews = parseInt(p.reviewCount, 10) || 0;
      const ratingValue = Math.max(0, Math.min(5, parseFloat(p.rating) || 0));
      const ratingStars = '★'.repeat(Math.round(ratingValue)) + '☆'.repeat(5 - Math.round(ratingValue));
      const defaultVariant = (Array.isArray(p.variantGroups) && p.variantGroups[0] && Array.isArray(p.variantGroups[0].options) && p.variantGroups[0].options[0])
        || ((p.variants && p.variants[0]) || 'Default');
      const savings = oldPrice && oldPrice > p.price
        ? Math.round(((oldPrice - p.price) / oldPrice) * 100)
        : 0;
      const stock = Number.isFinite(parseInt(p.stock, 10)) ? parseInt(p.stock, 10) : null;
      const isWishlisted = Wishlist.has(p.id);
      let stockLabel = 'Available Now';
      let stockClass = 'in-stock';
      if (stock === 0) {
        stockLabel = 'Out of Stock';
        stockClass = 'out-of-stock';
      } else if (stock !== null && stock <= 5) {
        stockLabel = `Only ${stock} left`;
        stockClass = 'low-stock';
      }
      const categoryLabel = p.subcategory || p.category || 'Beauty Pick';
      return `
        <article class="product-card product-card-modern" data-id="${p.id}" data-name="${p.name}" data-brand="${p.brand || ''}" data-price="${p.price}" data-image="${basePath}${image}" data-variant="${defaultVariant}">
          <div class="product-card-media">
            <div class="product-card-shell">
              <div class="product-card-badges">
                ${badgeText ? `<span class="product-badge">${badgeText}</span>` : ''}
                ${savings ? `<span class="product-badge product-badge-discount">Save ${savings}%</span>` : ''}
              </div>
              <div class="product-card-actions">
                <button class="action-btn ${isWishlisted ? 'active' : ''}" data-wishlist="${p.id}" title="Add to Wishlist" aria-label="Add ${p.name} to wishlist"><i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button>
                <button class="action-btn" data-quick-view="${p.id}" title="Quick View" aria-label="Quick view ${p.name}"><i class="fa-regular fa-eye"></i></button>
              </div>
            </div>
            <a href="${basePath}product.html?id=${p.id}" class="product-card-image-link">
              <img src="${basePath}${image}" alt="${p.name}" class="product-card-img" loading="lazy" onerror="this.src='${basePath}img/logo.svg'">
            </a>
          </div>
          <div class="product-card-info">
            <div class="product-card-meta">
              <span class="product-card-brand">${p.brand || 'MDB'}</span>
              <span class="product-card-chip">${categoryLabel}</span>
            </div>
            <h3 class="product-card-title"><a href="${basePath}product.html?id=${p.id}">${p.name}</a></h3>
            <div class="product-card-rating" aria-label="Rated ${ratingValue.toFixed(1)} out of 5">
              <span class="product-card-stars">${ratingStars}</span>
              <span class="product-card-rating-text">${ratingValue ? ratingValue.toFixed(1) : 'New'}${reviews ? ` (${reviews})` : ''}</span>
            </div>
            <div class="product-card-price">
              <span class="price-current">${this.formatPrice(p.price)}</span>
              ${oldPrice ? `<span class="price-old">${this.formatPrice(oldPrice)}</span>` : ''}
            </div>
            <div class="product-card-footer">
              <span class="product-card-stock ${stockClass}">${stockLabel}</span>
              <a href="${basePath}product.html?id=${p.id}" class="product-card-link">Details</a>
            </div>
            <button class="btn btn-atc product-card-atc btn-full" data-id="${p.id}" ${stock === 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-bag-shopping"></i>
              ${stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </article>
      `;
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
      document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = (user && user.role === 'admin') ? '' : 'none';
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
  return { Products, Cart, Wishlist, Orders, Auth, Reviews, Addresses, Settings, Coupons, UI, KEYS };
})();

/* Make globally accessible */
if (typeof window !== 'undefined') window.MDB = MDB;
