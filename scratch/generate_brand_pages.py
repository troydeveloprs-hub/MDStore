import os
import re

# Brand configuration
brands = [
    {'file': 'mac.html', 'name': 'MAC Cosmetics', 'brand_filter': 'MAC', 'image': '../img/Concealer.jpeg'},
    {'file': 'fenty.html', 'name': 'Fenty Beauty', 'brand_filter': 'FENTY', 'image': '../imghero/1.jpeg'},
    {'file': 'nyx.html', 'name': 'NYX', 'brand_filter': 'NYX', 'image': '../imghero/1.jpeg'},
    {'file': 'rare-beauty.html', 'name': 'Rare Beauty', 'brand_filter': 'RARE', 'image': '../imghero/1.jpeg'},
    {'file': 'elf.html', 'name': 'e.l.f', 'brand_filter': 'E.L.F', 'image': '../imghero/1.jpeg'},
    {'file': 'dior.html', 'name': 'Dior', 'brand_filter': 'DIOR', 'image': '../imghero/1.jpeg'},
    {'file': 'ysl.html', 'name': 'YSL', 'brand_filter': 'YSL', 'image': '../imghero/1.jpeg'},
    {'file': 'charlotte-tilbury.html', 'name': 'Charlotte Tilbury', 'brand_filter': 'CHARLOTTE TILBURY', 'image': '../imghero/1.jpeg'},
    {'file': 'estee-lauder.html', 'name': 'Estée Lauder', 'brand_filter': 'ESTÉE LAUDER', 'image': '../imghero/1.jpeg'},
    {'file': 'prada.html', 'name': 'Prada', 'brand_filter': 'PRADA', 'image': '../imghero/1.jpeg'},
    {'file': 'anastasia.html', 'name': 'Anastasia Beverly Hills', 'brand_filter': 'ANASTASIA', 'image': '../imghero/1.jpeg'},
    {'file': 'tarte.html', 'name': 'Tarte', 'brand_filter': 'TARTE', 'image': '../imghero/1.jpeg'},
    {'file': 'benefit.html', 'name': 'Benefit Cosmetics', 'brand_filter': 'BENEFIT', 'image': '../imghero/1.jpeg'},
    {'file': 'kosas.html', 'name': 'Kosas', 'brand_filter': 'KOSAS', 'image': '../imghero/1.jpeg'},
]

# Read the template
template_path = '../collections/huda-beauty.html'
output_dir = '../collections'

with open(template_path, 'r', encoding='utf-8') as f:
    template = f.read()

# Generate each brand page
for brand in brands:
    output_path = os.path.join(output_dir, brand['file'])
    
    # Replace brand-specific content
    content = template
    
    # Update title
    content = re.sub(
        r'<title>.*?</title>',
        f'<title>{brand["name"]} — MDBoutiquee</title>',
        content
    )
    
    # Update meta description
    content = re.sub(
        r'<meta name="description".*?>',
        f'<meta name="description" content="Shop premium {brand["name"]} products at MDBoutiquee.">',
        content
    )
    
    # Update OG tags
    content = re.sub(
        r'<meta property="og:title".*?>',
        f'<meta property="og:title" content="{brand["name"]} — MDBoutiquee">',
        content
    )
    content = re.sub(
        r'<meta property="og:description".*?>',
        f'<meta property="og:description" content="Shop premium {brand["name"]} products at MDBoutiquee.">',
        content
    )
    content = re.sub(
        r'<meta property="twitter:title".*?>',
        f'<meta property="twitter:title" content="{brand["name"]} — MDBoutiquee">',
        content
    )
    content = re.sub(
        r'<meta property="twitter:description".*?>',
        f'<meta property="twitter:description" content="Shop premium {brand["name"]} products at MDBoutiquee.">',
        content
    )
    
    # Update hero image
    content = re.sub(
        r'<div class="hero-media"><img src="[^"]*" alt="[^"]*"',
        f'<div class="hero-media"><img src="{brand["image"]}" alt="{brand["name"]} collection"',
        content
    )
    
    # Update hero title
    content = re.sub(
        r'<h1 class="page-hero-title">.*?</h1>',
        f'<h1 class="page-hero-title">{brand["name"]}</h1>',
        content
    )
    
    # Update breadcrumb
    content = re.sub(
        r'<span class="breadcrumb-current">.*?</span>',
        f'<span class="breadcrumb-current">{brand["name"]}</span>',
        content
    )
    
    # Update brand filter script
    content = re.sub(
        r"const brandName = '.*?';",
        f"const brandName = '{brand['brand_filter']}';",
        content
    )
    
    # Write the file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Created: {brand['file']}")

print("All brand pages generated successfully!")
