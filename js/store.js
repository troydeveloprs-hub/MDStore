/* ===================================================================
   MDBOUTIQUEE — Store Engine
   ALL data is now stored in Supabase (products, cart, wishlist, orders, users, etc.)
   =================================================================== */
const MDB = (() => {
  'use strict';

  /* â”€â”€â”€ Storage Keys â”€â”€â”€ */
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
    SETTINGS:  'mdb_settings',
  };

  /* â”€â”€â”€ Helpers â”€â”€â”€ */
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
      if (!row) return null;
      let metadata = row.metadata;
      if (typeof metadata === "string") {
        try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
      }
      metadata = metadata || {};
      const defaults = this._defaults();
      const merged = {
        ...defaults,
        ...metadata,
        id: row.id || metadata.legacyId || "",
        name: row.name || metadata.name || "",
        price: Number(row.price != null ? row.price : (metadata.price || 0)),
        image: row.image || metadata.image || "",
        images: Array.isArray(row.images) && row.images.length ? row.images : (Array.isArray(metadata.images) ? metadata.images : []),
        description: row.description || metadata.description || "",
        subcategory: row.sub_category || metadata.subcategory || metadata.subCategory || defaults.subcategory,
        createdAt: row.created_at || metadata.createdAt || defaults.createdAt
      };
      merged.stock = Number(merged.stock != null ? merged.stock : (metadata.stock != null ? metadata.stock : 0));
      merged.rating = Number(merged.rating || 0);
      merged.reviewCount = Number(merged.reviewCount || 0);
      merged.price = Number(merged.price);
      merged.originalPrice = merged.originalPrice ? Number(merged.originalPrice) : null;
      return _normalizeProductImages(merged);
    },

            _toRow(product) {
      const base = _normalizeProductImages({
        ...this._defaults(),
        ...product,
        price: Number(product?.price || 0),
        stock: Number(product?.stock != null ? product.stock : 0),
        rating: Number(product?.rating || 0),
        reviewCount: Number(product?.reviewCount || 0),
        createdAt: product?.createdAt || _dateNow()
      });

      const metadata = { ...base };
      delete metadata.id;
      delete metadata.name;
      delete metadata.price;
      delete metadata.image;
      delete metadata.images;
      delete metadata.description;
      delete metadata.created_at;

      const row = {
        name: base.name,
        price: Number(base.price || 0),
        image: base.image || '',
        images: base.images || [],
        description: base.description || null,
        created_at: this._normalizeCreatedAt(base.createdAt),
        metadata
      };

      if (_isUuid(product?.id)) {
        row.id = product.id;
      }

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
      return this._clientPromise;
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.warn(`MDB Products ${opName} error:`, err);
        return fallback;
      }
    },

    async getAll(skipCache = false) {
      if (!skipCache && this._cache) return this._cache;

      return this._run('getAll', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .select('id, name, price, image, images, description, created_at, metadata')
          .order('created_at', { ascending: false });

        if (error) throw error;

        this._cache = (data || []).map(row => this._mapRow(row));
        return this._cache;
      }, []);
    },

    async seed(options = {}) {
      return this._run('seed', async () => {
        const client = await this._ensureClient();
        const baseProducts = await _loadProductsScript();

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
          .select('id, name, price, image, images, description, created_at, metadata')
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
        
        // Use upsert only if we have a valid UUID, otherwise insert
        const query = row.id
          ? client.from(this._table).upsert(row)
          : client.from(this._table).insert(row);

        const { data, error } = await query
          .select('id, name, price, image, images, description, created_at, metadata')
          .single();

        if (error) {
          console.error('Supabase Save Error Details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

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

      container.innerHTML = '<div class="products-loading">Loading products...</div>';

      const items = Array.isArray(products) ? products : await this.getAll();
      if (!items.length) {
        container.innerHTML = '<div class="products-empty">No products found.</div>';
        return [];
      }

      const renderer = window.MDB?.UI?.productCardHTML
        ? product => window.MDB.UI.productCardHTML(product)
        : product => this._fallbackCardHTML(product);

      container.innerHTML = items.map(renderer).join('');
      return items;
    },

    /**
     * Uploads a file to Supabase Storage bucket 'products'
     * @param {File} file The file object from input
     * @param {string} path Optional custom path/filename
     */
    async uploadImage(file, path = null) {
      return this._run('uploadImage', async () => {
        const client = await this._ensureClient();
        const fileName = path || `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const bucket = 'products';

        const { data, error } = await client.storage
          .from(bucket)
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = client.storage.from(bucket).getPublicUrl(fileName);
        return publicUrl;
      });
    }
  };

  /* ===================================================================
     CART — Supabase-backed
     =================================================================== */
  const Cart = {
    _cache: null,
    _table: 'cart',
    _client: null,

    async _ensureClient() {
      if (this._client) return this._client;
      if (Products._client) {
        this._client = await Products._ensureClient();
        return this._client;
      }
      return await Products._ensureClient();
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.warn(`MDB Cart ${opName} error:`, err);
        return fallback;
      }
    },

    async get() {
      const user = Auth.getUser();
      if (!user) {
        return _get(KEYS.CART) || []; // Fallback to localStorage for guest users
      }

      // Fallback to localStorage for admin users (user.id is 'admin', not a UUID)
      if (user.role === 'admin' || user.id === 'admin') {
        return _get(KEYS.CART) || [];
      }

      return this._run('get', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        this._cache = (data || []).map(row => ({
          id: row.product_id,
          name: row.name,
          brand: row.brand || '',
          price: Number(row.price) || 0,
          image: row.image || '',
          variant: row.variant || 'Default',
          qty: row.qty || 1,
          addedAt: row.created_at
        }));
        return this._cache;
      }, _get(KEYS.CART) || []);
    },

    async _save(items) {
      const user = Auth.getUser();
      // Fallback to localStorage for guest or admin users
      if (!user || user.role === 'admin' || user.id === 'admin') {
        _set(KEYS.CART, items);
        this._notify();
        return;
      }

      await this._run('save', async () => {
        const client = await this._ensureClient();
        
        // Delete existing cart items for user
        await client.from(this._table).delete().eq('user_id', user.id);

        // Insert new cart items
        if (items.length > 0) {
          const rows = items.map(item => ({
            user_id: user.id,
            product_id: item.id,
            name: item.name,
            brand: item.brand || '',
            price: Number(item.price) || 0,
            image: item.image || '',
            variant: item.variant || 'Default',
            qty: item.qty || 1
          }));
          await client.from(this._table).insert(rows);
        }

        this._cache = items;
      });
      this._notify();
    },

    async add(item) {
      const items = await this.get();
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
      await this._save(items);
      this._notify();
      return items;
    },

    async remove(id, variant) {
      const items = (await this.get()).filter(i => !(i.id === id && i.variant === (variant || 'Default')));
      await this._save(items);
      return items;
    },

    async updateQty(id, variant, qty) {
      const items = await this.get();
      const item = items.find(i => i.id === id && i.variant === (variant || 'Default'));
      if (item) {
        item.qty = Math.max(1, qty);
        await this._save(items);
      }
      return items;
    },

    async clear() { await this._save([]); },

    async count() { 
      const items = await this.get();
      return items.reduce((s, i) => s + i.qty, 0);
    },

    async subtotal() {
      const items = await this.get();
      return items.reduce((s, i) => s + (i.price * i.qty), 0);
    },

    async shipping() {
      const sub = await this.subtotal();
      const threshold = (await Settings.get()).shippingThreshold || 3500;
      return sub >= threshold ? 0 : 50;
    },

    async total() {
      let t = (await this.subtotal()) + (await this.shipping());
      const promo = await this.getAppliedPromo();
      if (promo) {
        if (promo.type === 'percent') t = t * (1 - promo.value / 100);
        else if (promo.type === 'fixed') t = Math.max(0, t - promo.value);
      }
      return Math.round(t * 100) / 100;
    },

    async discount() {
      const promo = await this.getAppliedPromo();
      if (!promo) return 0;
      const base = (await this.subtotal()) + (await this.shipping());
      if (promo.type === 'percent') return Math.round(base * promo.value / 100);
      if (promo.type === 'fixed') return Math.min(promo.value, base);
      return 0;
    },

    async applyPromo(code) {
      const fixedPromos = {
        'MDB10':   { code: 'MDB10',   type: 'percent', value: 10, label: '10% Off' },
        'MDB20':   { code: 'MDB20',   type: 'percent', value: 20, label: '20% Off' },
        'SAVE50':  { code: 'SAVE50',  type: 'fixed',   value: 50, label: '50 LE Off' },
        'FREESHIP': { code: 'FREESHIP', type: 'fixed', value: 50, label: 'Free Shipping' },
      };
      
      const customPromos = await Coupons.get();
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
     WISHLIST — Supabase-backed
     =================================================================== */
  const Wishlist = {
    _cache: null,
    _table: 'wishlist',
    _client: null,

    async _ensureClient() {
      if (this._client) return this._client;
      if (Products._client) {
        this._client = await Products._ensureClient();
        return this._client;
      }
      return await Products._ensureClient();
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.warn(`MDB Wishlist ${opName} error:`, err);
        return fallback;
      }
    },

    async get() {
      const user = Auth.getUser();
      if (!user) {
        return _get(KEYS.WISHLIST) || []; // Fallback to localStorage for guest users
      }

      // Fallback to localStorage for admin users (user.id is 'admin', not a UUID)
      if (user.role === 'admin' || user.id === 'admin') {
        return _get(KEYS.WISHLIST) || [];
      }

      return this._run('get', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        this._cache = (data || []).map(row => ({
          id: row.product_id,
          name: row.name,
          brand: row.brand || '',
          price: Number(row.price) || 0,
          image: row.image || '',
          addedAt: row.created_at
        }));
        return this._cache;
      }, _get(KEYS.WISHLIST) || []);
    },

    async _save(items) {
      const user = Auth.getUser();
      if (!user) {
        _set(KEYS.WISHLIST, items);
        this._notify();
        return;
      }

      this._run('save', async () => {
        const client = await this._ensureClient();
        
        // Delete existing wishlist items for user
        await client.from(this._table).delete().eq('user_id', user.id);

        // Insert new wishlist items
        if (items.length > 0) {
          const rows = items.map(item => ({
            user_id: user.id,
            product_id: item.id,
            name: item.name,
            brand: item.brand || '',
            price: Number(item.price) || 0,
            image: item.image || ''
          }));
          await client.from(this._table).insert(rows);
        }

        this._cache = items;
      });
      this._notify();
    },

    async add(product) {
      const items = await this.get();
      if (items.some(i => i.id === product.id)) return items; // already exists
      items.push({
        id: product.id,
        name: product.name,
        brand: product.brand || '',
        price: parseFloat(product.price) || 0,
        image: product.image || '',
        addedAt: _dateNow()
      });
      await this._save(items);
      return items;
    },

    async remove(id) {
      const items = (await this.get()).filter(i => i.id !== id);
      await this._save(items);
      return items;
    },

    async toggle(product) {
      if (await this.has(product.id)) {
        await this.remove(product.id);
        return false; // removed
      } else {
        await this.add(product);
        return true; // added
      }
    },

    async has(id) { 
      const items = await this.get();
      return items.some(i => i.id === id);
    },

    async count() { 
      const items = await this.get();
      return items.length;
    },

    async clear() { await this._save([]); },

    _notify() {
      document.dispatchEvent(new CustomEvent('mdb:wishlist:updated', { detail: { count: this.count() } }));
    }
  };

  /* ===================================================================
     ORDERS — Supabase-backed
     =================================================================== */
  const Orders = {
    _cache: null,
    _table: 'orders',
    _client: null,

    async _ensureClient() {
      if (this._client) return this._client;
      if (Products._client) {
        this._client = await Products._ensureClient();
        return this._client;
      }
      return await Products._ensureClient();
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.error(`[MDB Orders] Error during ${opName}:`, err);
        if (err.code) console.error(`[MDB Orders] Supabase Error Code: ${err.code} - ${err.message}`);
        return fallback;
      }
    },

    async get() {
      const user = Auth.getUser();

      return this._run('get', async () => {
        const client = await this._ensureClient();
        let query = client.from(this._table).select('*').order('created_at', { ascending: false });
        
        let dbOrders = [];
        if (!user || user.role !== 'admin') {
          if (user) {
            query = query.eq('user_id', user.id);
            const { data, error } = await query;
            if (!error) dbOrders = data || [];
          }
        } else {
          // Admin fetches all
          const { data, error } = await query;
          if (!error) dbOrders = data || [];
        }

        const mappedDbOrders = dbOrders.map(row => ({
          id: row.id,
          items: row.items,
          total: Number(row.total) || 0,
          customer: {
            name: row.customer_name,
            email: row.customer_email,
            phone: row.customer_phone,
            address: row.customer_address,
            city: row.customer_city,
            notes: row.notes || ''
          },
          status: row.status,
          paymentMethod: row.payment_method,
          paymentStatus: row.payment_status,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));

        // Merge with local storage orders
        const localOrders = _get(KEYS.ORDERS) || [];
        const merged = [...mappedDbOrders];
        const dbIds = new Set(mappedDbOrders.map(o => o.id));
        
        for (const lo of localOrders) {
          if (!dbIds.has(lo.id)) {
            // Ensure the local order belongs to the user if not admin
            if (!user || user.role === 'admin' || (user && lo.user_id === user.id) || !lo.user_id) {
              merged.push(lo);
            }
          } else {
             // If it exists in DB but local status is different (maybe updated recently)
             // We can sync local status if needed, but DB is source of truth.
             // We will update local storage with DB status to keep it clean.
             const idx = localOrders.findIndex(o => o.id === lo.id);
             const dbStatus = mappedDbOrders.find(o => o.id === lo.id).status;
             if (idx > -1 && localOrders[idx].status !== dbStatus) {
                localOrders[idx].status = dbStatus;
             }
          }
        }
        
        // Sort by date descending
        merged.sort((a, b) => new Date(b.createdAt || 0).getTime() < new Date(a.createdAt || 0).getTime() ? 1 : -1);

        // Update local storage to fix any discrepancies silently
        _set(KEYS.ORDERS, localOrders);

        this._cache = merged;
        return this._cache;
      }, _get(KEYS.ORDERS) || []);
    },

    async _save(orders) {
      // Orders are saved individually in Supabase
      this._cache = orders;
    },

    async create(orderData) {
      const user = Auth.getUser();
      console.log('[MDB Orders] User:', user);
      
      const cartItems = await Cart.get();
      console.log('[MDB Orders] Cart Items:', cartItems);
      
      const order = {
        user_id: user?.id || null,
        customer_name: orderData.name || '',
        customer_email: orderData.email || '',
        customer_phone: orderData.phone || '',
        customer_address: orderData.address || '',
        customer_city: orderData.city || '',
        notes: orderData.notes || '',
        items: cartItems,
        total: await Cart.total(),
        status: 'pending',
        payment_method: orderData.paymentMethod || 'cash',
        payment_status: 'pending'
      };

      console.log('[MDB Orders] Attempting to save order to Supabase:', order);

      // ALWAYS attempt to save to Supabase first
      const client = await this._ensureClient();
      const { data, error } = await client.from(this._table).insert(order).select().single();
      
      if (error) {
        console.error('[MDB Orders] Supabase Insert Error:', error);
        // If it's a foreign key error with 'admin', try again without user_id
        if (error.code === '22P02' && order.user_id === 'admin') {
          console.warn('[MDB Orders] Retrying without admin user_id...');
          delete order.user_id;
          const retry = await client.from(this._table).insert(order).select().single();
          if (retry.error) throw retry.error;
          return retry.data;
        }
        throw error;
      }
      
      console.log('[MDB Orders] Supabase Success:', data);
      const res = data;
      
      console.log('[MDB Orders] Result from Supabase:', res);

      // ALWAYS save to localStorage as a fallback/guest history
      const localOrders = _get(KEYS.ORDERS) || [];
      const localOrder = {
        id: res ? res.id : _uid(),
        items: cartItems,
        subtotal: await Cart.subtotal(),
        shipping: await Cart.shipping(),
        discount: await Cart.discount(),
        promoCode: Cart.getAppliedPromo()?.code || null,
        total: await Cart.total(),
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
        statusHistory: [{ status: 'pending', date: _dateNow(), note: 'Order placed' }],
        createdAt: _dateNow(),
        updatedAt: _dateNow()
      };
      
      localOrders.unshift(localOrder);
      _set(KEYS.ORDERS, localOrders);
      
      this._cache = null;
      await Cart.clear();
      Cart.removePromo();
      
      return res || localOrder;
    },

    async getById(id) {
      const orders = await this.get();
      return orders.find(o => o.id === id) || null;
    },

    async getByEmail(email) {
      const orders = await this.get();
      return orders.filter(o => o.customer.email?.toLowerCase() === email.toLowerCase() || o.customer_email?.toLowerCase() === email.toLowerCase());
    },

    async getForCurrentUser() {
      const user = Auth.getUser();
      if (!user) return [];
      return await this.get();
    },

    async updateStatus(id, newStatus, note) {
      // Update local storage fallback as well
      const localOrders = _get(KEYS.ORDERS) || [];
      const idx = localOrders.findIndex(o => o.id === id);
      if (idx > -1) {
        localOrders[idx].status = newStatus;
        localOrders[idx].updatedAt = _dateNow();
        _set(KEYS.ORDERS, localOrders);
      }

      return this._run('updateStatus', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .update({ status: newStatus, updated_at: _dateNow() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        this._cache = null;
        return data;
      }, null);
    },

    async count() { 
      const orders = await this.get();
      return orders.length;
    }
  };

  /* ===================================================================
     AUTH  — Supabase-backed user management
     =================================================================== */
  const Auth = {
    _cache: null,
    _table: 'users',
    _client: null,

    async _ensureClient() {
      if (this._client) return this._client;
      if (Products._client) {
        this._client = await Products._ensureClient();
        return this._client;
      }
      return await Products._ensureClient();
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.warn(`MDB Auth ${opName} error:`, err);
        return fallback;
      }
    },

    async _getUsers() { 
      return this._run('getUsers', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client.from(this._table).select('*');
        if (error) throw error;
        return data || [];
      }, _get('mdb_users') || []); 
    },

    async _saveUsers(users) {
      // Users are saved individually in Supabase
      this._cache = users;
    },

    async register(data) {
      const users = await this._getUsers();
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
        email: email,
        password: btoa(data.password), // simple encoding (NOT for production)
        first_name: data.firstName || '',
        last_name: data.lastName || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        role: 'customer'
      };

      return this._run('register', async () => {
        const client = await this._ensureClient();
        const { data: newUser, error } = await client.from(this._table).insert(user).select().single();
        if (error) throw error;
        // Auto login
        await this._setSession(newUser);
        return { success: true, user: this._sanitize(newUser) };
      }, { success: false, message: 'Registration failed' });
    },

    async login(email, password) {
      const target = (email || '').trim().toLowerCase();
      // Special check for Admin - accepts both 'admin' username and 'admin@mdboutiquee.com' email
      if ((target === 'admin' || target === 'admin@mdboutiquee.com') && password === 'admin123') {
        const adminUser = { id: 'admin', first_name: 'Site', last_name: 'Admin', email: 'admin@mdboutiquee.com', role: 'admin' };
        await this._setSession(adminUser);
        return { success: true, user: adminUser, isAdmin: true };
      }

      return this._run('login', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .select('*')
          .eq('email', target)
          .single();
        
        if (error || !data) return { success: false, message: 'Invalid email or password' };
        if (data.password !== btoa(password)) return { success: false, message: 'Invalid email or password' };
        
        await this._setSession(data);
        return { success: true, user: this._sanitize(data) };
      }, { success: false, message: 'Login failed' });
    },

    async logout() {
      sessionStorage.removeItem(KEYS.SESSION);
      localStorage.removeItem(KEYS.SESSION);
      document.dispatchEvent(new CustomEvent('mdb:auth:changed', { detail: { user: null } }));
    },

    async isLoggedIn() {
      return !!this.getUser();
    },

    getUser() {
      return _get(KEYS.SESSION) || JSON.parse(sessionStorage.getItem(KEYS.SESSION) || 'null');
    },

    async updateProfile(data) {
      const users = await this._getUsers();
      const current = this.getUser();
      if (!current) return { success: false, message: 'Not logged in' };

      const idx = users.findIndex(u => u.id === current.id);
      if (idx === -1) return { success: false, message: 'User not found' };

      const updates = {};
      if (data.firstName !== undefined) updates.first_name = data.firstName;
      if (data.lastName !== undefined) updates.last_name = data.lastName;
      if (data.phone !== undefined) updates.phone = data.phone;
      if (data.address !== undefined) updates.address = data.address;
      if (data.city !== undefined) updates.city = data.city;

      return this._run('updateProfile', async () => {
        const client = await this._ensureClient();
        const { data: updated, error } = await client
          .from(this._table)
          .update(updates)
          .eq('id', current.id)
          .select()
          .single();
        if (error) throw error;
        await this._setSession(updated);
        return { success: true, user: this._sanitize(updated) };
      }, { success: false, message: 'Update failed' });
    },

    async changePassword(currentPass, newPass) {
      const users = await this._getUsers();
      const current = this.getUser();
      if (!current) return { success: false, message: 'Not logged in' };

      const idx = users.findIndex(u => u.id === current.id);
      if (idx === -1) return { success: false, message: 'User not found' };
      if (users[idx].password !== btoa(currentPass)) return { success: false, message: 'Current password is incorrect' };
      if (newPass.length < 6) return { success: false, message: 'New password must be at least 6 characters' };

      return this._run('changePassword', async () => {
        const client = await this._ensureClient();
        const { error } = await client
          .from(this._table)
          .update({ password: btoa(newPass) })
          .eq('id', current.id);
        if (error) throw error;
        return { success: true };
      }, { success: false, message: 'Password change failed' });
    },

    async _setSession(user) {
      const safe = this._sanitize(user);
      _set(KEYS.SESSION, safe);
      sessionStorage.setItem(KEYS.SESSION, JSON.stringify(safe));
      document.dispatchEvent(new CustomEvent('mdb:auth:changed', { detail: { user: safe } }));
    },

    _sanitize(user) {
      const { password, ...safe } = user;
      return {
        id: safe.id,
        firstName: safe.first_name || safe.firstName,
        lastName: safe.last_name || safe.lastName,
        email: safe.email,
        phone: safe.phone,
        address: safe.address,
        city: safe.city,
        role: safe.role
      };
    }
  };

  /* ===================================================================
     REVIEWS — Supabase-backed
     =================================================================== */
  const Reviews = {
    _cache: null,
    _table: 'reviews',
    _client: null,

    async _ensureClient() {
      if (this._client) return this._client;
      if (Products._client) {
        this._client = await Products._ensureClient();
        return this._client;
      }
      return await Products._ensureClient();
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.warn(`MDB Reviews ${opName} error:`, err);
        return fallback;
      }
    },

    async get() {
      return this._run('get', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client.from(this._table).select('*').order('created_at', { ascending: false });
        if (error) throw error;
        this._cache = (data || []).map(row => ({
          id: row.id,
          productId: row.product_id,
          rating: row.rating,
          review_text: row.review_text,
          authorName: row.author_name || 'Anonymous',
          authorEmail: row.author_email || '',
          isVerified: !!row.user_id,
          createdAt: row.created_at
        }));
        return this._cache;
      }, _get(KEYS.REVIEWS) || []);
    },

    async _save(reviews) {
      // Reviews are saved individually in Supabase
      this._cache = reviews;
    },

    async getForProduct(productId) {
      const reviews = await this.get();
      return reviews.filter(r => r.productId === productId);
    },

    async add(data) {
      const user = Auth.getUser();
      const review = {
        user_id: user?.id || null,
        product_id: data.productId,
        rating: Math.min(5, Math.max(1, parseInt(data.rating) || 5)),
        review_text: data.text || '',
        author_name: user ? ((user.firstName + ' ' + user.lastName).trim()) : (data.authorName || 'Anonymous'),
        author_email: user ? user.email : (data.authorEmail || '')
      };

      return this._run('add', async () => {
        const client = await this._ensureClient();
        const { data: newReview, error } = await client.from(this._table).insert(review).select().single();
        if (error) throw error;
        this._cache = null;
        return newReview;
      }, null);
    },

    async getAverageRating(productId) {
      const pr = await this.getForProduct(productId);
      if (pr.length === 0) return 0;
      return Math.round((pr.reduce((s, r) => s + r.rating, 0) / pr.length) * 10) / 10;
    },

    async remove(reviewId) {
      return this._run('remove', async () => {
        const client = await this._ensureClient();
        const { error } = await client.from(this._table).delete().eq('id', reviewId);
        if (error) throw error;
        this._cache = null;
        return true;
      }, false);
    },

    async delete(reviewId) { return await this.remove(reviewId); }
  };

  /* ===================================================================
    SETTINGS & COUPONS (ADMIN) — Supabase-backed
    =================================================================== */
  const Settings = {
    _cache: null,
    _table: 'settings',
    _client: null,

    async _ensureClient() {
      if (this._client) return this._client;
      if (Products._client) {
        this._client = await Products._ensureClient();
        return this._client;
      }
      return await Products._ensureClient();
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.warn(`MDB Settings ${opName} error:`, err);
        return fallback;
      }
    },

    async get() {
      return this._run('get', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client.from(this._table).select('*').eq('key', 'general').single();
        if (error) {
          if (error.code === 'PGRST116') {
            // No settings found, return defaults
            return {
              announcement: 'Free shipping on orders over 3500 LE',
              shippingThreshold: 3500,
              contactEmail: 'hello@mdboutiquee2.com',
              contactPhone: '+201037070888',
              vodafoneNumber: '01037070888',
              currency: 'LE'
            };
          }
          throw error;
        }
        return data.value || {
          announcement: 'Free shipping on orders over 3500 LE',
          shippingThreshold: 3500,
          codFee: 50,
          contactEmail: 'hello@mdboutiquee2.com',
          contactPhone: '+201037070888',
          vodafoneNumber: '01037070888',
          currency: 'LE'
        };
      }, _get(KEYS.SETTINGS) || {
        announcement: 'Free shipping on orders over 3500 LE',
        shippingThreshold: 3500,
        codFee: 50,
        contactEmail: 'hello@mdboutiquee2.com',
        contactPhone: '+201037070888',
        vodafoneNumber: '01037070888',
        currency: 'LE'
      });
    },

    async save(settings) {
      return this._run('save', async () => {
        const client = await this._ensureClient();
        const current = await this.get();
        const merged = { ...current, ...settings };
        const { error } = await client
          .from(this._table)
          .upsert({ key: 'general', value: merged }, { onConflict: 'key' });
        if (error) throw error;
        this._cache = merged;
      }, null);
    }
  };

  const Coupons = {
    _cache: null,
    _table: 'coupons',
    _client: null,

    async _ensureClient() {
      if (this._client) return this._client;
      if (Products._client) {
        this._client = await Products._ensureClient();
        return this._client;
      }
      return await Products._ensureClient();
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.warn(`MDB Coupons ${opName} error:`, err);
        return fallback;
      }
    },

    async get() {
      return this._run('get', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .select('*')
          .eq('is_active', true);
        if (error) throw error;
        this._cache = (data || []).map(row => ({
          code: row.code,
          type: row.type,
          value: Number(row.value) || 0,
          minOrder: Number(row.min_order) || 0,
          maxUses: row.max_uses,
          usedCount: row.used_count || 0,
          expiresAt: row.expires_at
        }));
        return this._cache;
      }, _get(KEYS.CUSTOM_COUPONS) || []);
    },

    async add(coupon) {
      return this._run('add', async () => {
        const client = await this._ensureClient();
        const row = {
          code: coupon.code.toUpperCase(),
          type: coupon.type,
          value: Number(coupon.value) || 0,
          min_order: Number(coupon.minOrder) || 0,
          max_uses: coupon.maxUses || null,
          expires_at: coupon.expiresAt || null,
          is_active: true
        };
        const { data, error } = await client.from(this._table).insert(row).select().single();
        if (error) throw error;
        this._cache = null;
        return data;
      }, null);
    },

    async delete(code) {
      return this._run('delete', async () => {
        const client = await this._ensureClient();
        const { error } = await client.from(this._table).update({ is_active: false }).eq('code', code.toUpperCase());
        if (error) throw error;
        this._cache = null;
        return true;
      }, false);
    }
  };

  /* ===================================================================
    ADDRESSES — Supabase-backed
    =================================================================== */
  const Addresses = {
    _cache: null,
    _table: 'addresses',
    _client: null,

    async _ensureClient() {
      if (this._client) return this._client;
      if (Products._client) {
        this._client = await Products._ensureClient();
        return this._client;
      }
      return await Products._ensureClient();
    },

    async _run(opName, asyncFn, fallback) {
      try {
        return await asyncFn();
      } catch (err) {
        console.warn(`MDB Addresses ${opName} error:`, err);
        return fallback;
      }
    },

    async get() {
      const user = Auth.getUser();
      if (!user) {
        return _get(KEYS.ADDRESSES) || []; // Fallback to localStorage for guest users
      }

      // Fallback to localStorage for admin users (user.id is 'admin', not a UUID)
      if (user.role === 'admin' || user.id === 'admin') {
        return _get(KEYS.ADDRESSES) || [];
      }

      return this._run('get', async () => {
        const client = await this._ensureClient();
        const { data, error } = await client
          .from(this._table)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        this._cache = (data || []).map(row => ({
          id: row.id,
          label: row.label || 'Home',
          name: row.full_name,
          phone: row.phone,
          address: row.address,
          city: row.city,
          isDefault: row.is_default
        }));
        return this._cache;
      }, _get(KEYS.ADDRESSES) || []);
    },

    async _save(addrs) {
      const user = Auth.getUser();
      if (!user) {
        _set(KEYS.ADDRESSES, addrs);
        return;
      }

      this._run('save', async () => {
        const client = await this._ensureClient();
        
        // Delete existing addresses for user
        await client.from(this._table).delete().eq('user_id', user.id);

        // Insert new addresses
        if (addrs.length > 0) {
          const rows = addrs.map(addr => ({
            user_id: user.id,
            full_name: addr.name || '',
            phone: addr.phone || '',
            address: addr.address || '',
            city: addr.city || '',
            is_default: addr.isDefault || false
          }));
          await client.from(this._table).insert(rows);
        }

        this._cache = addrs;
      });
    },

    async add(addr) {
      const addrs = await this.get();
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
      await this._save(addrs);
      return entry;
    },

    async remove(id) {
      const addrs = (await this.get()).filter(a => a.id !== id);
      await this._save(addrs);
      return addrs;
    },

    async setDefault(id) {
      const addrs = await this.get();
      addrs.forEach(a => a.isDefault = (a.id === id));
      await this._save(addrs);
      return addrs;
    },

    async getDefault() {
      const addrs = await this.get();
      return addrs.find(a => a.isDefault) || null;
    }
  };

  /* ===================================================================
    UI HELPERS
  */
  const UI = {
    /** Format price with LE */
    formatPrice(n) {
      return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 0 }) + ' LE';
    },

    /** Generate product card HTML */
        productCardHTML(p, basePathOverride = null) {
      const basePath = typeof basePathOverride === "string"
        ? basePathOverride
        : (window.location.pathname.includes("/collections/") || window.location.pathname.includes("/Pages/") ? "../" : "");
      const image = p.image || "img/logo.svg";
      const hoverImage = (Array.isArray(p.images) && p.images.length > 1) ? p.images[1] : (p.images && p.images[0] !== p.image ? p.images[0] : image);
      
      // Ensure image paths start with ../ for collections and pages
      const normalizeImagePath = (imgPath) => {
        if (!imgPath) return basePath + "img/logo.svg";
        if (imgPath.startsWith("http") || imgPath.startsWith("data:")) return imgPath;
        if (imgPath.startsWith("../")) return imgPath;
        return basePath + imgPath;
      };
      
      const normalizedImage = normalizeImagePath(image);
      const normalizedHoverImage = normalizeImagePath(hoverImage);
      
      const oldPrice = p.originalPrice || p.oldPrice;
      const badge = typeof p.badge === "string" ? p.badge.trim() : "";
      const badgeText = badge ? badge.charAt(0).toUpperCase() + badge.slice(1) : "";
      const reviews = parseInt(p.reviewCount, 10) || 0;
      const ratingValue = Math.max(0, Math.min(5, parseFloat(p.rating) || 0));
      const ratingStars = "★".repeat(Math.round(ratingValue)) + "☆".repeat(5 - Math.round(ratingValue));
      const defaultVariant = (Array.isArray(p.variantGroups) && p.variantGroups[0] && Array.isArray(p.variantGroups[0].options) && p.variantGroups[0].options[0])
        || ((p.variants && p.variants[0]) || "Default");
      const savings = oldPrice && oldPrice > p.price
        ? Math.round(((oldPrice - p.price) / oldPrice) * 100)
        : 0;
      const stock = Number.isFinite(parseInt(p.stock, 10)) ? parseInt(p.stock, 10) : null;
      const isWishlisted = Wishlist.has(p.id);
      let stockLabel = "Available Now";
      let stockClass = "in-stock";
      if (stock === 0) {
        stockLabel = "Out of Stock";
        stockClass = "out-of-stock";
      } else if (stock !== null && stock <= 5) {
        stockLabel = `Only ${stock} left`;
        stockClass = "low-stock";
      }
      const categoryLabel = p.subcategory || p.category || "Beauty Pick";
      return `
        <article class="product-card-new" data-id="${p.id}" data-name="${p.name}" data-brand="${p.brand || ""}" data-price="${p.price}" data-image="${normalizedImage}" data-variant="${defaultVariant}">
          <div class="product-card-new__image-section">
            <img src="${normalizedImage}" alt="${p.name}" class="product-card-new__image" onerror="this.src='${basePath}img/logo.svg'">
            
            <div class="product-card-new__actions">
              <button class="product-card-new__action-btn" data-quick-view="${p.id}" title="Quick View" aria-label="Quick view ${p.name}"><i class="fa-regular fa-eye"></i></button>
              <button class="product-card-new__action-btn btn-atc" data-id="${p.id}" ${stock === 0 ? "disabled" : ""} title="Add to Cart" aria-label="Add ${p.name} to cart"><i class="fa-solid fa-cart-shopping"></i></button>
            </div>
          </div>
          
          <div class="product-card-new__details">
            <span class="product-card-new__brand">${(p.brand || "MDB").toUpperCase()}</span>
            <h3 class="product-card-new__title"><a href="${basePath}product.html?id=${p.id}">${p.name}</a></h3>
            <div class="product-card-new__price">${this.formatPrice(p.price)}</div>
            
            ${p.images && p.images.length > 1 ? `
              <div class="product-card-new__variants">
                ${p.images.slice(0, 3).map((img, idx) => `
                  <img src="${normalizeImagePath(img)}" alt="Variant ${idx + 1}" class="product-card-new__variant">
                `).join('')}
                ${p.images.length > 3 ? `<div class="product-card-new__variant-more">+${p.images.length - 3}</div>` : ''}
              </div>
            ` : ''}
          </div>
        </article>
      `;
    },

    /** Initialize product card thumbnail click handlers */
    initProductCardThumbnails() {
      document.addEventListener('click', (e) => {
        const thumbnail = e.target.closest('.product-card-new__variant');
        if (!thumbnail) return;
        
        const card = thumbnail.closest('.product-card-new');
        if (!card) return;
        
        const mainImage = card.querySelector('.product-card-new__image');
        if (!mainImage) return;
        
        const newSrc = thumbnail.src;
        if (!newSrc) return;
        
        // Fade out current image
        mainImage.classList.add('fade-out');
        
        setTimeout(() => {
          mainImage.src = newSrc;
          mainImage.classList.remove('fade-out');
          mainImage.classList.add('fade-in');
          
          setTimeout(() => {
            mainImage.classList.remove('fade-in');
          }, 300);
        }, 300);
        
        // Update active state
        card.querySelectorAll('.product-card-new__variant').forEach(v => {
          v.classList.remove('active');
        });
        thumbnail.classList.add('active');
      });
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
    async updateCartBadges() {
      const c = await Cart.count();
      document.querySelectorAll('.cart-badge').forEach(b => {
        b.textContent = c;
        b.style.display = c > 0 ? 'flex' : 'none';
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
