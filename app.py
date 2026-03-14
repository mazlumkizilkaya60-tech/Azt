
import os
import random
import re
from urllib.parse import quote, urlparse, urljoin

import requests
from requests.exceptions import ChunkedEncodingError, ConnectionError as RequestsConnectionError
from flask import Flask, render_template, request, jsonify, Response, stream_with_context, send_from_directory

from services.cache import TTLCache
from core.provider_engine import ProviderEngine
from providers.xtream import XtreamProvider
from providers.tmdb import TMDBProvider
from providers.tmdb_real import TMDBProvider as TMDBReal
from services.continue_watch import save_progress, list_items

app = Flask(__name__)

BASE_URL = os.getenv('IPTV_BASE_URL', 'http://xbluex5k.xyz:8080').rstrip('/')
USER = os.getenv('IPTV_USER', 'asan8442')
PASS = os.getenv('IPTV_PASS', '6748442')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Connection': 'keep-alive'
})

cache = TTLCache(ttl=180)
providers = ProviderEngine()

def safe_int(v, default=0):
    try:
        return int(v)
    except Exception:
        return default

def newest_key(item):
    for k in ('added', 'created', 'date', 'timestamp'):
        if item.get(k):
            return safe_int(item.get(k), 0)
    for k in ('stream_id', 'series_id', 'id'):
        if item.get(k):
            return safe_int(item.get(k), 0)
    return 0

def strict_http_url(target: str) -> bool:
    try:
        p = urlparse(target)
        return p.scheme in ('http', 'https')
    except Exception:
        return False

def image_of(item):
    return (
        item.get('stream_icon')
        or item.get('cover')
        or item.get('cover_big')
        or 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="%23111"/><text x="50%" y="50%" fill="%23fff" font-family="Segoe UI, Arial" font-size="26" dominant-baseline="middle" text-anchor="middle">Resim Yok</text></svg>'
    )

def build_stream_url(mode: str, item_id: str, ext: str = 'mp4'):
    item_id = str(item_id)
    if mode == 'live':
        return f"{BASE_URL}/live/{USER}/{PASS}/{item_id}.ts"
    if mode == 'series':
        return f"{BASE_URL}/series/{USER}/{PASS}/{item_id}.{ext or 'mp4'}"
    return f"{BASE_URL}/movie/{USER}/{PASS}/{item_id}.{ext or 'mp4'}"

def normalize_vod_item(item):
    sid = str(item.get('stream_id') or item.get('id') or '')
    ext = item.get('container_extension', 'mp4')
    return {
        'id': sid,
        'title': item.get('name', 'İsimsiz'),
        'img': image_of(item),
        'desc': item.get('description') or item.get('plot') or item.get('info') or '',
        'year': str(item.get('year') or '')[:4],
        'rating': item.get('rating') or item.get('imdb_rating') or '',
        'genre': item.get('genre') or '',
        'mode': 'movies',
        'url': build_stream_url('movies', sid, ext),
    }

def normalize_live_item(item):
    sid = str(item.get('stream_id') or item.get('id') or '')
    return {
        'id': sid,
        'title': item.get('name', 'Kanal'),
        'img': image_of(item),
        'desc': item.get('epg_channel_id') or 'Canlı yayın',
        'year': '',
        'rating': '',
        'genre': item.get('category_name') or '',
        'mode': 'live',
        'url': build_stream_url('live', sid, 'ts'),
    }

def normalize_series_item(item):
    sid = str(item.get('series_id') or item.get('id') or '')
    return {
        'id': sid,
        'title': item.get('name', 'Dizi'),
        'img': image_of(item),
        'desc': item.get('plot') or item.get('description') or item.get('info') or '',
        'year': str(item.get('year') or '')[:4],
        'rating': item.get('rating') or item.get('imdb_rating') or '',
        'genre': item.get('genre') or '',
        'mode': 'series',
        'url': '',
    }

def get_data(action: str, extra: str = '', ttl: int = 180):
    key = f'{action}:{extra}'
    cached = cache.get(key)
    if cached is not None:
        return cached
    url = f"{BASE_URL}/player_api.php?username={USER}&password={PASS}&action={action}{extra}"
    try:
        r = session.get(url, timeout=20)
        r.raise_for_status()
        data = r.json()
        cache.set(key, data, ttl=ttl)
        return data
    except Exception as e:
        print('API ERROR', action, e)
        return []

providers.register('xtream', XtreamProvider(get_data))
providers.register('tmdb', TMDBProvider())
xtream = providers.get('xtream')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/')
def landing():
    raw_vod = xtream.vod_streams()
    raw_series = xtream.series_streams()
    raw_live = xtream.live_streams()

    if isinstance(raw_vod, list):
        raw_vod = sorted(raw_vod, key=newest_key, reverse=True)
    if isinstance(raw_series, list):
        raw_series = sorted(raw_series, key=newest_key, reverse=True)
    if isinstance(raw_live, list):
        raw_live = sorted(raw_live, key=newest_key, reverse=True)

    hero_pool = [normalize_vod_item(x) for x in raw_vod[:30]]
    hero_items = random.sample(hero_pool, 8) if len(hero_pool) > 8 else hero_pool
    latest_movies = [normalize_vod_item(x) for x in raw_vod[:18]]
    trending_movies = [normalize_vod_item(x) for x in raw_vod[18:36]]
    popular_series = [normalize_series_item(x) for x in raw_series[:18]]
    live_channels = [normalize_live_item(x) for x in raw_live[:18]]

    return render_template(
        'landing.html',
        hero_items=hero_items,
        latest_movies=latest_movies,
        trending_movies=trending_movies,
        popular_series=popular_series,
        live_channels=live_channels,
    )

@app.route('/api/home')
def api_home():
    raw_vod = xtream.vod_streams()
    raw_series = xtream.series_streams()
    raw_live = xtream.live_streams()
    if isinstance(raw_vod, list):
        raw_vod = sorted(raw_vod, key=newest_key, reverse=True)
    if isinstance(raw_series, list):
        raw_series = sorted(raw_series, key=newest_key, reverse=True)
    if isinstance(raw_live, list):
        raw_live = sorted(raw_live, key=newest_key, reverse=True)
    return jsonify({
        'hero_items': [normalize_vod_item(x) for x in raw_vod[:8]],
        'latest_movies': [normalize_vod_item(x) for x in raw_vod[:18]],
        'trending_movies': [normalize_vod_item(x) for x in raw_vod[18:36]],
        'popular_series': [normalize_series_item(x) for x in raw_series[:18]],
        'live_channels': [normalize_live_item(x) for x in raw_live[:18]],
    })

@app.route('/browse')
def browse():
    mode = request.args.get('m', 'movies')
    cat_id = request.args.get('c', '')

    if mode == 'live':
        categories = xtream.live_categories()
        raw = xtream.live_streams(cat_id)
        items = [normalize_live_item(x) for x in raw[:250]]
    elif mode == 'series':
        categories = xtream.series_categories()
        raw = xtream.series_streams(cat_id)
        items = [normalize_series_item(x) for x in raw[:250]]
    else:
        categories = xtream.vod_categories()
        raw = xtream.vod_streams(cat_id)
        items = [normalize_vod_item(x) for x in raw[:250]]

    if isinstance(raw, list):
        raw.sort(key=newest_key, reverse=True)

    return render_template('browse.html', mode=mode, categories=categories, items=items, cat_id=str(cat_id))

@app.route('/api/series/<series_id>')
def series_details(series_id):
    data = xtream.series_info(series_id)
    result = {'id': series_id, 'seasons': []}
    episodes = data.get('episodes', {}) if isinstance(data, dict) else {}
    if not episodes:
        return jsonify(result)

    season_keys = sorted(episodes.keys(), key=lambda x: safe_int(str(x), 99999))
    for s in season_keys:
        eps = episodes.get(s, [])
        season = {'season_num': str(s), 'episodes': []}
        for ep in eps:
            eid = str(ep.get('id') or ep.get('episode_id') or '')
            ext = ep.get('container_extension', 'mp4')
            season['episodes'].append({
                'id': eid,
                'num': ep.get('episode_num') or '',
                'title': ep.get('title') or f'Bölüm {ep.get("episode_num") or ""}'.strip(),
                'url': build_stream_url('series', eid, ext),
            })
        result['seasons'].append(season)
    return jsonify(result)

@app.route('/search')
def search():
    q = request.args.get('q', '').strip().lower()
    out = {'results': []}
    if len(q) < 2:
        return jsonify(out)

    try:
        vod = xtream.vod_streams()
        series = xtream.series_streams()
        live = xtream.live_streams()

        results = []
        for x in vod[:300]:
            if q in (x.get('name', '').lower()):
                results.append(normalize_vod_item(x))
        for x in series[:250]:
            if q in (x.get('name', '').lower()):
                results.append(normalize_series_item(x))
        for x in live[:250]:
            if q in (x.get('name', '').lower()):
                results.append(normalize_live_item(x))

        out['results'] = results[:60]
    except Exception as e:
        print('SEARCH ERROR', e)

    return jsonify(out)

def compute_next_episode(series_id: str, item_id: str, title: str):
    if not series_id or not item_id:
        return ''
    data = xtream.series_info(series_id)
    episodes = data.get('episodes', {}) if isinstance(data, dict) else {}
    flat = []
    for season_num in sorted(episodes.keys(), key=lambda x: safe_int(str(x), 99999)):
        for ep in episodes.get(season_num, []):
            eid = str(ep.get('id') or ep.get('episode_id') or '')
            ext = ep.get('container_extension', 'mp4')
            flat.append({
                'id': eid,
                'title': ep.get('title') or '',
                'episode_num': str(ep.get('episode_num') or ''),
                'season_num': str(season_num),
                'url': build_stream_url('series', eid, ext)
            })
    for i, ep in enumerate(flat):
        if ep['id'] == str(item_id) and i + 1 < len(flat):
            nxt = flat[i + 1]
            base_title = title.split(' - ')[0] if title else 'Bölüm'
            next_title = f"{base_title} - S{nxt['season_num']}E{nxt['episode_num']}"
            return '/player?mode=series&id=' + quote(nxt['id'], safe='') + '&title=' + quote(next_title, safe='') + '&url=' + quote(nxt['url'], safe='') + '&series_id=' + quote(str(series_id), safe='')
    return ''

@app.route('/player')
def player():
    title = request.args.get('title', '')
    url = request.args.get('url', '')
    item_id = request.args.get('id', '')
    mode = request.args.get('mode', 'movies')
    series_id = request.args.get('series_id', '')

    if not url and item_id:
        if mode == 'live':
            url = build_stream_url('live', item_id, 'ts')
        elif mode == 'series':
            url = build_stream_url('series', item_id, 'mp4')
        else:
            url = build_stream_url('movies', item_id, 'mp4')

    if not strict_http_url(url):
        return 'Oynatilacak URL eksik veya gecersiz', 400

    playback_url = '/proxy?url=' + quote(url, safe='')
    next_episode_url = compute_next_episode(series_id, item_id, title) if mode == 'series' else ''
    return render_template('player.html', url=url, playback_url=playback_url, title=title, item_id=item_id, mode=mode, series_id=series_id, next_episode_url=next_episode_url)

_M3U8_URI_RE = re.compile(r'URI="([^"]+)"')

def rewrite_m3u8(body: str, source_url: str) -> str:
    def repl(match):
        uri = match.group(1)
        full = urljoin(source_url, uri)
        return f'URI="/proxy?url={quote(full, safe="")}"'
    body = _M3U8_URI_RE.sub(repl, body)
    lines = []
    for line in body.splitlines():
        s = line.strip()
        if not s or s.startswith('#'):
            lines.append(line)
        else:
            lines.append('/proxy?url=' + quote(urljoin(source_url, s), safe=''))
    return '\n'.join(lines)


@app.route('/proxy')
def proxy():
    target = (request.args.get('url') or '').strip()
    if not strict_http_url(target):
        return 'Gecersiz URL', 400

    headers = {
        'User-Agent': request.headers.get('User-Agent', session.headers.get('User-Agent')),
        'Accept': request.headers.get('Accept', '*/*'),
        'Accept-Encoding': 'identity',
        'Connection': 'close',
    }
    if request.headers.get('Range'):
        headers['Range'] = request.headers.get('Range')

    try:
        upstream = session.get(target, stream=True, timeout=(10, 180), headers=headers, allow_redirects=True)
    except requests.RequestException as e:
        return f'Upstream hatasi: {e}', 502

    content_type = upstream.headers.get('Content-Type', '')
    path = urlparse(target).path.lower()
    is_m3u8 = '.m3u8' in path or 'application/vnd.apple.mpegurl' in content_type or 'application/x-mpegurl' in content_type
    if is_m3u8:
        try:
            text = upstream.text
            rewritten = rewrite_m3u8(text, upstream.url)
            upstream.close()
            return Response(rewritten, status=200, mimetype='application/vnd.apple.mpegurl', headers={'Cache-Control': 'no-store'})
        except Exception as e:
            upstream.close()
            return f'Playlist hatasi: {e}', 502

    # Avoid forwarding possibly incorrect Content-Length for long/unstable IPTV files.
    passthrough = ['Content-Type', 'Content-Range', 'Accept-Ranges', 'Cache-Control', 'ETag', 'Last-Modified']
    response_headers = {h: upstream.headers[h] for h in passthrough if h in upstream.headers}
    response_headers['Cache-Control'] = 'no-store'

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=64 * 1024):
                if chunk:
                    yield chunk
        except (ChunkedEncodingError, RequestsConnectionError, OSError) as e:
            print('PROXY STREAM WARNING', target, e)
            # End response gracefully; browser/player will usually reconnect with a new range request.
            return
        finally:
            try:
                upstream.close()
            except Exception:
                pass

    return Response(stream_with_context(generate()), status=upstream.status_code, headers=response_headers)

@app.route('/cache/clear')

def clear_cache():
    cache.clear()
    return jsonify({'ok': True, 'cache_items': cache.size()})


@app.route('/continue', methods=['GET'])
def continue_list():
    return jsonify(list_items())

@app.route('/continue', methods=['POST'])
def continue_save():
    data = request.json or {}
    save_progress(data)
    return jsonify({'ok':True})

@app.route('/api/continue')
def api_continue():
    try:
        from services.continue_watch import list_items
        return jsonify({'items': list_items()})
    except Exception as e:
        return jsonify({'items': [], 'error': str(e)})

@app.route('/api/epg/<channel_id>')
def api_epg(channel_id):
    try:
        from providers.epg import EPGProvider
        epg = EPGProvider().now_next(channel_id)
        return jsonify(epg)
    except Exception as e:
        return jsonify({'now': '', 'next': '', 'error': str(e)})

@app.route('/health')
def health():
    return jsonify({'ok': True, 'providers': providers.names(), 'cache_items': cache.size()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, threaded=True, debug=False)
