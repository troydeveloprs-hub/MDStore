import os
import re

# Brands dropdown HTML code (for left navbar)
brands_dropdown_html = '''        <!-- BRANDS -->
        <div class="nav-item">
          <a href="#" class="nav-link">Brands <i class="fa-solid fa-chevron-down"></i></a>
          <div class="mega-menu">
            <div class="mega-menu-inner" style="grid-template-columns: repeat(4, 1fr);">
              <div class="mega-col">
                <span class="mega-col-title">Popular</span>
                <div class="mega-list">
                  <a href="collections/huda-beauty.html" class="mega-link">Huda Beauty</a>
                  <a href="collections/sephora.html" class="mega-link">Sephora</a>
                  <a href="collections/mac.html" class="mega-link">MAC</a>
                  <a href="collections/fenty.html" class="mega-link">Fenty Beauty</a>
                </div>
              </div>
              <div class="mega-col">
                <span class="mega-col-title">Trending</span>
                <div class="mega-list">
                  <a href="collections/nyx.html" class="mega-link">NYX</a>
                  <a href="collections/rare-beauty.html" class="mega-link">Rare Beauty</a>
                  <a href="collections/elf.html" class="mega-link">e.l.f</a>
                  <a href="collections/dior.html" class="mega-link">Dior</a>
                </div>
              </div>
              <div class="mega-col">
                <span class="mega-col-title">Luxury</span>
                <div class="mega-list">
                  <a href="collections/ysl.html" class="mega-link">YSL</a>
                  <a href="collections/charlotte-tilbury.html" class="mega-link">Charlotte Tilbury</a>
                  <a href="collections/estee-lauder.html" class="mega-link">Estée Lauder</a>
                  <a href="collections/prada.html" class="mega-link">Prada</a>
                </div>
              </div>
              <div class="mega-col">
                <span class="mega-col-title">More</span>
                <div class="mega-list">
                  <a href="collections/anastasia.html" class="mega-link">Anastasia Beverly Hills</a>
                  <a href="collections/tarte.html" class="mega-link">Tarte</a>
                  <a href="collections/benefit.html" class="mega-link">Benefit Cosmetics</a>
                  <a href="collections/kosas.html" class="mega-link">Kosas</a>
                </div>
              </div>
            </div>
          </div>
        </div>'''

# Brands mobile menu HTML code
brands_mobile_html = '''      <!-- Brands -->
      <div class="mobile-nav-section">
        <button class="mobile-nav-parent">Brands <i class="fa-solid fa-chevron-down"></i></button>
        <div class="mobile-nav-submenu">
          <a href="collections/huda-beauty.html">Huda Beauty</a>
          <a href="collections/sephora.html">Sephora</a>
          <a href="collections/mac.html">MAC</a>
          <a href="collections/fenty.html">Fenty Beauty</a>
          <a href="collections/nyx.html">NYX</a>
          <a href="collections/rare-beauty.html">Rare Beauty</a>
          <a href="collections/elf.html">e.l.f</a>
          <a href="collections/dior.html">Dior</a>
          <a href="collections/ysl.html">YSL</a>
          <a href="collections/charlotte-tilbury.html">Charlotte Tilbury</a>
          <a href="collections/estee-lauder.html">Estée Lauder</a>
          <a href="collections/prada.html">Prada</a>
          <a href="collections/anastasia.html">Anastasia Beverly Hills</a>
          <a href="collections/tarte.html">Tarte</a>
          <a href="collections/benefit.html">Benefit Cosmetics</a>
          <a href="collections/kosas.html">Kosas</a>
        </div>
      </div>'''

def add_brands_to_file(file_path, is_root=False):
    """Add Brands dropdown to a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if already has Brands dropdown in left nav
        if '<!-- BRANDS -->' in content and 'header-nav-left' in content:
            print(f"Skipped (already has Brands): {os.path.basename(file_path)}")
            return
        
        # Skip admin pages
        if 'admin.html' in file_path:
            print(f"Skipped (admin page): {os.path.basename(file_path)}")
            return
        
        # Add to desktop navbar (left nav) - insert before closing </nav> of header-nav-left
        if '<!-- SKINCARE -->' in content and 'header-nav-left' in content:
            # Find the end of SKINCARE section and insert Brands after it
            pattern = r'(<!-- SKINCARE -->.*?</div>\s*\s*</div>\s*</div>\s*</div>\s*</div>\s)\s*(</nav>)'
            replacement = r'\1\n' + brands_dropdown_html + r'\n        \2'
            content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        # Add to mobile menu - insert before mobile-nav-links
        if 'mobile-nav-section' in content and 'mobile-nav-links' in content:
            pattern = r'(</div>\s+)(<div class="mobile-nav-links">)'
            replacement = r'\1' + brands_mobile_html + r'\n      \2'
            content = re.sub(pattern, replacement, content)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Updated: {os.path.basename(file_path)}")
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

# Process Pages/ folder (except admin.html)
pages_dir = '../Pages'
if os.path.exists(pages_dir):
    for filename in os.listdir(pages_dir):
        if filename.endswith('.html') and filename != 'admin.html':
            file_path = os.path.join(pages_dir, filename)
            add_brands_to_file(file_path, is_root=False)

# Process root HTML files
root_files = ['cart.html', 'checkout.html', 'product.html']
for filename in root_files:
    file_path = '../' + filename
    if os.path.exists(file_path):
        add_brands_to_file(file_path, is_root=True)

# Process collection pages (except brand pages which already have it)
collections_dir = '../collections'
if os.path.exists(collections_dir):
    brand_pages = ['huda-beauty.html', 'sephora.html', 'mac.html', 'fenty.html', 'nyx.html', 
                   'rare-beauty.html', 'elf.html', 'dior.html', 'ysl.html', 'charlotte-tilbury.html',
                   'estee-lauder.html', 'prada.html', 'anastasia.html', 'tarte.html', 'benefit.html', 'kosas.html']
    for filename in os.listdir(collections_dir):
        if filename.endswith('.html') and filename not in brand_pages:
            file_path = os.path.join(collections_dir, filename)
            add_brands_to_file(file_path, is_root=False)

print("\nDone!")
