import urllib.request
import os

urls = {
    "h3.jpg": "https://images.ctfassets.net/69mcl786rkni/4qY7O9pQZ6y6o9E4I2y2oG/98d69f3f98e8f8e8f8e8f8e8f8e8f8e8/huda-beauty-empowered-palette.jpg", # Placeholder-like but specific if it works
    "h4.jpg": "https://images.ctfassets.net/69mcl786rkni/4qY7O9pQZ6y6o9E4I2y2oG/98d69f3f98e8f8e8f8e8f8e8f8e8f8e8/huda-beauty-lipstick.jpg",
    "n1.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dw83d7f9cc/ProductImages/Eyes/Epic_Ink_Liner/epicinkliner_main.jpg",
    "n2.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dwf743a131/ProductImages/Lips/Soft_Matte_Lip_Cream/softmattelipcream_main.jpg",
    "n3.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dw066a503a/ProductImages/Face/Bare_With_Me_Concealer_Serum/barewithmeconcealerserum_main.jpg",
    "n4.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dwec5bb5d2/ProductImages/Eyes/Ultimate_Shadow_Palette/ultimateshadowpalette_main.jpg"
}

# Those NYX ones failed before. Let's try to find more generic ones.
# Maybe using a search engine to get a direct link?
# Actually, I'll try to use a site like 'niceone' or 'boutiqaat' which are popular in the region and might have simpler URLs.

urls = {
    "h3.jpg": "https://media.allure.com/photos/632c86e00b5e40857329584b/master/pass/huda-beauty-empowered-palette.jpg",
    "h4.jpg": "https://media.allure.com/photos/616999661414164b85434771/master/pass/huda-beauty-liquid-matte-lipstick.jpg",
    "n1.jpg": "https://images.clothes.com/is/image/Clothes/6000000000123456?wid=800&hei=800", # No
    "n1.jpg": "https://www.makeup.com/-/media/project/loreal/brand-sites/makeup/americas/us/articles/2021/04-april/22-nyx-epic-ink-liner/best-eyeliner-for-beginners-hero.jpg",
    "n2.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dwf743a131/ProductImages/Lips/Soft_Matte_Lip_Cream/softmattelipcream_main.jpg",
    "n3.jpg": "https://www.makeup.com/-/media/project/loreal/brand-sites/makeup/americas/us/products/face/concealer/bare-with-me-concealer-serum/nyx-professional-makeup-face-concealer-bare-with-me-concealer-serum-01-fair-800x800.jpg",
    "n4.jpg": "https://www.makeup.com/-/media/project/loreal/brand-sites/makeup/americas/us/products/face/primer/the-marshmellow-primer/nyx-professional-makeup-face-primer-the-marshmellow-primer-800x800.jpg"
}

os.makedirs("img", exist_ok=True)

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            with open(f"img/{name}", 'wb') as f:
                f.write(response.read())
        print(f"Downloaded {name}")
    except Exception as e:
        print(f"Failed {name}: {e}")
