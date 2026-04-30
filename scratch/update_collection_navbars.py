import os
import re

# New lip subcategories HTML (for desktop)
new_lip_desktop = '''                  <a href="lip-oil.html" class="mega-link">Lip Oil</a>
                  <a href="lip-liner.html" class="mega-link">Lip Liner</a>
                  <a href="lip-sets.html" class="mega-link">Lip Sets</a>
                  <a href="lip-plumper.html" class="mega-link">Lip Plumper</a>'''

# New lip subcategories HTML (for mobile)
new_lip_mobile = '''            <a href="lip-oil.html">Lip Oil</a>
            <a href="lip-liner.html">Lip Liner</a>
            <a href="lip-sets.html">Lip Sets</a>
            <a href="lip-plumper.html">Lip Plumper</a>'''

# New blush HTML (for desktop)
new_blush_desktop = '''                  <a href="blush.html" class="mega-link">Blush</a>'''

# New blush HTML (for mobile)
new_blush_mobile = '''            <a href="blush.html">Blush</a>'''

# New highlighter HTML (for mobile - may not exist in all)
new_highlighter_mobile = '''            <a href="highlighter.html">Highlighter</a>'''

def update_file(file_path):
    """Update a single file with new subcategories"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if already has new lip subcategories
        if 'lip-oil.html' in content:
            print(f"Skipped (already updated): {os.path.basename(file_path)}")
            return
        
        # Add lip subcategories to desktop navbar (Eye & Lip section)
        if 'Lip Gloss</a>' in content and 'Eye & Lip' in content:
            content = content.replace('Lip Gloss</a>', 'Lip Gloss</a>\n' + new_lip_desktop)
        
        # Add blush to desktop navbar (Face section)
        if 'Highlighter</a>' in content and 'Face' in content and 'blush.html' not in content:
            content = content.replace('Highlighter</a>', 'Highlighter</a>\n' + new_blush_desktop)
        
        # Add lip subcategories to mobile menu
        if 'Lip Gloss</a>' in content and 'mobile-nav-subsubmenu' in content:
            content = content.replace('Lip Gloss</a>', 'Lip Gloss</a>\n' + new_lip_mobile)
        
        # Add blush to mobile menu Face section
        if 'Setting Spray & Powder</a>' in content and 'mobile-nav-subsubmenu' in content:
            content = content.replace('Setting Spray & Powder</a>', 'Setting Spray & Powder</a>\n' + new_highlighter_mobile + '\n' + new_blush_mobile)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Updated: {os.path.basename(file_path)}")
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

# Process collection pages
collections_dir = '../collections'
if os.path.exists(collections_dir):
    for filename in os.listdir(collections_dir):
        if filename.endswith('.html'):
            file_path = os.path.join(collections_dir, filename)
            update_file(file_path)

# Process Pages/ folder (except admin.html)
pages_dir = '../Pages'
if os.path.exists(pages_dir):
    for filename in os.listdir(pages_dir):
        if filename.endswith('.html') and filename != 'admin.html':
            file_path = os.path.join(pages_dir, filename)
            update_file(file_path)

# Process root HTML files
root_files = ['cart.html', 'checkout.html', 'product.html']
for filename in root_files:
    file_path = '../' + filename
    if os.path.exists(file_path):
        update_file(file_path)

print("\nDone!")
