/* === js/app.js === */
/* MDBOUTIQUEE â€” Main JavaScript â€” Production Grade */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ============================================
     UTILITY HELPERS
     ============================================ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);
  const emit = (el, evt, detail) => el && el.dispatchEvent(new CustomEvent(evt, { detail }));

  /* ============================================
     HERO SLIDER â€” Auto Slide + Scroll Triggered + Click to Shop
     ============================================ */
  const heroSlider = () => {
    const slides = $$('.slide');
    if (slides.length === 0) return;
    
    let index = 0;
    
    const changeSlide = (direction) => {
      slides[index].classList.remove('active');
      
      if (direction === 'down' || direction === 'next') {
        index++;
        if (index >= slides.length) index = 0;
      } else if (direction === 'up' || direction === 'prev') {
        index--;
        if (index < 0) index = slides.length - 1;
      }
      
      slides[index].classList.add('active');
    };
    
    // Auto slide every 4 seconds
    let slideInterval = setInterval(() => {
      changeSlide('next');
    }, 4000);
    
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;
      
      if (currentScrollY < window.innerHeight) {
        if (Math.abs(scrollDiff) > 50) {
          clearInterval(slideInterval);
          changeSlide(scrollDiff > 0 ? 'down' : 'up');
          lastScrollY = currentScrollY;
          slideInterval = setInterval(() => changeSlide('next'), 4000);
        }
      }
    });
    
    // Click on product slides to navigate
    slides.forEach(slide => {
      if (slide.tagName === 'A' && slide.hasAttribute('href')) {
        slide.addEventListener('click', (e) => {
          // Allow default navigation to product page
          console.log('Navigating to:', slide.getAttribute('href'));
        });
      }
    });
  };
  heroSlider();

  /* ============================================
     CART â€” LocalStorage Persistence
     ============================================ */
  const CART_KEY = 'mdb_cart';
  const LEGACY_CART_KEY = 'mdboutiquee_cart';
  const Cart = {
    get() {
      try {
        const current = JSON.parse(localStorage.getItem(CART_KEY));
        if (Array.isArray(current)) return current;

        const legacy = JSON.parse(localStorage.getItem(LEGACY_CART_KEY));
        if (Array.isArray(legacy) && legacy.length) {
          localStorage.setItem(CART_KEY, JSON.stringify(legacy));
          localStorage.removeItem(LEGACY_CART_KEY);
          return legacy;
        }
      } catch {}
      return [];
    },
    set(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      localStorage.removeItem(LEGACY_CART_KEY);
      this.updateBadge();
      emit(document, 'mdb:cart:updated', { count: this.count(), total: this.total() });
    },
    add(item) {
      const items = this.get();
      const idx = items.findIndex(i => i.id === item.id && i.variant === item.variant);
      if (idx > -1) { items[idx].qty += item.qty || 1; }
      else { items.push({ ...item, qty: item.qty || 1 }); }
      this.set(items);
      if (window.MDB && window.MDB.Analytics && item.id) window.MDB.Analytics.trackCartAdd(item.id);
    },
    remove(id, variant) {
      const items = this.get().filter(i => !(i.id === id && i.variant === variant));
      this.set(items);
    },
    updateQty(id, variant, qty) {
      const items = this.get();
      const item = items.find(i => i.id === id && i.variant === variant);
      if (item) { item.qty = Math.max(1, qty); this.set(items); }
    },
    count() { return this.get().reduce((s, i) => s + i.qty, 0); },
    total() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
    updateBadge() {
      const c = this.count();
      $$('.cart-badge').forEach(b => {
        b.textContent = c;
        b.classList.toggle('visible', c > 0);
      });
      $$('.mob-cart-badge').forEach(b => {
        b.textContent = c;
        b.style.display = c > 0 ? 'flex' : 'none';
      });
    }
  };
  Cart.updateBadge();

  /* ============================================
     ANNOUNCEMENT BAR
     ============================================ */
  const announcementBar = $('.announcement-bar');
  if (announcementBar) {
    if (sessionStorage.getItem('announcement_closed')) {
      announcementBar.classList.add('hidden');
    }
    const closeBtn = $('.announcement-close', announcementBar);
    if (closeBtn) on(closeBtn, 'click', () => {
      announcementBar.classList.add('hidden');
      sessionStorage.setItem('announcement_closed', '1');
    });
  }

  /* ============================================
     STICKY HEADER
     ============================================ */
  const header = $('.header');
  if (header) {
    let lastScroll = 0;
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 50);
      lastScroll = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============================================
     MEGA MENU (Desktop)
     ============================================ */
  $$('.nav-item').forEach(item => {
    const menu = $('.mega-menu', item);
    if (!menu) return;
    let timeout;
    on(item, 'mouseenter', () => { clearTimeout(timeout); item.classList.add('open'); });
    on(item, 'mouseleave', () => { timeout = setTimeout(() => item.classList.remove('open'), 150); });
  });

  /* ============================================
     MOBILE NAV
     ============================================ */
  const hamburger = $('.hamburger');
  const mobileNav = $('.mobile-nav');
  const mobileOverlay = $('.mobile-nav-overlay');
  const mobileClose = $('.mobile-nav-close');

  function openMobileNav() {
    if (mobileNav) mobileNav.classList.add('open');
    if (mobileOverlay) mobileOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    if (mobileNav) mobileNav.classList.remove('open');
    if (mobileOverlay) mobileOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburger) on(hamburger, 'click', () => {
    hamburger.classList.toggle('active');
    if (hamburger.classList.contains('active')) openMobileNav();
    else closeMobileNav();
  });
  if (mobileClose) on(mobileClose, 'click', () => { hamburger && hamburger.classList.remove('active'); closeMobileNav(); });
  if (mobileOverlay) on(mobileOverlay, 'click', () => { hamburger && hamburger.classList.remove('active'); closeMobileNav(); });

  // Mobile nav accordion (multi-level)
  $$('.mobile-nav-parent, .mobile-nav-subparent').forEach(btn => {
    on(btn, 'click', () => {
      btn.classList.toggle('active');
      const sub = btn.nextElementSibling;
      if (sub && (sub.classList.contains('mobile-nav-submenu') || sub.classList.contains('mobile-nav-subsubmenu'))) {
        sub.classList.toggle('open');
      }
    });
  });

  /* ============================================
     SEARCH BAR
     ============================================ */
  const searchToggle = $('[data-search-toggle]');
  const searchBar = $('.search-bar');
  const searchClose = $('.search-close');
  const searchInput = $('.search-input');

  if (searchToggle && searchBar) {
    on(searchToggle, 'click', () => {
      searchBar.classList.toggle('open');
      if (searchBar.classList.contains('open') && searchInput) {
        setTimeout(() => searchInput.focus(), 300);
      }
    });
  }
  if (searchClose) on(searchClose, 'click', () => { searchBar && searchBar.classList.remove('open'); });

  /* ============================================
     PRODUCT CARD â€” Wishlist, Quick View, ATC
     ============================================ */
  function setWishlistButtonState(btn, active) {
    if (!btn) return;
    btn.classList.toggle('active', active);
    const icon = $('i', btn);
    if (icon) {
      icon.classList.toggle('fa-regular', !active);
      icon.classList.toggle('fa-solid', active);
    }
  }

  function getBasePath() {
    return window.location.pathname.includes('/collections/') || window.location.pathname.includes('/Pages/') ? '../' : '';
  }

  function resolveImagePath(image) {
    if (!image) return '';
    if (/^(https?:)?\/\//.test(image) || image.startsWith('data:') || image.startsWith('/')) return image;
    if (image.startsWith('../') || image.startsWith('./')) return image;
    return getBasePath() + image;
  }

  function getCardProductData(card) {
    if (!card) return null;
    return {
      id: card.dataset.id || Math.random().toString(36).slice(2),
      name: card.dataset.name || $('.product-card-name, .product-card-title a', card)?.textContent?.trim() || '',
      brand: card.dataset.brand || $('.product-card-brand', card)?.textContent?.trim() || '',
      price: parseFloat(card.dataset.price || $('.price-current', card)?.textContent?.replace(/[^0-9.]/g, '') || 0),
      image: resolveImagePath(card.dataset.image || $('.product-card-img, .product-card-img-primary', card)?.getAttribute('src') || ''),
      variant: card.dataset.variant || 'Default',
      qty: 1
    };
  }

  function addCardItemToCart(btn, card) {
    const product = getCardProductData(card);
    if (!product) return;

    const originalLabel = btn.dataset.originalLabel || btn.innerHTML;
    btn.dataset.originalLabel = originalLabel;
    btn.classList.add('loading');
    btn.innerHTML = 'Adding...';

    setTimeout(() => {
      Cart.add(product);
      btn.classList.remove('loading');
      btn.classList.add('added');
      btn.innerHTML = 'âœ“ Added';
      openCartDrawer();
      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = btn.dataset.originalLabel || originalLabel;
      }, 1500);
    }, 250);
  }

  async function openQuickViewFromTrigger(btn) {
    if (!btn) return;

    if (btn.dataset.quickView && window.MDB?.Products) {
      const product = await window.MDB.Products.getById(btn.dataset.quickView);
      if (!product) return;
      openQuickView({
        id: product.id,
        image: resolveImagePath(product.image || ''),
        brand: product.brand || '',
        name: product.name || '',
        price: window.MDB?.UI ? window.MDB.UI.formatPrice(product.price || 0) : `${product.price || 0}`,
        variant: (product.variants && product.variants[0]) || 'Default'
      });
      return;
    }

    const card = btn.closest('.product-card');
    if (!card) return;
    const product = getCardProductData(card);
    openQuickView({
      ...product,
      price: window.MDB?.UI ? window.MDB.UI.formatPrice(product.price || 0) : `${product.price || 0}`
    });
  }

  function getCurrentProductId() {
    return new URLSearchParams(window.location.search).get('id') || '';
  }

  // Wishlist toggle
  $$('.product-card-wishlist').forEach(btn => {
    on(btn, 'click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.product-card');
      const active = window.MDB?.Wishlist && card?.dataset?.id
        ? window.MDB.Wishlist.toggle({
            id: card.dataset.id,
            name: card.dataset.name || '',
            brand: card.dataset.brand || '',
            price: parseFloat(card.dataset.price || 0),
            image: (card.dataset.image || '').replace(window.location.origin + '/', '')
          })
        : !btn.classList.contains('active');
      setWishlistButtonState(btn, active);
    });
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-wishlist]');
    if (!btn || !window.MDB?.Wishlist) return;

    e.preventDefault();
    e.stopPropagation();

    const product = await window.MDB.Products.getById(btn.dataset.wishlist);
    if (!product) return;

    const active = window.MDB.Wishlist.toggle(product);
    setWishlistButtonState(btn, active);
    window.MDB.UI.toast(active ? 'Added to wishlist' : 'Removed from wishlist', 'success');
  });

  // Quick View
  const quickviewModal = $('.quickview-modal');
  const modalOverlay = $('.modal-overlay');
  const modalClose = $('.modal-close');

  function openQuickView(data) {
    if (!quickviewModal) return;
    // Populate modal
    const img = $('.quickview-image img', quickviewModal);
    const brand = $('.quickview-brand', quickviewModal);
    const name = $('.quickview-name', quickviewModal);
    const price = $('.quickview-price', quickviewModal);
    const link = $('.quickview-link', quickviewModal);
    const basePath = window.location.pathname.includes('/collections/') || window.location.pathname.includes('/Pages/') ? '../' : '';
    if (img) img.src = data.image || '';
    if (img) img.alt = data.name || '';
    if (brand) brand.textContent = data.brand || '';
    if (name) name.textContent = data.name || '';
    if (price) price.textContent = data.price || '';
    if (link) link.href = data.id ? `${basePath}product.html?id=${data.id}` : `${basePath}product.html`;
    if (data.id) quickviewModal.dataset.productId = data.id;
    quickviewModal.dataset.variant = data.variant || 'Default';
    quickviewModal.dataset.productName = data.name || '';
    quickviewModal.dataset.productBrand = data.brand || '';
    quickviewModal.dataset.productImage = data.image || '';
    quickviewModal.classList.add('open');
    if (modalOverlay) modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    if (quickviewModal) quickviewModal.classList.remove('open');
    if (modalOverlay) modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', async (e) => {
    const quickViewBtn = e.target.closest('[data-quick-view], .product-card-quickview');
    if (!quickViewBtn) return;

    e.preventDefault();
    e.stopPropagation();
    await openQuickViewFromTrigger(quickViewBtn);
  });

  if (modalClose) on(modalClose, 'click', closeQuickView);
  if (modalOverlay) on(modalOverlay, 'click', closeQuickView);

  // Quick view ATC
  const qvAtc = $('.quickview-atc', quickviewModal);
  if (qvAtc) on(qvAtc, 'click', () => {
    const id = quickviewModal?.dataset.productId || $('.quickview-name', quickviewModal)?.textContent;
    const brand = $('.quickview-brand', quickviewModal)?.textContent;
    const name = $('.quickview-name', quickviewModal)?.textContent;
    const price = parseFloat($('.quickview-price', quickviewModal)?.textContent?.replace(/[^0-9.]/g, '') || 0);
    const image = $('.quickview-image img', quickviewModal)?.src || '';
    const variant = quickviewModal?.dataset.variant || 'Default';
    Cart.add({ id, name, brand, price, image, variant, qty: 1 });
    closeQuickView();
    openCartDrawer();
  });

  // Add to Cart (product cards)
  $$('.product-card-atc, .product-card-overlay-atc').forEach(btn => {
    on(btn, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card = btn.closest('.product-card');
      if (!card) return;
      addCardItemToCart(btn, card);
    });
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.product-card-atc, .product-card-overlay-atc, .btn-atc[data-id]');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    const card = btn.closest('.product-card');
    if (!card) return;
    addCardItemToCart(btn, card);
  });

  /* ============================================
     MINI CART DRAWER
     ============================================ */
  const cartDrawer = $('.cart-drawer');
  const cartDrawerOverlay = $('.cart-drawer-overlay');
  const cartDrawerClose = $('.cart-drawer-close');
  const cartDrawerToggle = $('[data-cart-toggle]');

  function openCartDrawer() {
    renderMiniCart();
    if (cartDrawer) cartDrawer.classList.add('open');
    if (cartDrawerOverlay) cartDrawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeCartDrawer() {
    if (cartDrawer) cartDrawer.classList.remove('open');
    if (cartDrawerOverlay) cartDrawerOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  $$('[data-cart-toggle]').forEach(el => on(el, 'click', (e) => { e.preventDefault(); openCartDrawer(); }));
  if (cartDrawerClose) on(cartDrawerClose, 'click', closeCartDrawer);
  if (cartDrawerOverlay) on(cartDrawerOverlay, 'click', closeCartDrawer);

  function renderMiniCart() {
    const body = $('.cart-drawer-body');
    const subtotal = $('.cart-subtotal-value');
    const items = Cart.get();
    if (!body) return;

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <i class="fa-solid fa-bag-shopping cart-empty-icon"></i>
          <p>Your cart is empty</p>
          <a href="index.html" class="btn btn-primary btn-sm">Continue Shopping</a>
        </div>`;
      if (subtotal) subtotal.textContent = '0 LE';
      return;
    }

    body.innerHTML = items.map(item => `
      <div class="mini-cart-item" data-id="${item.id}" data-variant="${item.variant}">
        <img src="${item.image}" alt="${item.name}" class="mini-cart-img">
        <div class="mini-cart-details">
          <span class="mini-cart-brand">${item.brand || ''}</span>
          <span class="mini-cart-name">${item.name}</span>
          <div class="mini-cart-bottom">
            <span class="mini-cart-price">${(item.price * item.qty).toLocaleString('en-US', {minimumFractionDigits: 0})} LE</span>
            <div class="quantity-selector quantity-selector-sm">
              <button class="qty-btn mini-qty-minus" aria-label="Decrease">âˆ’</button>
              <input type="number" class="qty-input mini-qty-input" value="${item.qty}" min="1" readonly>
              <button class="qty-btn mini-qty-plus" aria-label="Increase">+</button>
            </div>
          </div>
        </div>
        <button class="mini-cart-remove" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `).join('');

    if (subtotal) subtotal.textContent = Cart.total().toLocaleString('en-US', {minimumFractionDigits: 0}) + ' LE';

    // Shipping Progress Bar
    const threshold = (window.MDB && window.MDB.Settings && window.MDB.Settings.get().shippingThreshold) || 3500;
    const currentTotal = Cart.total();
    const progressPercent = Math.min(100, (currentTotal / threshold) * 100);
    const remaining = threshold - currentTotal;

    const progressHTML = `
      <div class="shipping-progress-container" style="padding:15px; background:#f9f9f9; border-radius:10px; margin-bottom:15px;">
        <span class="shipping-progress-text" style="font-size:12px; display:block; margin-bottom:6px; font-weight:600;">
          ${remaining > 0 
            ? `You're ${remaining.toLocaleString()} LE away from <strong>FREE SHIPPING</strong>` 
            : `ðŸŽ‰ You've unlocked <strong>FREE SHIPPING!</strong>`}
        </span>
        <div class="shipping-progress-bar" style="height:6px; background:#e0e0e0; border-radius:10px; overflow:hidden;">
          <div class="shipping-progress-fill" style="width:${progressPercent}%; height:100%; background:var(--color-accent); transition:width 0.4s ease;"></div>
        </div>
      </div>
    `;

    // Prepend to body
    body.insertAdjacentHTML('afterbegin', progressHTML);

    // Bind mini cart events
    $$('.mini-cart-item', body).forEach(el => {
      const id = el.dataset.id;
      const variant = el.dataset.variant;
      on($('.mini-qty-minus', el), 'click', () => {
        const input = $('.mini-qty-input', el);
        const newQty = Math.max(1, parseInt(input.value) - 1);
        input.value = newQty;
        Cart.updateQty(id, variant, newQty);
        renderMiniCart();
      });
      on($('.mini-qty-plus', el), 'click', () => {
        const input = $('.mini-qty-input', el);
        const newQty = parseInt(input.value) + 1;
        input.value = newQty;
        Cart.updateQty(id, variant, newQty);
        renderMiniCart();
      });
      on($('.mini-cart-remove', el), 'click', () => {
        Cart.remove(id, variant);
        renderMiniCart();
      });
    });
  }

  /* ============================================
     PRODUCT PAGE â€” Gallery, Variants, Quantity
     ============================================ */
  // Gallery thumbs
  const mainImage = $('.product-main-image img');
  $$('.gallery-thumb').forEach(thumb => {
    on(thumb, 'click', () => {
      $$('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const src = $('img', thumb)?.src;
      if (mainImage && src) { mainImage.style.opacity = 0; setTimeout(() => { mainImage.src = src; mainImage.style.opacity = 1; }, 200); }
    });
  });
  document.addEventListener('click', (e) => {
    const thumb = e.target.closest('.gallery-thumb');
    if (!thumb) return;
    $$('.gallery-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    const src = $('img', thumb)?.src;
    if (mainImage && src) {
      mainImage.style.opacity = 0;
      setTimeout(() => {
        mainImage.src = src;
        mainImage.style.opacity = 1;
      }, 200);
    }
  });

  // Variant buttons
  $$('.variant-btns').forEach(group => {
    $$('.variant-btn', group).forEach(btn => {
      on(btn, 'click', () => {
        $$('.variant-btn', group).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  const getSelectedVariantSummary = (ctx = document) => {
    const groups = $$('[data-variant-group]', ctx);
    const selections = groups.map(group => {
      const active = $('.variant-btn.active', group);
      const groupName = group.dataset.variantGroup || 'option';
      if (!active) return '';
      return `${groupName.charAt(0).toUpperCase() + groupName.slice(1)}: ${active.textContent.trim()}`;
    }).filter(Boolean);
    return selections.join(' / ') || $('.variant-btn.active', ctx)?.textContent || 'Default';
  };

  // Quantity selectors
  $$('.quantity-selector').forEach(sel => {
    const input = $('.qty-input', sel);
    const minus = $('.qty-btn:first-child', sel);
    const plus = $('.qty-btn:last-child', sel);
    if (minus) on(minus, 'click', () => { input.value = Math.max(1, parseInt(input.value) - 1); });
    if (plus) on(plus, 'click', () => { input.value = parseInt(input.value) + 1; });
  });

  // Product page ATC
  const productAtc = $('[data-product-atc]');
  if (productAtc) on(productAtc, 'click', () => {
    const info = productAtc.closest('.product-detail-info') || productAtc.closest('.product-layout');
    const productId = getCurrentProductId() || info?.dataset?.id || '';
    const name = $('.product-detail-title', info)?.textContent || '';
    const brand = $('.product-detail-brand', info)?.textContent || '';
    const priceText = $('.price-current', info)?.textContent || '0';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '') || 0);
    const image = mainImage?.src || '';
    const variant = getSelectedVariantSummary(info);
    const qty = parseInt($('.qty-input', info)?.value || 1);

    productAtc.classList.add('loading');
    productAtc.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
    setTimeout(() => {
      Cart.add({ id: productId || name, name, brand, price, image, variant, qty });
      productAtc.classList.remove('loading');
      productAtc.classList.add('added');
      productAtc.innerHTML = '<i class="fa-solid fa-check"></i> Added to Cart';
      setTimeout(() => {
        productAtc.classList.remove('added');
        productAtc.innerHTML = '<i class="fa-solid fa-bag-shopping"></i> Add to Cart';
      }, 2000);
      openCartDrawer();
    }, 500);
  });

  // Product wishlist
  const productWishlist = $('.product-wishlist-btn');
  if (productWishlist) {
    const syncProductWishlistState = async () => {
      const productId = getCurrentProductId();
      if (!productId || !window.MDB?.Wishlist) return;
      setWishlistButtonState(productWishlist, window.MDB.Wishlist.has(productId));
      productWishlist.lastChild && productWishlist.lastChild.nodeType === Node.TEXT_NODE
        ? productWishlist.lastChild.textContent = window.MDB.Wishlist.has(productId) ? ' In Wishlist' : ' Add to Wishlist'
        : null;
    };

    syncProductWishlistState();

    on(productWishlist, 'click', async () => {
      const productId = getCurrentProductId();
      if (!productId || !window.MDB?.Wishlist || !window.MDB?.Products) return;
      const product = await window.MDB.Products.getById(productId);
      if (!product) return;
      const active = window.MDB.Wishlist.toggle(product);
      setWishlistButtonState(productWishlist, active);
      if (productWishlist.lastChild && productWishlist.lastChild.nodeType === Node.TEXT_NODE) {
        productWishlist.lastChild.textContent = active ? ' In Wishlist' : ' Add to Wishlist';
      }
      window.MDB.UI.toast(active ? 'Added to wishlist' : 'Removed from wishlist', 'success');
    });
  }

  const reviewStars = $$('#review-stars i');
  if (reviewStars.length) {
    const reviewStarsWrap = $('#review-stars');

    const paintReviewStars = (value) => {
      reviewStars.forEach(star => {
        const active = parseInt(star.dataset.val || 0, 10) <= value;
        star.classList.toggle('fa-solid', active);
        star.classList.toggle('fa-regular', !active);
      });
    };

    reviewStars.forEach(star => {
      on(star, 'click', () => {
        const value = parseInt(star.dataset.val || 5, 10);
        if (reviewStarsWrap) reviewStarsWrap.dataset.rating = String(value);
        paintReviewStars(value);
      });
    });

    paintReviewStars(parseInt(reviewStarsWrap?.dataset.rating || 5, 10));
  }

  window.submitReview = function submitReview() {
    const productId = getCurrentProductId();
    const text = ($('#review-text')?.value || '').trim();
    const rating = parseInt($('#review-stars')?.dataset.rating || 5, 10);

    if (!productId) {
      window.MDB?.UI?.toast('Product not found', 'error');
      return;
    }
    if (!text) {
      window.MDB?.UI?.toast('Please write a short review first', 'warning');
      return;
    }

    window.MDB?.Reviews?.add({ productId, rating, text });
    if ($('#review-text')) $('#review-text').value = '';
    if (typeof window.renderReviews === 'function') window.renderReviews(productId);
    window.MDB?.UI?.toast('Review submitted successfully', 'success');
  };

  $$('.auth-social-btn').forEach(btn => {
    on(btn, 'click', () => window.MDB?.UI?.toast('Social login will be available soon', 'info'));
  });

  document.addEventListener('click', (e) => {
    const wishlistLink = e.target.closest('a[aria-label="Wishlist"][href="#"]');
    if (wishlistLink) {
      e.preventDefault();
      const count = window.MDB?.Wishlist?.count?.() || 0;
      window.MDB?.UI?.toast(count ? `Wishlist has ${count} item${count > 1 ? 's' : ''}` : 'Your wishlist is empty', 'info');
      return;
    }

    const placeholderLink = e.target.closest('a[href="#"]');
    if (!placeholderLink || placeholderLink.closest('[data-cart-toggle]') || placeholderLink.classList.contains('more-options')) return;

    e.preventDefault();
    window.MDB?.UI?.toast('This section will be available soon', 'info');
  });

  /* ============================================
     ACCORDIONS
     ============================================ */
  $$('.accordion-toggle').forEach(toggle => {
    on(toggle, 'click', () => {
      toggle.classList.toggle('active');
      const body = toggle.nextElementSibling;
      if (body && body.classList.contains('accordion-body')) {
        body.style.display = body.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  /* ============================================
     COLLECTION â€” Filter Sidebar (Mobile)
     ============================================ */
  const mobileFilterBtn = $('.mobile-filter-btn');
  const collectionSidebar = $('.collection-sidebar');
  if (mobileFilterBtn && collectionSidebar) {
    on(mobileFilterBtn, 'click', () => {
      collectionSidebar.style.display = collectionSidebar.style.display === 'block' ? 'none' : 'block';
      collectionSidebar.classList.toggle('mobile-open');
    });
  }

  // Filter group toggles
  $$('.filter-group-toggle').forEach(toggle => {
    on(toggle, 'click', () => {
      toggle.classList.toggle('collapsed');
      const body = toggle.nextElementSibling;
      if (body && body.classList.contains('filter-group-body')) {
        body.style.display = body.style.display === 'none' ? 'flex' : 'none';
      }
    });
  });

  // Sort dropdown
  const sortSelect = $('.sort-select') || $('select[name="sort"]');
  if (sortSelect) on(sortSelect, 'change', () => {
    // In a real app this would re-fetch products; here we just note the change
    console.log('Sort changed to:', sortSelect.value);
  });

  // Load more
  const loadMoreBtn = $('[data-load-more]');
  if (loadMoreBtn) on(loadMoreBtn, 'click', () => {
    loadMoreBtn.textContent = 'Loading...';
    setTimeout(() => {
      // In a real app, fetch more products. Here we just hide the button
      loadMoreBtn.style.display = 'none';
    }, 800);
  });

  /* ============================================
     CART PAGE
     ============================================ */
  const cartPageEl = $('.cart-main');
  if (cartPageEl) {
    renderCartPage();

    function renderCartPage() {
      const itemsEl = $('.cart-items', cartPageEl);
      const summaryEl = $('.cart-summary', cartPageEl);
      const emptyEl = $('.cart-empty-state', cartPageEl);
      const items = Cart.get();

      if (items.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        if (itemsEl) itemsEl.style.display = 'none';
        if (summaryEl) summaryEl.style.display = 'none';
        return;
      }

      if (emptyEl) emptyEl.style.display = 'none';
      if (itemsEl) { itemsEl.style.display = ''; itemsEl.innerHTML = items.map(item => `
        <div class="cart-item" data-id="${item.id}" data-variant="${item.variant}">
          <div class="cart-item-product">
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
              <span class="cart-item-brand">${item.brand || ''}</span>
              <span class="cart-item-name">${item.name}</span>
              <span class="cart-item-variant">${item.variant || ''}</span>
              <button class="cart-item-remove" data-remove>Remove</button>
            </div>
          </div>
          <div class="cart-item-price">${item.price.toLocaleString('en-US', {minimumFractionDigits: 0})} LE</div>
          <div class="cart-item-qty">
            <div class="quantity-selector quantity-selector-sm">
              <button class="qty-btn cart-qty-minus" aria-label="Decrease">âˆ’</button>
              <input type="number" class="qty-input cart-qty-input" value="${item.qty}" min="1" readonly>
              <button class="qty-btn cart-qty-plus" aria-label="Increase">+</button>
            </div>
          </div>
          <div class="cart-item-total">${(item.price * item.qty).toLocaleString('en-US', {minimumFractionDigits: 0})} LE</div>
          <button class="cart-item-delete" data-delete aria-label="Delete"><i class="fa-solid fa-xmark"></i></button>
        </div>
      `).join(''); }

      // Summary
      const subtotal = Cart.total();
      const shipping = subtotal > 500 ? 0 : 50;
      const total = subtotal + shipping;
      if (summaryEl) {
        const subtotalEl = $('[data-subtotal]', summaryEl);
        const shippingEl = $('[data-shipping]', summaryEl);
        const totalEl = $('[data-total]', summaryEl);
        if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString('en-US', {minimumFractionDigits: 0}) + ' LE';
        if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Ù…Ø¬Ø§Ù†ÙŠ' : shipping + ' LE';
        if (totalEl) totalEl.textContent = total.toLocaleString('en-US', {minimumFractionDigits: 0}) + ' LE';
      }

      // Bind cart page events
      $$('.cart-item', itemsEl).forEach(el => {
        const id = el.dataset.id;
        const variant = el.dataset.variant;
        on($('.cart-qty-minus', el), 'click', () => {
          const input = $('.cart-qty-input', el);
          const newQty = Math.max(1, parseInt(input.value) - 1);
          input.value = newQty;
          Cart.updateQty(id, variant, newQty);
          renderCartPage();
        });
        on($('.cart-qty-plus', el), 'click', () => {
          const input = $('.cart-qty-input', el);
          const newQty = parseInt(input.value) + 1;
          input.value = newQty;
          Cart.updateQty(id, variant, newQty);
          renderCartPage();
        });
        on($('[data-remove]', el), 'click', () => { Cart.remove(id, variant); renderCartPage(); });
        on($('[data-delete]', el), 'click', () => { Cart.remove(id, variant); renderCartPage(); });
      });
    }

    // Promo code
    const promoBtn = $('.cart-promo-btn');
    const promoInput = $('.cart-promo-input');
    if (promoBtn && promoInput) on(promoBtn, 'click', () => {
      const code = promoInput.value.trim().toUpperCase();
      if (code === 'MDB10') {
        promoBtn.textContent = 'âœ“ Applied';
        promoBtn.style.background = 'var(--color-badge-new)';
      } else {
        promoBtn.textContent = 'Invalid';
        promoBtn.style.background = 'var(--color-badge-sale)';
        setTimeout(() => { promoBtn.textContent = 'Apply'; promoBtn.style.background = ''; }, 2000);
      }
    });
  }

  /* ============================================
     NEWSLETTER FORM
     ============================================ */
  const newsletterForm = $('[data-newsletter-form]');
  if (newsletterForm) {
    on(newsletterForm, 'submit', (e) => {
      e.preventDefault();
      const input = $('input', newsletterForm);
      const wrap = newsletterForm.parentElement;
      if (input && input.value.includes('@')) {
        if (wrap) wrap.innerHTML = '<div class="newsletter-success"><i class="fa-solid fa-circle-check"></i> <span>Thank you for subscribing!</span></div>';
      }
    });
  }

  /* ============================================
     CONTACT FORM
     ============================================ */
  const contactForm = $('[data-contact-form]');
  if (contactForm) {
    on(contactForm, 'submit', (e) => {
      e.preventDefault();
      const btn = $('button[type="submit"]', contactForm);
      if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }
      setTimeout(() => {
        contactForm.innerHTML = '<div class="form-success"><i class="fa-solid fa-circle-check"></i> <span>Your message has been sent. We\'ll get back to you soon!</span></div>';
      }, 1000);
    });
  }

  /* ============================================
     SCROLL TO TOP
     ============================================ */
  const scrollTopBtn = $('.scroll-top');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    on(scrollTopBtn, 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ============================================
     REVEAL ON SCROLL
     ============================================ */
  const revealEls = $$('.reveal');
  if (revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => observer.observe(el));
  }

  /* SCROLL REVEAL ANIMATION */
  const scrollRevealEls = document.querySelectorAll('.scroll-reveal, .scroll-reveal-scale, .scroll-reveal-left, .scroll-reveal-right');
  if (scrollRevealEls.length) {
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    scrollRevealEls.forEach(el => scrollObserver.observe(el));
  }

  /* ============================================
     ESCAPE KEY â€” Close all overlays
     ============================================ */
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileNav();
      if (hamburger) hamburger.classList.remove('active');
      closeQuickView();
      closeCartDrawer();
      if (searchBar) searchBar.classList.remove('open');
    }
  });
});
