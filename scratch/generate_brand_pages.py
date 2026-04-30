import os
import re

# Brand configuration
brands = [
    {'file': 'huda-beauty.html', 'name': 'Huda Beauty', 'brand_filter': 'Huda Beauty', 'image': '../logos/Huda beauty/36f72eaaaf2e89f7a192d9ae89962126.jpg'},
    {'file': 'sephora.html', 'name': 'Sephora', 'brand_filter': 'SEPHORA', 'image': '../logos/Sephora/361e1f5468b3c7e28721bde481ed2ea7.jpg'},
    {'file': 'mac.html', 'name': 'MAC Cosmetics', 'brand_filter': 'MAC', 'image': '../logos/Mac cosmetics/MAC-Cosmetics-Logo.jpg'},
    {'file': 'fenty.html', 'name': 'Fenty Beauty', 'brand_filter': 'FENTY', 'image': '../logos/Fenty beauty/10-years-in-the-making-and-she-couldnt-be-more-creative-v0-nkq3ww7opnp51.jpg'},
    {'file': 'nyx.html', 'name': 'NYX', 'brand_filter': 'NYX', 'image': '../logos/Nyx/NYX_logo_black.png'},
    {'file': 'rare-beauty.html', 'name': 'Rare Beauty', 'brand_filter': 'RARE', 'image': '../imghero/1.jpeg'},  # No image in logos folder
    {'file': 'elf.html', 'name': 'e.l.f', 'brand_filter': 'E.L.F', 'image': '../logos/Elf/f902b95b2e82740a0e33fa6ff6cb6fa7.jpg'},
    {'file': 'dior.html', 'name': 'Dior', 'brand_filter': 'DIOR', 'image': '../logos/Dior/mccord_exposition_christian-dior_900x480-900x480.jpg'},
    {'file': 'ysl.html', 'name': 'YSL', 'brand_filter': 'YSL', 'image': '../logos/Ysl/ysl-yves-saint-laurent-brand-logo-symbol-clothes-design-icon-abstract-illustration-free-vector.jpg'},
    {'file': 'charlotte-tilbury.html', 'name': 'Charlotte Tilbury', 'brand_filter': 'CHARLOTTE TILBURY', 'image': '../logos/Charlotte Tilbury/charlotte-tilbury-promo-referral-code.jpg'},
    {'file': 'estee-lauder.html', 'name': 'Estée Lauder', 'brand_filter': 'ESTÉE LAUDER', 'image': '../logos/Eśtee lauder/Logo-Estee-Lauder.jpg'},
    {'file': 'prada.html', 'name': 'Prada', 'brand_filter': 'PRADA', 'image': '../logos/Prada beauty/Prada_beauty_-_les_infusion_wide.webp'},
    {'file': 'anastasia.html', 'name': 'Anastasia Beverly Hills', 'brand_filter': 'ANASTASIA', 'image': '../logos/Anastasia Beverly Hills/abcfed6f2c41c6b49e7e431586b2f18a.jpg'},
    {'file': 'tarte.html', 'name': 'Tarte', 'brand_filter': 'TARTE', 'image': '../logos/Tarte/tarte.webp'},
    {'file': 'benefit.html', 'name': 'Benefit Cosmetics', 'brand_filter': 'BENEFIT', 'image': '../logos/Benefit Cosmetics/benefit-800x400.jpg'},
    {'file': 'kosas.html', 'name': 'Kosas', 'brand_filter': 'KOSAS', 'image': '../logos/Kosas/Kosas.png'},
]

# Read the template
template_path = '../collections/huda-beauty.html'
output_dir = '../collections'

with open(template_path, 'r', encoding='utf-8') as f:
    template = f.read()

# Generate each brand page
for brand in brands:
    output_path = os.path.join(output_dir, brand['file'])
    
    # Skip huda-beauty.html and sephora.html as they are the template and manually created
    if brand['file'] in ['huda-beauty.html', 'sephora.html']:
        print(f"Skipped (already exists): {brand['file']}")
        continue
    
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
