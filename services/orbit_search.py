
import re

class OrbitSearch:

    def search(self, items, query):
        q = query.lower()
        results = []

        for item in items:
            title = (item.get("title") or "").lower()
            if q in title:
                results.append(item)

        return results[:50]
