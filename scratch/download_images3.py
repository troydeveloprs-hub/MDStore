import urllib.request
import os

urls = {
    "h3.jpg": "https://www.sephora.com/productimages/sku/s2618841-main-zoom.jpg",
    "h4.jpg": "https://www.sephora.com/productimages/sku/s2552940-main-zoom.jpg",
    "n1.jpg": "https://target.scene7.com/is/image/Target/GUEST_6b7a5a81-d14c-47bc-ad3a-e2cd8a64db9f",
    "n2.jpg": "https://target.scene7.com/is/image/Target/GUEST_bb5db4e9-11ba-411a-abaf-72083cfc0dd2",
    "n3.jpg": "https://target.scene7.com/is/image/Target/GUEST_c0bfa6f3-a75e-4c74-8b6b-4e00b84dfb5f",
    "n4.jpg": "https://target.scene7.com/is/image/Target/GUEST_51dbf217-ec32-4416-8c46-77e8a93fb428"
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
