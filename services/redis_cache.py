
import os, json
try:
    import redis
except:
    redis = None

REDIS_URL = os.getenv("REDIS_URL","redis://localhost:6379/0")

class RedisCache:

    def __init__(self):
        self.client = None
        if redis:
            try:
                self.client = redis.from_url(REDIS_URL)
            except:
                self.client = None

    def get(self,key):
        if not self.client: return None
        val = self.client.get(key)
        if not val: return None
        return json.loads(val)

    def set(self,key,val,ttl=300):
        if not self.client: return
        self.client.setex(key, ttl, json.dumps(val))

cache = RedisCache()
