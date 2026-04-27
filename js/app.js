/* === js/app.js === */
/* MDBOUTIQUEE — Main JavaScript — Production Grade */
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
     CART — LocalStorage Persistence
     ============================================ */
  const CART_KEY = 'mdboutiquee_cart';
  const Cart = {
    get() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } },
    set(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); this.updateBadge(); },
    add(item) {
      const items = this.get();
      const idx = items.findIndex(i => i.id === item.id && i.variant === item.variant);
      if (idx > -1) { items[idx].qty += item.qty || 1; }
      else { items.push({ ...item, qty: item.qty || 1 }); }
      this.set(items);
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

  // Mobile nav accordion
  $$('.mobile-nav-parent').forEach(btn => {
    on(btn, 'click', () => {
      btn.classList.toggle('active');
      const sub = btn.nextElementSibling;
      if (sub && sub.classList.contains('mobile-nav-submenu')) {
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
     PRODUCT CARD — Wishlist, Quick View, ATC
     ============================================ */
  // Wishlist toggle
  $$('.product-card-wishlist').forEach(btn => {
    on(btn, 'click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active');
      const icon = $('i', btn);
      if (icon) {
        icon.classList.toggle('fa-regular');
        icon.classList.toggle('fa-solid');
      }
    });
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
    if (img) img.src = data.image || '';
    if (img) img.alt = data.name || '';
    if (brand) brand.textContent = data.brand || '';
    if (name) name.textContent = data.name || '';
    if (price) price.textContent = data.price || '';
    quickviewModal.classList.add('open');
    if (modalOverlay) modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    if (quickviewModal) quickviewModal.classList.remove('open');
    if (modalOverlay) modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  $$('.product-card-quickview').forEach(btn => {
    on(btn, 'click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.product-card');
      if (!card) return;
      const data = {
        image: card.dataset.image || ($('.product-card-img-primary', card)?.src || ''),
        brand: card.dataset.brand || ($('.product-card-brand', card)?.textContent || ''),
        name: card.dataset.name || ($('.product-card-name', card)?.textContent || ''),
        price: card.dataset.price || ($('.price-current', card)?.textContent || ''),
      };
      openQuickView(data);
    });
  });

  if (modalClose) on(modalClose, 'click', closeQuickView);
  if (modalOverlay) on(modalOverlay, 'click', closeQuickView);

  // Quick view ATC
  const qvAtc = $('.quickview-atc', quickviewModal);
  if (qvAtc) on(qvAtc, 'click', () => {
    const brand = $('.quickview-brand', quickviewModal)?.textContent;
    const name = $('.quickview-name', quickviewModal)?.textContent;
    const price = parseFloat($('.quickview-price', quickviewModal)?.textContent?.replace(/[^0-9.]/g, '') || 0);
    const image = $('.quickview-image img', quickviewModal)?.src || '';
    Cart.add({ id: name, name, brand, price, image, variant: 'Default', qty: 1 });
    closeQuickView();
    openCartDrawer();
  });

  // Add to Cart (product cards)
  $$('.product-card-atc').forEach(btn => {
    on(btn, 'click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.product-card');
      if (!card) return;
      btn.classList.add('loading');
      btn.textContent = 'Adding...';
      setTimeout(() => {
        Cart.add({
          id: card.dataset.id || Math.random().toString(36).slice(2),
          name: card.dataset.name || ($('.product-card-name', card)?.textContent || ''),
          brand: card.dataset.brand || ($('.product-card-brand', card)?.textContent || ''),
          price: parseFloat(card.dataset.price || ($('.price-current', card)?.textContent?.replace(/[^0-9.]/g, '') || 0)),
          image: card.dataset.image || ($('.product-card-img-primary', card)?.src || ''),
          variant: card.dataset.variant || 'Default',
          qty: 1
        });
        btn.classList.remove('loading');
        btn.classList.add('added');
        btn.textContent = '✓ Added';
        setTimeout(() => { btn.classList.remove('added'); btn.textContent = 'Add to Cart'; }, 1500);
      }, 400);
    });
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
              <button class="qty-btn mini-qty-minus" aria-label="Decrease">−</button>
              <input type="number" class="qty-input mini-qty-input" value="${item.qty}" min="1" readonly>
              <button class="qty-btn mini-qty-plus" aria-label="Increase">+</button>
            </div>
          </div>
        </div>
        <button class="mini-cart-remove" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `).join('');

    if (subtotal) subtotal.textContent = Cart.total().toLocaleString('en-US', {minimumFractionDigits: 0}) + ' LE';

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
     PRODUCT PAGE — Gallery, Variants, Quantity
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

  // Variant buttons
  $$('.variant-btns').forEach(group => {
    $$('.variant-btn', group).forEach(btn => {
      on(btn, 'click', () => {
        $$('.variant-btn', group).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

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
    const name = $('.product-detail-title', info)?.textContent || '';
    const brand = $('.product-detail-brand', info)?.textContent || '';
    const priceText = $('.price-current', info)?.textContent || '0';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '') || 0);
    const image = mainImage?.src || '';
    const variant = $('.variant-btn.active', info)?.textContent || 'Default';
    const qty = parseInt($('.qty-input', info)?.value || 1);

    productAtc.classList.add('loading');
    productAtc.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
    setTimeout(() => {
      Cart.add({ id: name, name, brand, price, image, variant, qty });
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
  if (productWishlist) on(productWishlist, 'click', () => {
    productWishlist.classList.toggle('active');
    const icon = $('i', productWishlist);
    if (icon) { icon.classList.toggle('fa-regular'); icon.classList.toggle('fa-solid'); }
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
     COLLECTION — Filter Sidebar (Mobile)
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
              <button class="qty-btn cart-qty-minus" aria-label="Decrease">−</button>
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
        if (shippingEl) shippingEl.textContent = shipping === 0 ? 'مجاني' : shipping + ' LE';
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
        promoBtn.textContent = '✓ Applied';
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

  /* ============================================
     ESCAPE KEY — Close all overlays
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
