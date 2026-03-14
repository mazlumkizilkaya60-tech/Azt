
import os, requests, hashlib

CACHE_DIR = "poster_cache"

os.makedirs(CACHE_DIR, exist_ok=True)

def cache_poster(url):
    if not url:
        return url

    key = hashlib.md5(url.encode()).hexdigest() + ".jpg"
    path = os.path.join(CACHE_DIR, key)

    if os.path.exists(path):
        return "/poster_cache/" + key

    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            with open(path, "wb") as f:
                f.write(r.content)
            return "/poster_cache/" + key
    except:
        pass

    return url
