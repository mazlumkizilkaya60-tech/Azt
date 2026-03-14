
class NexusMetadata:
    def merge(self, base_item, tmdb_item=None):
        tmdb_item = tmdb_item or {}
        out = dict(base_item)
        if tmdb_item.get('poster'):
            out['img'] = tmdb_item['poster']
        if tmdb_item.get('overview'):
            out['desc'] = tmdb_item['overview']
        if tmdb_item.get('rating'):
            out['rating'] = tmdb_item['rating']
        return out
