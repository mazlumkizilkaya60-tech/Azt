
import time

class ProCache:

    def __init__(self, ttl=300):
        self.ttl = ttl
        self.store = {}

    def get(self, key):
        row = self.store.get(key)
        if not row:
            return None
        exp, val = row
        if exp < time.time():
            self.store.pop(key, None)
            return None
        return val

    def set(self, key, val, ttl=None):
        self.store[key] = (time.time() + (ttl or self.ttl), val)

    def clear(self):
        self.store.clear()
