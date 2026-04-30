document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  if (!window.MDB || !window.MDB.Products || !window.MDB.UI) return;

  const grid = document.getElementById('collection-grid');
  const noProducts = document.getElementById('no-products');
  const countEl = document.querySelector('.collection-count');
  const sortEl = document.getElementById('sort');
  const loadMoreBtn = document.getElementById('load-more');

  if (!grid || !countEl || !sortEl || !loadMoreBtn) return;

  // Add loading class
  countEl.classList.add('loading');

  const slug = window.location.pathname.split('/').pop().replace(/\.html$/i, '').toLowerCase();
  const pageTitle = (document.querySelector('.page-hero-title')?.textContent || '').trim();
  const allProducts = await MDB.Products.getAll();
  
  // Pagination settings
  const isMobile = window.innerWidth < 768;
  const productsPerPage = isMobile ? 6 : 10;
  let currentPage = 1;

  // Remove loading class after products are loaded
  countEl.classList.remove('loading');

  const slugAliases = {
    'bath-body': ['bath body', 'bath-body', 'body'],
    'bb-cc-cream': ['bb cc cream', 'bb cream', 'cc cream'],
    'body-sunscreen': ['body sunscreen', 'sunscreen'],
    'brushes-applicators': ['brushes applicators', 'brushes', 'tools', 'applicators'],
    'clean-makeup': ['clean makeup', 'makeup'],
    'dark-spots': ['dark spots', 'brightening'],
    'eye-care': ['eye care', 'eyes', 'eye'],
    'eye-creams': ['eye creams', 'eye cream'],
    'eye-masks': ['eye masks', 'eye mask'],
    'eye-palettes': ['eye palettes', 'palette', 'eyes'],
    'face-masks': ['face masks', 'masks', 'mask'],
    'face-oils': ['face oils', 'face oil', 'oils', 'oil'],
    'face-primer': ['face primer', 'primer', 'face'],
    'face-serums': ['face serums', 'serums', 'serum'],
    'face-sunscreen': ['face sunscreen', 'sunscreen'],
    'face-wash': ['face wash', 'cleanser', 'wash'],
    'face-wipes': ['face wipes', 'wipes', 'wipe'],
    'fine-lines': ['fine lines', 'anti aging', 'anti-aging'],
    'high-tech-tools': ['high tech tools', 'tools', 'beauty tools'],
    'hudabeauty': ['huda beauty'],
    'lip-balms': ['lip balms', 'lip balm', 'lips'],
    'lip-gloss': ['lip gloss', 'gloss', 'lips'],
    'makeup-accessories': ['makeup accessories', 'tools', 'brushes'],
    'makeup-palettes': ['makeup palettes', 'palette', 'palettes'],
    'makeup-removers': ['makeup removers', 'removers', 'wipes', 'cleanser'],
    'mini-size': ['mini size', 'mini', 'travel size'],
    'mists-essences': ['mists essences', 'mist', 'essence'],
    'new-in': ['new in'],
    'night-creams': ['night creams', 'night cream'],
    'nyx': ['nyx'],
    'pores': ['pores', 'pore'],
    'setting-spray': ['setting spray', 'spray'],
    'sheet-masks': ['sheet masks', 'sheet mask', 'masks'],
    'value-gift-sets': ['gift sets', 'set', 'sets'],
    'value-size': ['value size', 'jumbo', 'large size']
  };

  const categoryAliases = {
    makeup: ["makeup", "mekup", "مكياج"],
    face: ["face", "foundation", "primer", "concealer", "contour", "highlighter", "bb cc cream"],
    eyes: ["eyes", "eye", "eyeliner", "eyebrow", "mascara", "eye palettes"],
    lips: ["lips", "lipstick", "lip gloss", "lip balms"]
  };

  const priceLabelMap = [
    'Under 500 LE',
    '500 LE - 1,000 LE',
    '1,000 LE - 3,500 LE',
    'Over 3,500 LE'
  ];

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function tokens(value) {
    return normalize(value).split(' ').filter(Boolean);
  }

  function productHaystack(product) {
    return normalize([
      product.name,
      product.brand,
      product.category,
      product.subcategory,
      product.description,
      product.badge
    ].join(' '));
  }

  function buildTerms() {
    const titleTerms = pageTitle ? [pageTitle] : [];
    const aliasTerms = slugAliases[slug] || [];
    const slugTerm = slug.replace(/-/g, ' ');
    return [...new Set([slugTerm, ...titleTerms, ...aliasTerms].filter(Boolean))];
  }

  function matchText(product, term) {
    const haystack = productHaystack(product);
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return false;
    if (haystack.includes(normalizedTerm)) return true;

    const termTokens = tokens(term);
    return termTokens.length > 0 && termTokens.every(token => haystack.includes(token));
  }

  function matchesCollection(product) {
    const brand = normalize(product.brand);
    const category = normalize(product.category);
    const subcategory = normalize(product.subcategory);

    if (slug === 'new-in') return !!product.isNewArrival;
    if (slug === 'bestsellers') return !!product.isFeatured || (product.rating || 0) >= 4.5 || (product.reviewCount || 0) >= 50;

    if (brand === normalize(pageTitle) || brand === normalize(slug)) return true;
    if (category === normalize(slug.replace(/-/g, ' '))) return true;
    if (subcategory === normalize(slug.replace(/-/g, ' '))) return true;

    const terms = buildTerms();
    if (terms.some(term => matchText(product, term))) return true;

    const slugTokenList = tokens(slug);
    if (slugTokenList.length && slugTokenList.every(token => productHaystack(product).includes(token))) return true;

    return false;
  }

  function matchesCategoryFilter(product, label) {
    const normalizedLabel = normalize(label);
    const haystack = productHaystack(product);
    const terms = categoryAliases[normalizedLabel] || [normalizedLabel];
    return terms.some(term => haystack.includes(normalize(term)));
  }

  function matchesPriceFilter(price, label) {
    const normalizedLabel = normalize(label);
    const numbers = (label.match(/\d[\d,]*/g) || [])
      .map(v => parseInt(v.replace(/,/g, ''), 10))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    if (normalizedLabel.startsWith('under') && numbers[0] != null) return price < numbers[0];
    if (normalizedLabel.startsWith('over') && numbers[0] != null) return price > numbers[0];
    if (numbers.length >= 2) return price >= numbers[0] && price <= numbers[1];
    return true;
  }

  function getCheckedLabels(groupName) {
    return Array.from(document.querySelectorAll('.filter-check input:checked'))
      .filter(input => input.closest('.filter-group')?.querySelector('.filter-group-toggle')?.textContent.includes(groupName))
      .map(input => input.parentElement.textContent.trim());
  }

  function fixPriceLabels() {
    const priceLabels = document.querySelectorAll('.filter-group');
    priceLabels.forEach(group => {
      const title = group.querySelector('.filter-group-toggle')?.textContent || '';
      if (!title.includes('Price')) return;

      const labels = group.querySelectorAll('.filter-check');
      labels.forEach((label, index) => {
        const input = label.querySelector('input');
        if (!input || !priceLabelMap[index]) return;
        label.innerHTML = '';
        label.appendChild(input);
        label.append(` ${priceLabelMap[index]}`);
      });
    });
  }

  function render() {
    const checkedBrands = getCheckedLabels('Brand').map(normalize);
    const checkedCategories = getCheckedLabels('Category');
    const checkedPrices = getCheckedLabels('Price');

    let filtered = allProducts.filter(matchesCollection);

    if (checkedBrands.length) {
      filtered = filtered.filter(product => checkedBrands.includes(normalize(product.brand)));
    }

    if (checkedCategories.length) {
      filtered = filtered.filter(product => checkedCategories.some(label => matchesCategoryFilter(product, label)));
    }

    if (checkedPrices.length) {
      filtered = filtered.filter(product => checkedPrices.some(label => matchesPriceFilter(product.price, label)));
    }

    const sort = sortEl.value;
    if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else filtered.sort((a, b) => (b.isFeatured === true) - (a.isFeatured === true) || (b.rating || 0) - (a.rating || 0));

    countEl.textContent = `${filtered.length} products`;

    // Pagination logic
    const totalPages = Math.ceil(filtered.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const visible = filtered.slice(startIndex, endIndex);
    
    grid.innerHTML = visible.map(product => MDB.UI.productCardHTML(product)).join('');

    if (noProducts) noProducts.style.display = filtered.length ? 'none' : 'block';
    
    // Hide load more button, show pagination
    loadMoreBtn.style.display = 'none';
    renderPagination(totalPages, filtered.length);
  }

  function renderPagination(totalPages, totalProducts) {
    // Remove existing pagination
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) existingPagination.remove();

    if (totalPages <= 1) return;

    const pagination = document.createElement('div');
    pagination.className = 'pagination';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        render();
        window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
      }
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    const maxVisiblePages = isMobile ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        render();
        window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
      });
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        render();
        window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
      }
    });
    pagination.appendChild(nextBtn);

    // Pagination info
    const info = document.createElement('span');
    info.className = 'pagination-info';
    const start = (currentPage - 1) * productsPerPage + 1;
    const end = Math.min(currentPage * productsPerPage, totalProducts);
    info.textContent = `${start}-${end} of ${totalProducts}`;
    pagination.appendChild(info);

    // Insert pagination after grid
    grid.parentNode.insertBefore(pagination, grid.nextSibling);
  }

  fixPriceLabels();

  document.querySelectorAll('.filter-check input').forEach(input => {
    input.addEventListener('change', () => {
      currentPage = 1;
      render();
    });
  });

  document.querySelector('.sidebar-clear')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-check input').forEach(input => {
      input.checked = false;
    });
    currentPage = 1;
    render();
  });

  sortEl.addEventListener('change', () => {
    currentPage = 1;
    render();
  });

  // Handle window resize to update products per page
  window.addEventListener('resize', () => {
    const newIsMobile = window.innerWidth < 768;
    if (newIsMobile !== isMobile) {
      window.location.reload(); // Reload to recalculate products per page
    }
  });

  render();
});
