
import json, os, time

FILE = "continue_watch.json"

def _load():
    if not os.path.exists(FILE):
        return []
    try:
        return json.load(open(FILE,"r",encoding="utf-8"))
    except:
        return []

def _save(data):
    json.dump(data, open(FILE,"w",encoding="utf-8"))

def save_progress(item):
    data = _load()
    data = [x for x in data if x.get("id") != item.get("id")]
    item["ts"] = int(time.time())
    data.insert(0,item)
    _save(data[:50])

def list_items():
    return _load()
