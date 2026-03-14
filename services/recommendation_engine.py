
import random

def recommend(items, limit=12):
    if not items:
        return []
    if len(items) <= limit:
        return items
    return random.sample(items, limit)
