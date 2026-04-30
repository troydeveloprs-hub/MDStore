import os

# New subcategories to create
new_categories = [
    {'file': 'lip-oil.html', 'name': 'Lip Oil', 'filter': 'Lip Oil'},
    {'file': 'lip-liner.html', 'name': 'Lip Liner', 'filter': 'Lip Liner'},
    {'file': 'lip-sets.html', 'name': 'Lip Sets', 'filter': 'Lip Sets'},
    {'file': 'lip-plumper.html', 'name': 'Lip Plumper', 'filter': 'Lip Plumper'},
    {'file': 'blush.html', 'name': 'Blush', 'filter': 'Blush'},
]

# Read template
template_path = '../collections/makeup.html'
output_dir = '../collections'

with open(template_path, 'r', encoding='utf-8') as f:
    template = f.read()

for category in new_categories:
    output_path = os.path.join(output_dir, category['file'])
    
    # Replace title
    content = template.replace('Makeup Collection — MDBoutiquee', f'{category["name"]} — MDBoutiquee')
    content = content.replace('Makeup Collection — MDBoutiquee', f'{category["name"]} — MDBoutiquee')
    content = content.replace('Shop premium makeup — face, eyes, lips, nails and more at MDBoutiquee.', f'Shop premium {category["name"]} products at MDBoutiquee.')
    content = content.replace('Shop premium makeup — face, eyes, lips, nails and more at MDBoutiquee.', f'Shop premium {category["name"]} products at MDBoutiquee.')
    content = content.replace('Makeup Collection — MDBoutiquee', f'{category["name"]} — MDBoutiquee')
    content = content.replace('Shop premium makeup — face, eyes, lips, nails and more at MDBoutiquee.', f'Shop premium {category["name"]} products at MDBoutiquee.')
    
    # Replace hero
    content = content.replace('Makeup collection', f'{category["name"]} collection')
    content = content.replace('<h1 class="page-hero-title">Makeup</h1>', f'<h1 class="page-hero-title">{category["name"]}</h1>')
    content = content.replace('<span class="breadcrumb-current">Makeup</span>', f'<span class="breadcrumb-current">{category["name"]}</span>')
    
    # Write the file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Created: {category['file']}")

print("All new subcategory pages created!")
