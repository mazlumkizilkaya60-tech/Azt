(function(global){
  'use strict';
  var Remote = {
    match: function(e, vals){
      var key = e.key;
      var code = e.keyCode || e.which;
      return vals.indexOf(key) !== -1 || vals.indexOf(code) !== -1;
    },
    action: function(e){
      if(this.match(e, ['ArrowLeft', 37])) return 'left';
      if(this.match(e, ['ArrowRight', 39])) return 'right';
      if(this.match(e, ['ArrowUp', 38])) return 'up';
      if(this.match(e, ['ArrowDown', 40])) return 'down';
      if(this.match(e, ['Enter', 13])) return 'enter';
      if(this.match(e, ['Escape', 'Backspace', 8, 27, 461, 10009])) return 'back';
      if(this.match(e, ['MediaPlayPause', 179])) return 'playpause';
      if(this.match(e, ['MediaPlay', 415])) return 'play';
      if(this.match(e, ['MediaPause', 19])) return 'pause';
      if(this.match(e, ['MediaFastForward', 417, 228])) return 'ff';
      if(this.match(e, ['MediaRewind', 412, 227])) return 'rw';
      return null;
    },
    bind: function(handler){
      document.addEventListener('keydown', function(e){
        var action = Remote.action(e);
        if(!action) return;
        e.preventDefault();
        handler(action, e);
      }, true);
    }
  };
  global.TVRemote = Remote;
})(window);
