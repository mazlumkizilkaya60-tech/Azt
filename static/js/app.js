(function(){
  'use strict';

  var navigatorInstance = new TVSpatialNavigator();
  var currentModal = null;
  var focusedBeforeModal = null;
  var heroIndex = 0;
  var heroTimer = null;

  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

  function allSelectors(root){
    return qa('.selector', root || document).filter(function(el){
      return !el.closest('[hidden]');
    });
  }

  function applyFocusHooks(){
    navigatorInstance.on('focus', function(e){
      if(!e.elem) return;
      e.elem.classList.add('focus');
      if(typeof e.elem.focus === 'function') e.elem.focus({ preventScroll:true });
      try{ e.elem.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'smooth' }); }catch(err){}
    });
    navigatorInstance.on('unfocus', function(e){
      if(!e.elem) return;
      e.elem.classList.remove('focus');
    });
  }

  function refreshNavigation(scope, preferred){
    var collection = allSelectors(scope || document);
    navigatorInstance.setCollection(collection);
    if(preferred && collection.indexOf(preferred) !== -1){
      navigatorInstance.focus(preferred);
      return;
    }
    if(collection.length) navigatorInstance.focus(collection[0]);
  }

  function navigateTo(el){
    if(!el) return;
    var href = el.getAttribute('href') || el.dataset.href;
    if(href){ window.location.href = href; return; }
  }

  function openInfoModal(item){
    var modal = q('#infoModal');
    if(!modal) return;
    q('#infoModalTitle').textContent = item.title || '';
    q('#infoModalDesc').textContent = item.desc || 'Açıklama yok.';
    q('#infoModalImg').src = item.img || '';
    var watch = q('#infoWatch');
    watch.dataset.mode = item.mode || 'movies';
    watch.dataset.id = item.id || '';
    watch.dataset.url = item.url || '';
    watch.dataset.title = item.title || '';
    openModal(modal);
  }

  function openModal(modal){
    if(!modal) return;
    focusedBeforeModal = navigatorInstance.getFocusedElement();
    modal.hidden = false;
    currentModal = modal;
    refreshNavigation(modal);
  }

  function closeModal(id){
    var modal = typeof id === 'string' ? q('#' + id) : id;
    if(!modal) return;
    modal.hidden = true;
    currentModal = null;
    refreshNavigation(document, focusedBeforeModal);
  }

  function launchPlayback(data){
    var mode = data.mode || 'movies';
    var title = data.title || '';
    var id = data.id || '';
    var url = data.url || '';
    var qs = '/player?mode=' + encodeURIComponent(mode) + '&id=' + encodeURIComponent(id) + '&title=' + encodeURIComponent(title);
    if(url) qs += '&url=' + encodeURIComponent(url);
    if(data.seriesId) qs += '&series_id=' + encodeURIComponent(data.seriesId);
    window.location.href = qs;
  }

  function renderSearchResults(results){
    var root = q('#searchResults');
    if(!root) return;
    root.innerHTML = '';
    if(!results || !results.length){
      root.innerHTML = '<div class="search-empty">Sonuç bulunamadı.</div>';
      refreshNavigation(currentModal || document);
      return;
    }
    results.forEach(function(item){
      var el = document.createElement('article');
      el.className = 'grid-card selector';
      el.tabIndex = 0;
      el.dataset.action = 'open';
      el.dataset.mode = item.mode;
      el.dataset.id = item.id;
      el.dataset.title = item.title;
      el.dataset.url = item.url || '';
      el.dataset.desc = item.desc || '';
      el.dataset.img = item.img || '';
      el.innerHTML = '<div class="grid-card__poster"><img src="' + item.img + '" alt=""></div><div class="grid-card__title">' + item.title + '</div><div class="grid-card__sub">' + (item.year || item.genre || '') + '</div>';
      root.appendChild(el);
    });
    refreshNavigation(currentModal || document);
  }

  function doSearch(){
    var input = q('#searchInputModal');
    if(!input) return;
    var term = (input.value || '').trim();
    if(term.length < 2){ renderSearchResults([]); return; }
    fetch('/search?q=' + encodeURIComponent(term)).then(function(r){ return r.json(); }).then(function(data){
      renderSearchResults(data.results || []);
    }).catch(function(){ renderSearchResults([]); });
  }

  function filterGrid(value){
    qa('.grid-card').forEach(function(card){
      var name = (card.dataset.name || '').toLowerCase();
      card.hidden = value && name.indexOf(value.toLowerCase()) === -1;
    });
    refreshNavigation(document);
  }

  function startHero(){
    if(!window.heroItems || !window.heroItems.length) return;
    var title = q('#heroTitle'), desc = q('#heroDesc'), hero = q('#hero');
    var play = q('#heroPlay'), info = q('#heroInfo');

    function show(i){
      var item = window.heroItems[i];
      if(!item) return;
      if(hero) hero.style.backgroundImage = 'url("' + item.img + '")';
      if(title) title.textContent = item.title || '';
      if(desc) desc.textContent = item.desc || '';
      if(play){
        play.dataset.mode = item.mode || 'movies';
        play.dataset.id = item.id || '';
        play.dataset.url = item.url || '';
        play.dataset.title = item.title || '';
      }
      if(info){
        info.dataset.mode = item.mode || 'movies';
        info.dataset.id = item.id || '';
        info.dataset.url = item.url || '';
        info.dataset.title = item.title || '';
        info.dataset.desc = item.desc || '';
        info.dataset.img = item.img || '';
      }
    }

    show(heroIndex);
    heroTimer = setInterval(function(){
      if(currentModal) return;
      heroIndex = (heroIndex + 1) % window.heroItems.length;
      show(heroIndex);
    }, 5500);
  }

  function openSeriesPicker(data, title, seriesId){
    var modal = q('#seriesModal');
    var seasonList = q('#seasonList');
    var episodeList = q('#episodeList');
    q('#seriesModalTitle').textContent = title || 'Sezonlar';
    seasonList.innerHTML = '';
    episodeList.innerHTML = '';

    function renderEpisodes(season){
      episodeList.innerHTML = '';
      (season.episodes || []).forEach(function(ep){
        var btn = document.createElement('button');
        btn.className = 'episode-btn selector';
        btn.textContent = 'Bölüm ' + (ep.num || '') + ' - ' + (ep.title || 'Bölüm');
        btn.dataset.action = 'episode';
        btn.dataset.mode = 'series';
        btn.dataset.seriesId = seriesId;
        btn.dataset.id = ep.id || '';
        btn.dataset.title = (title || '') + ' - S' + season.season_num + 'E' + (ep.num || '');
        btn.dataset.url = ep.url || '';
        episodeList.appendChild(btn);
      });
      refreshNavigation(modal);
    }

    (data.seasons || []).forEach(function(season, index){
      var btn = document.createElement('button');
      btn.className = 'series-btn selector';
      btn.textContent = 'Sezon ' + season.season_num;
      btn.addEventListener('click', function(){
        qa('.series-btn', seasonList).forEach(function(x){ x.classList.remove('is-active'); });
        btn.classList.add('is-active');
        renderEpisodes(season);
      });
      seasonList.appendChild(btn);
      if(index === 0){ setTimeout(function(){ btn.click(); }, 0); }
    });

    openModal(modal);
  }

  function handleOpenAction(el){
    var data = {
      mode: el.dataset.mode,
      id: el.dataset.id,
      title: el.dataset.title,
      url: el.dataset.url,
      desc: el.dataset.desc,
      img: el.dataset.img,
      seriesId: el.dataset.seriesId
    };

    if(data.mode === 'series' && !data.url){
      fetch('/api/series/' + encodeURIComponent(data.id))
        .then(function(r){ return r.json(); })
        .then(function(json){ openSeriesPicker(json, data.title, data.id); });
      return;
    }

    if(el.classList.contains('poster-card') || el.classList.contains('grid-card') || el.classList.contains('channel-card')){
      openInfoModal(data);
      return;
    }

    if(el.id === 'heroPlay' || el.id === 'infoWatch' || el.dataset.action === 'play' || el.dataset.action === 'episode'){
      launchPlayback(data);
      return;
    }

    if(el.id === 'heroInfo'){
      openInfoModal(data);
      return;
    }
  }

  function bindClicks(){
    document.addEventListener('click', function(e){
      var closeBtn = e.target.closest('[data-close-modal]');
      if(closeBtn){ closeModal(closeBtn.dataset.closeModal); return; }

      var actionEl = e.target.closest('.selector');
      if(!actionEl) return;

      if(actionEl.id === 'searchGo'){ doSearch(); return; }
      if(actionEl.id === 'sidebarToggle'){ document.body.classList.toggle('sidebar-open'); refreshNavigation(document, actionEl); return; }

      if(actionEl.dataset.href || actionEl.getAttribute('href')){ navigateTo(actionEl); return; }
      handleOpenAction(actionEl);
    });
  }

  function bindInputs(){
    var gridSearch = q('#gridSearch');
    if(gridSearch){
      gridSearch.addEventListener('input', function(){ filterGrid(this.value || ''); });
    }
    var searchInputModal = q('#searchInputModal');
    if(searchInputModal){
      searchInputModal.addEventListener('keydown', function(e){ if(e.key === 'Enter') doSearch(); });
    }
  }

  function bindRemote(){
    TVRemote.bind(function(action){
      if(currentModal){
        if(action === 'back'){ closeModal(currentModal); return; }
      }
      if(action === 'left' || action === 'right' || action === 'up' || action === 'down'){
        navigatorInstance.move(action);
        return;
      }
      if(action === 'enter'){
        var focused = navigatorInstance.getFocusedElement();
        if(focused) focused.click();
        return;
      }
      if(action === 'back'){
        if(window.pageMode === 'landing') return;
        window.history.back();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    applyFocusHooks();
    bindClicks();
    bindInputs();
    bindRemote();
    refreshNavigation(document);
    if(window.pageMode === 'landing') startHero();
  });
})();
