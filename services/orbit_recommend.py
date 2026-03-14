
import random

def recommend(items, history=None, limit=20):
    if not items:
        return []

    history = history or []
    pool = [i for i in items if i.get("id") not in history]

    if len(pool) < limit:
        pool = items

    return random.sample(pool, min(limit, len(pool)))
