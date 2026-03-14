
class XtreamProvider:
    def __init__(self, get_data_func):
        self.get_data = get_data_func

    def vod_categories(self):
        return self.get_data('get_vod_categories') or []

    def series_categories(self):
        return self.get_data('get_series_categories') or []

    def live_categories(self):
        return self.get_data('get_live_categories') or []

    def vod_streams(self, category_id=''):
        extra = f'&category_id={category_id}' if category_id else ''
        return self.get_data('get_vod_streams', extra) or []

    def series_streams(self, category_id=''):
        extra = f'&category_id={category_id}' if category_id else ''
        return self.get_data('get_series', extra) or []

    def live_streams(self, category_id=''):
        extra = f'&category_id={category_id}' if category_id else ''
        return self.get_data('get_live_streams', extra) or []

    def series_info(self, series_id):
        return self.get_data('get_series_info', f'&series_id={series_id}') or {}
