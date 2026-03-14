
import time

class TTLCache:
    def __init__(self, ttl=180):
        self.ttl = ttl
        self._store = {}

    def get(self, key):
        row = self._store.get(key)
        if not row:
            return None
        exp, value = row
        if exp < time.time():
            self._store.pop(key, None)
            return None
        return value

    def set(self, key, value, ttl=None):
        self._store[key] = (time.time() + (ttl or self.ttl), value)

    def clear(self):
        self._store.clear()

    def size(self):
        return len(self._store)
