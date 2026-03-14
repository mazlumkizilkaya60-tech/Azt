
import threading, requests

def fetch(url, callback):
    def run():
        try:
            r = requests.get(url,timeout=10)
            callback(r.json())
        except:
            callback(None)
    threading.Thread(target=run,daemon=True).start()
