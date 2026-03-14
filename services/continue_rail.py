
import json, os

FILE = "continue_watch.json"

def rail():
    if not os.path.exists(FILE):
        return []
    try:
        data = json.load(open(FILE,"r",encoding="utf-8"))
        return data[:12]
    except:
        return []
