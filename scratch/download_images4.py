import urllib.request
import os

urls = {
    "h3.jpg": "https://m.media-amazon.com/images/I/71p0Wf489yL._SX522_.jpg",
    "h4.jpg": "https://m.media-amazon.com/images/I/51rPq4n9S0L._SX522_.jpg",
    "n1.jpg": "https://m.media-amazon.com/images/I/610P06uW-KL._SX522_.jpg",
    "n2.jpg": "https://m.media-amazon.com/images/I/51eYk5E8TPL._SX522_.jpg",
    "n3.jpg": "https://m.media-amazon.com/images/I/61D15YJq9WL._SX522_.jpg",
    "n4.jpg": "https://m.media-amazon.com/images/I/61I2o811dFL._SX522_.jpg"
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
