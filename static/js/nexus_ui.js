
(function(){
  function q(sel, root){ return (root || document).querySelector(sel); }

  function renderContinue(items){
    var rail = q('#nexusContinueRail');
    if(!rail || !items || !items.length) return;
    rail.hidden = false;
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
      card.innerHTML = '<div class="poster-card__meta"><div class="poster-card__title">' + (item.title || '') + '</div><div class="poster-card__sub">Kaldığın yer: ' + (item.pos || 0) + ' sn</div></div>';
      body.appendChild(card);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    fetch('/api/continue').then(function(r){ return r.json(); }).then(function(data){
      renderContinue((data && data.items) || []);
    }).catch(function(){});
  });
})();
