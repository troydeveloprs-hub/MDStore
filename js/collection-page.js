document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  if (!window.MDB || !window.MDB.Products || !window.MDB.UI) return;

  const grid = document.getElementById('collection-grid');
  const noProducts = document.getElementById('no-products');
  const countEl = document.querySelector('.collection-count');
  const sortEl = document.getElementById('sort');
  const loadMoreBtn = document.getElementById('load-more');

  if (!grid || !countEl || !sortEl) return;

  // Pagination state
  const isMobile = window.innerWidth < 768;
  const productsPerPage = isMobile ? 8 : 12;
  let currentPage = 1;
  let currentProducts = [];

  /**
   * 1. Extract parameters from URL
   * Supports: /brand/elf, /category/makeup, /shop?search=lipstick, /shop?brand=elf&category=lips
   */
  function getUrlParams() {
    const path = window.location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    
    let brand = searchParams.get('brand');
    let category = searchParams.get('category');
    let search = searchParams.get('search') || searchParams.get('q');
    
    // Handle path-based routing (/brand/elf)
    if (path.includes('/brand/')) {
      brand = path.split('/brand/')[1].split('/')[0].replace(/\.html$/i, '');
    } else if (path.includes('/category/')) {
      category = path.split('/category/')[1].split('/')[0].replace(/\.html$/i, '');
    } else if (path.includes('/collections/')) {
      // Handle legacy collection paths
      const coll = path.split('/collections/')[1].split('/')[0].replace(/\.html$/i, '');
      if (['makeup', 'skincare', 'hair', 'fragrance'].includes(coll)) {
        category = coll;
      } else {
        brand = coll;
      }
    }

    return { 
      brand: brand || null, 
      category: category || null, 
      search: search || null,
      sort: sortEl.value || 'newest'
    };
  }

  /**
   * 2. Reusable rendering function
   */
  function renderProducts(products) {
    // 5. Clear previous state before rendering
    grid.innerHTML = '';
    
    if (!products || products.length === 0) {
      // 6. Prevent fallback bugs - show empty state
      if (noProducts) noProducts.style.display = 'block';
      countEl.textContent = '0 products';
      return;
    }

    if (noProducts) noProducts.style.display = 'none';
    countEl.textContent = `${products.length} products`;

    // Pagination logic
    const totalPages = Math.ceil(products.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const visible = products.slice(startIndex, endIndex);

    // 7. Render products using unified UI component
    grid.innerHTML = visible.map(p => MDB.UI.productCardHTML(p)).join('');
    
    renderPagination(totalPages, products.length);
  }

  function renderPagination(totalPages, totalCount) {
    const existing = document.querySelector('.pagination');
    if (existing) existing.remove();
    if (totalPages <= 1) return;

    const nav = document.createElement('div');
    nav.className = 'pagination';
    
    // Simple pagination buttons
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.onclick = () => {
        currentPage = i;
        renderProducts(currentProducts);
        window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
      };
      nav.appendChild(btn);
    }
    
    grid.parentNode.insertBefore(nav, grid.nextSibling);
  }

  /**
   * 3. Main fetch and render flow
   */
  async function updateCollection() {
    const params = getUrlParams();
    
    // 9. Add debugging
    console.log('Collection Update:', params);
    
    countEl.classList.add('loading');
    
    // 10. Optimize performance - fetch directly from Supabase
    currentProducts = await MDB.Products.fetchProducts({
      brand: params.brand,
      category: params.category,
      search: params.search,
      sort: params.sort,
      limit: 100 
    });
    
    countEl.classList.remove('loading');
    renderProducts(currentProducts);
  }

  // Event Listeners
  if (sortEl) {
    sortEl.addEventListener('change', () => {
      currentPage = 1;
      updateCollection();
    });
  }

  // Sidebar Filters (if any)
  document.querySelectorAll('.filter-check input').forEach(input => {
    input.addEventListener('change', () => {
      // In a real refactor, these should probably update the URL or pass to fetchProducts
      // For now, let's trigger update
      currentPage = 1;
      updateCollection();
    });
  });

  // 8. Ensure each page uses the SAME logic
  updateCollection();
});
