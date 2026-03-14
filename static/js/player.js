
(function(){
  'use strict';

  var cfg = window.playerConfig || {};
  var video = document.getElementById('video');
  var shell = document.getElementById('playerShell');
  var playPause = document.getElementById('playPause');
  var seekBack = document.getElementById('seekBack');
  var seekForward = document.getElementById('seekForward');
  var muteBtn = document.getElementById('muteBtn');
  var nextEpisodeBtn = document.getElementById('nextEpisodeBtn');
  var pipBtn = document.getElementById('pipBtn');
  var fsBtn = document.getElementById('fsBtn');
  var playerBack = document.getElementById('playerBack');
  var playerStatus = document.getElementById('playerStatus');
  var playerBar = document.getElementById('playerBar');
  var playerBuffer = document.getElementById('playerBuffer');
  var currentTimeEl = document.getElementById('currentTime');
  var durationTimeEl = document.getElementById('durationTime');
  var playerTimeline = document.getElementById('playerTimeline');
  var bigPlay = document.getElementById('bigPlay');
  var bigPlayBtn = document.getElementById('bigPlayBtn');
  var retryBtn = document.getElementById('retryBtn');
  var reconnectBtn = document.getElementById('reconnectBtn');
  var directBtn = document.getElementById('directBtn');
  var copyUrlBtn = document.getElementById('copyUrlBtn');
  var playerError = document.getElementById('playerError');
  var playerErrorText = document.getElementById('playerErrorText');

  var hls = null;
  var hideTimer = null;
  var focusNav = new TVSpatialNavigator();
  var sourceIndex = 0;
  var retryCount = 0;
  var maxRetryPerSource = 2;
  var continueTimer = null;

  function q(sel, root){ return (root || document).querySelector(sel); }

  function fmt(sec){
    if(sec == null || isNaN(sec)) return '00:00';
    sec = Math.floor(sec);
    var h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
    if(h > 0) return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function setStatus(t){ if(playerStatus) playerStatus.textContent = t || ''; }

  function getSources(){
    var list = [];
    if(cfg.playbackUrl) list.push({ url: cfg.playbackUrl, kind: 'proxy' });
    if(cfg.rawUrl && cfg.rawUrl !== cfg.playbackUrl) list.push({ url: cfg.rawUrl, kind: 'direct' });

    if(/\.mkv(\?|$)/i.test(cfg.rawUrl || '') && cfg.rawUrl){
      list = [{ url: cfg.rawUrl, kind: 'direct' }].concat(list.filter(function(x){ return x.url !== cfg.rawUrl; }));
    }

    var unique = [];
    var seen = {};
    list.forEach(function(s){
      if(s.url && !seen[s.url]){
        seen[s.url] = true;
        unique.push(s);
      }
    });
    return unique;
  }

  var sources = getSources();

  function currentSource(){
    return sources[sourceIndex] || null;
  }

  function showError(t){
    playerErrorText.textContent = t || 'Kaynak açılamadı';
    playerError.hidden = false;
    refreshNav(playerError);
    setStatus('Hata');
  }

  function hideError(){
    playerError.hidden = true;
    refreshNav(document);
  }

  function refreshNav(scope){
    var items = Array.from((scope || document).querySelectorAll('.selector')).filter(function(el){
      return !el.closest('[hidden]') && !el.hidden;
    });
    focusNav.setCollection(items);
    if(items.length) focusNav.focus(items[0]);
  }

  focusNav.on('focus', function(e){ if(e.elem) e.elem.classList.add('focus'); });
  focusNav.on('unfocus', function(e){ if(e.elem) e.elem.classList.remove('focus'); });

  function destroyHls(){
    if(hls){
      try{ hls.destroy(); }catch(e){}
      hls = null;
    }
  }

  function restoreProgress(){
    try{
      var key = 'ff_progress_' + (cfg.mode || 'movies') + '_' + (cfg.itemId || cfg.title || 'unknown');
      var raw = localStorage.getItem(key);
      if(!raw) return;
      var progress = JSON.parse(raw);
      if(progress && progress.time && video.duration && progress.time < (video.duration - 30)){
        video.currentTime = progress.time;
      }
    }catch(e){}
  }

  function saveProgress(){
    try{
      if(!video || !cfg.itemId || !isFinite(video.currentTime) || video.currentTime <= 0) return;
      var key = 'ff_progress_' + (cfg.mode || 'movies') + '_' + (cfg.itemId || cfg.title || 'unknown');
      localStorage.setItem(key, JSON.stringify({ time: Math.floor(video.currentTime), ts: Date.now() }));
    }catch(e){}
  }

  function postContinue(){
    try{
      if(!cfg.itemId || !isFinite(video.currentTime) || video.currentTime <= 0) return;
      fetch('/continue', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          id: cfg.itemId,
          title: cfg.title,
          pos: Math.floor(video.currentTime),
          mode: cfg.mode
        })
      }).catch(function(){});
    }catch(e){}
  }

  function updateButtons(){
    playPause.textContent = video.paused ? 'PLAY' : 'PAUSE';
    muteBtn.textContent = video.muted || video.volume === 0 ? 'UNMUTE' : 'MUTE';
    if(nextEpisodeBtn) nextEpisodeBtn.hidden = !cfg.nextEpisodeUrl;
  }

  function showUi(){
    shell.classList.remove('player-shell--immersive');
    clearTimeout(hideTimer);
  }

  function hideUiLater(){
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function(){
      if(!video.paused && !playerError.hidden){
        return;
      }
      if(!video.paused){
        shell.classList.add('player-shell--immersive');
      }
    }, 3500);
  }

  function play(){
    var p = video.play();
    if(p && typeof p.catch === 'function'){
      p.catch(function(){
        setStatus('Oynatma beklemede');
        bigPlay.hidden = false;
      });
    }
  }

  function attachSource(src){
    if(!src || !src.url){
      showError('Geçerli kaynak bulunamadı');
      return;
    }

    hideError();
    retryCount = 0;
    destroyHls();
    bigPlay.hidden = true;
    setStatus(src.kind === 'direct' ? 'Direkt kaynak bağlanıyor' : 'Proxy kaynak bağlanıyor');

    try{
      video.pause();
      video.removeAttribute('src');
      video.load();
    }catch(e){}

    var isHls = /\.m3u8(\?|$)/i.test(src.url);

    if(isHls && window.Hls && window.Hls.isSupported()){
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90
      });

      hls.loadSource(src.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, function(){
        restoreProgress();
        play();
        setStatus('HLS hazır');
      });

      hls.on(Hls.Events.ERROR, function(evt, data){
        if(data && data.fatal){
          handlePlaybackFailure('HLS akış hatası');
        }
      });
    } else {
      video.src = src.url;
      video.load();
      setStatus('Kaynak yükleniyor');
    }
  }

  function tryNextSource(){
    if(sourceIndex + 1 < sources.length){
      sourceIndex += 1;
      attachSource(sources[sourceIndex]);
      return true;
    }
    return false;
  }

  function handlePlaybackFailure(msg){
    setStatus(msg || 'Akış hatası');

    if(retryCount < maxRetryPerSource){
      retryCount += 1;
      setStatus('Yeniden deneniyor (' + retryCount + '/' + maxRetryPerSource + ')');
      setTimeout(function(){
        attachSource(currentSource());
      }, 1200);
      return;
    }

    if(tryNextSource()){
      setStatus('Yedek kaynak deneniyor');
      return;
    }

    showError('Akış bağlantısı koptu. Tekrar dene veya direkt kaynağa geç.');
    bigPlay.hidden = false;
  }

  playPause.addEventListener('click', function(){
    showUi();
    if(video.paused) play();
    else video.pause();
    updateButtons();
    hideUiLater();
  });

  bigPlayBtn.addEventListener('click', function(){
    playPause.click();
  });

  seekBack.addEventListener('click', function(){
    showUi();
    video.currentTime = Math.max(0, (video.currentTime || 0) - 10);
    hideUiLater();
  });

  seekForward.addEventListener('click', function(){
    showUi();
    if(isFinite(video.duration)){
      video.currentTime = Math.min(video.duration, (video.currentTime || 0) + 10);
    }else{
      video.currentTime = (video.currentTime || 0) + 10;
    }
    hideUiLater();
  });

  muteBtn.addEventListener('click', function(){
    showUi();
    if(video.muted || video.volume === 0){
      video.muted = false;
      if(video.volume === 0) video.volume = 1;
    }else{
      video.muted = true;
    }
    updateButtons();
    hideUiLater();
  });

  if(nextEpisodeBtn){
    nextEpisodeBtn.addEventListener('click', function(){
      if(cfg.nextEpisodeUrl) window.location.href = cfg.nextEpisodeUrl;
    });
  }

  pipBtn.addEventListener('click', function(){
    if(document.pictureInPictureEnabled && !video.disablePictureInPicture){
      if(document.pictureInPictureElement){
        document.exitPictureInPicture().catch(function(){});
      } else {
        video.requestPictureInPicture().catch(function(){});
      }
    }
  });

  fsBtn.addEventListener('click', function(){
    if(document.fullscreenElement){
      document.exitFullscreen().catch(function(){});
    } else {
      shell.requestFullscreen().catch(function(){});
    }
  });

  playerBack.addEventListener('click', function(){
    window.history.back();
  });

  retryBtn.addEventListener('click', function(){
    hideError();
    retryCount = 0;
    attachSource(currentSource());
  });

  if(reconnectBtn){
    reconnectBtn.addEventListener('click', function(){
      hideError();
      retryCount = 0;
      sourceIndex = 0;
      attachSource(currentSource());
    });
  }

  if(directBtn){
    directBtn.addEventListener('click', function(){
      var directIndex = sources.findIndex(function(x){ return x.kind === 'direct'; });
      if(directIndex >= 0){
        hideError();
        sourceIndex = directIndex;
        retryCount = 0;
        attachSource(currentSource());
      }
    });
  }

  copyUrlBtn.addEventListener('click', function(){
    var src = currentSource();
    var text = (src && src.url) || cfg.rawUrl || cfg.playbackUrl || '';
    if(navigator.clipboard && text){
      navigator.clipboard.writeText(text).then(function(){
        setStatus('URL kopyalandı');
      }).catch(function(){
        setStatus('URL kopyalanamadı');
      });
    }
  });

  playerTimeline.addEventListener('click', function(e){
    var rect = playerTimeline.getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if(video.duration) video.currentTime = pct * video.duration;
    showUi();
    hideUiLater();
  });

  video.addEventListener('loadedmetadata', function(){
    try{
      if(video.volume < 0.1) video.volume = 1;
      video.muted = false;
    }catch(e){}
    restoreProgress();
    setStatus('Kaynak hazır');
    updateButtons();
  });

  video.addEventListener('canplay', function(){
    if(video.paused && video.currentTime === 0){
      play();
    }
  });

  video.addEventListener('timeupdate', function(){
    currentTimeEl.textContent = fmt(video.currentTime);
    durationTimeEl.textContent = fmt(video.duration);
    if(video.duration) playerBar.style.width = ((video.currentTime / video.duration) * 100) + '%';
  });

  video.addEventListener('progress', function(){
    try{
      if(video.duration && video.buffered.length){
        var end = video.buffered.end(video.buffered.length - 1);
        playerBuffer.style.width = Math.min(100, (end / video.duration) * 100) + '%';
      }
    }catch(e){}
  });

  video.addEventListener('playing', function(){
    bigPlay.hidden = true;
    updateButtons();
    setStatus('Oynatılıyor');
    hideUiLater();
  });

  video.addEventListener('pause', function(){
    updateButtons();
    if(video.currentTime > 0 && !video.ended){
      bigPlay.hidden = false;
      setStatus('Duraklatıldı');
    }
  });

  video.addEventListener('waiting', function(){
    setStatus('Önbellekleniyor');
  });

  video.addEventListener('stalled', function(){
    setStatus('Bağlantı yavaşladı');
  });

  video.addEventListener('ended', function(){
    saveProgress();
    postContinue();
    setStatus('Bitti');
    if(nextEpisodeBtn && cfg.nextEpisodeUrl){
      nextEpisodeBtn.hidden = false;
      bigPlay.hidden = false;
    }
  });

  video.addEventListener('error', function(){
    handlePlaybackFailure('Akış bağlantısı koptu');
  });

  ['mousemove','keydown','click','touchstart'].forEach(function(evt){
    document.addEventListener(evt, function(){
      showUi();
      hideUiLater();
    }, true);
  });

  continueTimer = setInterval(function(){
    if(!video.paused){
      saveProgress();
      postContinue();
    }
  }, 5000);

  TVRemote.bind(function(action){
    if(!playerError.hidden){
      if(action === 'back'){
        playerError.hidden = true;
        refreshNav(document);
        return;
      }
      if(action === 'left' || action === 'right' || action === 'up' || action === 'down'){
        focusNav.move(action);
        return;
      }
      if(action === 'enter'){
        var focused = focusNav.getFocusedElement();
        if(focused) focused.click();
        return;
      }
      return;
    }

    if(action === 'left'){ seekBack.click(); return; }
    if(action === 'right'){ seekForward.click(); return; }
    if(action === 'up'){
      video.volume = Math.min(1, (video.volume || 1) + 0.1);
      video.muted = false;
      updateButtons();
      showUi();
      hideUiLater();
      return;
    }
    if(action === 'down'){
      video.volume = Math.max(0, (video.volume || 1) - 0.1);
      if(video.volume === 0) video.muted = true;
      updateButtons();
      showUi();
      hideUiLater();
      return;
    }
    if(action === 'enter' || action === 'playpause'){ playPause.click(); return; }
    if(action === 'play'){ if(video.paused) playPause.click(); return; }
    if(action === 'pause'){ if(!video.paused) playPause.click(); return; }
    if(action === 'back'){ window.history.back(); return; }
    if(action === 'ff'){ seekForward.click(); return; }
    if(action === 'rw'){ seekBack.click(); return; }
  });

  document.addEventListener('DOMContentLoaded', function(){
    refreshNav(document);
    if(nextEpisodeBtn) nextEpisodeBtn.hidden = !cfg.nextEpisodeUrl;
    if(directBtn) directBtn.hidden = !sources.some(function(x){ return x.kind === 'direct'; });
    attachSource(currentSource());
    updateButtons();
    showUi();
    hideUiLater();
  });
})();
