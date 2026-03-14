
(function(){
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

  function renderContinue(items){
    var rail = q('#nexusContinueRail');
    if(!rail || !items || !items.length) return;
    var body = rail.querySelector('.rail__body');
    body.innerHTML = '';
    items.forEach(function(item){
      var card = document.createElement('article');
      card.className = 'poster-card selector';
      card.tabIndex = 0;
      card.dataset.action = 'play';
      card.dataset.mode = item.mode || 'movies';
      card.dataset.id = item.id || '';
      card.dataset.title = item.title || '';
      card.innerHTML = '<div class="poster-card__meta"><div class="poster-card__title">' + (item.title || '') + '</div><div class="poster-card__sub">Devam: ' + (item.pos || 0) + ' sn</div></div>';
      body.appendChild(card);
    });
    rail.hidden = false;
  }

  function lazyPosters(){
    var imgs = qa('img[data-src]');
    if(!imgs.length) return;
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          obs.unobserve(img);
        }
      });
    }, {rootMargin:'180px'});
    imgs.forEach(function(img){ obs.observe(img); });
  }

  function loadEPG(){
    qa('.channel-grid-card__epg').forEach(function(el){
      var id = el.dataset.channelId;
      fetch('/api/epg/' + encodeURIComponent(id))
        .then(function(r){ return r.json(); })
        .then(function(data){
          var now = data.now || 'Program';
          var next = data.next || 'Sonraki';
          el.textContent = 'NOW: ' + now + ' • NEXT: ' + next;
        })
        .catch(function(){
          el.textContent = 'Program bilgisi yok';
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    fetch('/api/continue')
      .then(function(r){ return r.json(); })
      .then(function(data){ renderContinue((data && data.items) || []); })
      .catch(function(){});
    lazyPosters();
    loadEPG();
  });
})();
