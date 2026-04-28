import urllib.request
import os

urls = {
    "h1.jpg": "https://www.sephora.com/productimages/sku/s2413342-main-zoom.jpg",
    "h2.jpg": "https://www.sephora.com/productimages/sku/s2090157-main-zoom.jpg",
    "h3.jpg": "https://hudabeauty.com/on/demandware.static/-/Sites-master-catalog-huda/default/dwb70b5514/images/makeup/eyes/palettes/empowered/empowered-eyeshadow-palette-hero.jpg",
    "h4.jpg": "https://hudabeauty.com/on/demandware.static/-/Sites-master-catalog-huda/default/dw1bf91a13/images/makeup/lips/liquid-lipstick/liquid-matte-ultra-comfort-transfer-proof-lipstick/liquid-matte-ultra-comfort-transfer-proof-lipstick-bombshell.jpg",
    "n1.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dw83d7f9cc/ProductImages/Eyes/Epic_Ink_Liner/epicinkliner_main.jpg",
    "n2.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dwf743a131/ProductImages/Lips/Soft_Matte_Lip_Cream/softmattelipcream_main.jpg",
    "n3.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dw066a503a/ProductImages/Face/Bare_With_Me_Concealer_Serum/barewithmeconcealerserum_main.jpg",
    "n4.jpg": "https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyx-master-catalog/default/dwec5bb5d2/ProductImages/Eyes/Ultimate_Shadow_Palette/ultimateshadowpalette_main.jpg"
}

os.makedirs("img", exist_ok=True)

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'})
        with urllib.request.urlopen(req) as response:
            with open(f"img/{name}", 'wb') as f:
                f.write(response.read())
        print(f"Downloaded {name}")
    except Exception as e:
        print(f"Failed {name}: {e}")
