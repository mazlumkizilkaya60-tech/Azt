
from providers.tmdb_real import TMDBProvider

tmdb = TMDBProvider()

def enrich_items(items):
    enriched = []
    for item in items:
        meta = tmdb.search(item.get("title"))
        if meta.get("poster"):
            item["img"] = meta["poster"]
        if meta.get("overview"):
            item["desc"] = meta["overview"]
        if meta.get("rating"):
            item["rating"] = meta["rating"]
        enriched.append(item)
    return enriched
