import urllib.request
import urllib.parse
import json
import re
import os

queries = {
    "huda_foundation.jpg": "Huda Beauty FauxFilter Foundation sephora",
    "huda_powder.jpg": "Huda Beauty Easy Bake Loose Powder",
    "huda_palette.jpg": "Huda Beauty Empowered Eyeshadow Palette open",
    "huda_lipstick.jpg": "Huda Beauty Liquid Matte Ultra-Comfort Lipstick bombshell",
    "nyx_eyeliner.jpg": "NYX Epic Ink Vegan Waterproof Liquid Eyeliner black",
    "nyx_lipcream.jpg": "NYX Soft Matte Lip Cream abu dhabi",
    "nyx_concealer.jpg": "NYX Bare With Me Concealer Serum",
    "nyx_palette.jpg": "NYX Ultimate Shadow Palette warm neutrals"
}

def get_image(query, filename):
    try:
        url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query + " image")
        req = urllib.request.Request(
            url, 
            data=None, 
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        response = urllib.request.urlopen(req)
        html = response.read().decode('utf-8')
        
        # Find image urls in vqd or src
        matches = re.findall(r'src="(//external-content\.duckduckgo\.com/iu/\?u=.*?)"', html)
        if matches:
            img_url = "https:" + matches[0]
            # Replace html entities
            img_url = img_url.replace('&amp;', '&')
            
            print(f"Downloading {filename} from {img_url}")
            img_req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(img_req) as response_img, open(f"img/{filename}", 'wb') as out_file:
                data = response_img.read()
                out_file.write(data)
            print(f"Success: {filename}")
        else:
            print(f"Failed to find image for {query}")
    except Exception as e:
        print(f"Error for {query}: {e}")

os.makedirs("img", exist_ok=True)
for filename, query in queries.items():
    get_image(query, filename)
