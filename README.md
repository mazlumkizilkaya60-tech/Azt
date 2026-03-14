# FIRATFLIX Lampa Style

Lampa / Netflix hissine yakın, TV kumanda odaklı Flask tabanlı IPTV arayüzü.

## Özellikler
- Lampa tarzı selector + focus navigation
- TV kumanda yön tuşları desteği
- Netflix / OTT benzeri hero + rail görünümü
- Tek player: live / vod / series
- HLS.js desteği
- Android TV browser / WebOS browser uyumlu web arayüz
- Xtream Codes API üzerinden içerik çekme

## Kurulum

```bash
pip install -r requirements.txt
python app.py
```

Sunucu varsayılan olarak `http://127.0.0.1:5001` üzerinde açılır.

## Ortam değişkenleri
İstersen sabit kullanıcı adı / şifre yerine şunları verebilirsin:

```bash
export IPTV_BASE_URL="http://ornek:8080"
export IPTV_USER="kullanici"
export IPTV_PASS="sifre"
```

## Notlar
- Bu proje kullanıcı tarafından sağlanan Xtream Codes API bilgileriyle çalışır.
- Arayüz TV odaklıdır; ok tuşları + Enter + Backspace/Escape ile rahat kullanım hedeflenmiştir.
