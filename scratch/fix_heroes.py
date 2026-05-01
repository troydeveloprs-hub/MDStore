import os
import re

collections_dir = 'collections'
mapping = {
    'makeup': '../img/makeup-banner.jpeg',
    'skincare': '../img/skincare-banner.jpg',
    'fragrance': '../img/spray.jpg',
    'hair': '../imghero/4.jpeg',
    'new-in': '../imghero/3.jpeg',
    'bestsellers': '../imghero/5.jpeg',
    'bath-body': '../imghero/6.jpeg',
    'nail': '../imghero/7.jpeg'
}

makeup_sub = ['foundation', 'concealer', 'face-primer', 'bb-cc-cream', 'contour', 'highlighter', 'setting-spray', 'eye-palettes', 'mascara', 'eyeliner', 'eyebrow', 'lipstick', 'lip-gloss', 'makeup-palettes', 'clean-makeup', 'brushes-applicators', 'makeup-accessories']
skincare_sub = ['night-creams', 'face-oils', 'mists-essences', 'sunscreen', 'face-sunscreen', 'body-sunscreen', 'face-wash', 'exfoliators', 'makeup-removers', 'face-wipes', 'toners', 'face-serums', 'blemish-treatments', 'peels', 'masks', 'face-masks', 'sheet-masks', 'eye-care', 'eye-creams', 'eye-masks', 'lip-balms', 'acne', 'anti-aging', 'dark-spots', 'pores', 'dryness', 'fine-lines', 'dullness']

for filename in os.listdir(collections_dir):
    if filename.endswith('.html'):
        path = os.path.join(collections_dir, filename)
        slug = filename.replace('.html', '').lower()
        
        target_img = '../img/whatsapp image 2026-04-26 at 11.32.45 pm.jpeg'
        if slug in mapping:
            target_img = mapping[slug]
        elif slug in makeup_sub:
            target_img = mapping['makeup']
        elif slug in skincare_sub:
            target_img = mapping['skincare']
            
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace the placeholder img path (handling both img/ and ../img/ just in case)
        new_content = re.sub(r'src="(\.\./)?img/WhatsApp Image 2026-04-26 at 11\.32\.45 PM\.jpeg"', f'src="{target_img}"', content, flags=re.IGNORECASE)
        
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Updated {filename} with {target_img}')
