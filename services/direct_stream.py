
def choose_playback(proxy_url, raw_url):
    # If proxy fails or mkv large file, player may fallback to direct stream
    if raw_url and raw_url.endswith(".mkv"):
        return raw_url
    return proxy_url or raw_url
