
FIRATFLIX MASTER ENGINE v2

Bu paket, kullanıcının çalışan firatflix_lampa_core projesi üstüne geliştirilmiştir.

Eklenenler:
- gerçek cache katmanı (services/cache.py)
- provider engine + xtream provider (core/provider_engine.py, providers/xtream.py)
- tmdb entegrasyon hook'u (providers/tmdb.py)
- series için sonraki bölüm üretimi
- m3u8 playlist rewrite proxy desteği
- favicon ve cache temizleme endpointi

Yeni endpointler:
- /cache/clear
- /health
