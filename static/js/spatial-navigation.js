(function(global){
  'use strict';

  function SpatialNavigator(){
    this._focus = null;
    this._previous = null;
    this._collection = [];
    this._listeners = {};
  }

  SpatialNavigator.prototype.straightOnly = true;
  SpatialNavigator.prototype.straightOverlapThreshold = 0.5;
  SpatialNavigator.prototype.ignoreHiddenElement = true;
  SpatialNavigator.prototype.rememberSource = true;

  SpatialNavigator.prototype.on = function(type, listener){
    if(!this._listeners[type]) this._listeners[type] = [];
    if(this._listeners[type].indexOf(listener) === -1) this._listeners[type].push(listener);
  };

  SpatialNavigator.prototype.emit = function(type, event){
    var arr = (this._listeners[type] || []).slice();
    for(var i=0;i<arr.length;i++) arr[i].call(this, event || {});
  };

  SpatialNavigator.prototype._isHidden = function(elem){
    if(!elem || elem.nodeType !== 1) return true;
    var style = window.getComputedStyle(elem);
    return (elem.offsetWidth <= 0 && elem.offsetHeight <= 0) || style.display === 'none' || style.visibility === 'hidden' || elem.getAttribute('aria-hidden') === 'true';
  };

  SpatialNavigator.prototype._isNavigable = function(elem){
    if(!elem) return false;
    if(this.ignoreHiddenElement && this._isHidden(elem)) return false;
    return true;
  };

  SpatialNavigator.prototype._getRect = function(elem){
    if(!this._isNavigable(elem)) return null;
    var r = elem.getBoundingClientRect();
    return {
      element: elem,
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      right: r.left + r.width,
      bottom: r.top + r.height,
      center: {
        x: r.left + Math.floor(r.width / 2),
        y: r.top + Math.floor(r.height / 2)
      }
    };
  };

  SpatialNavigator.prototype._partition = function(rects, targetRect){
    var groups = [[],[],[],[],[],[],[],[],[]];
    var threshold = this.straightOverlapThreshold;
    rects.forEach(function(rect){
      var x = rect.center.x < targetRect.left ? 0 : (rect.center.x <= targetRect.right ? 1 : 2);
      var y = rect.center.y < targetRect.top ? 0 : (rect.center.y <= targetRect.bottom ? 1 : 2);
      var groupId = y * 3 + x;
      groups[groupId].push(rect);
      if([0,2,6,8].indexOf(groupId) !== -1){
        if(rect.left <= targetRect.right - targetRect.width * threshold){ if(groupId===2) groups[1].push(rect); else if(groupId===8) groups[7].push(rect); }
        if(rect.right >= targetRect.left + targetRect.width * threshold){ if(groupId===0) groups[1].push(rect); else if(groupId===6) groups[7].push(rect); }
        if(rect.top <= targetRect.bottom - targetRect.height * threshold){ if(groupId===6) groups[3].push(rect); else if(groupId===8) groups[5].push(rect); }
        if(rect.bottom >= targetRect.top + targetRect.height * threshold){ if(groupId===0) groups[3].push(rect); else if(groupId===2) groups[5].push(rect); }
      }
    });
    return groups;
  };

  SpatialNavigator.prototype._distance = function(targetRect){
    return {
      nearPlumbLineIsBetter: function(rect){
        var d = rect.center.x < targetRect.center.x ? targetRect.center.x - rect.right : rect.left - targetRect.center.x;
        return d < 0 ? 0 : d;
      },
      nearHorizonIsBetter: function(rect){
        var d = rect.center.y < targetRect.center.y ? targetRect.center.y - rect.bottom : rect.top - targetRect.center.y;
        return d < 0 ? 0 : d;
      },
      nearTargetLeftIsBetter: function(rect){
        var d = rect.center.x < targetRect.center.x ? targetRect.left - rect.right : rect.left - targetRect.left;
        return d < 0 ? 0 : d;
      },
      nearTargetTopIsBetter: function(rect){
        var d = rect.center.y < targetRect.center.y ? targetRect.top - rect.bottom : rect.top - targetRect.top;
        return d < 0 ? 0 : d;
      },
      topIsBetter: function(rect){ return rect.top; },
      bottomIsBetter: function(rect){ return -1 * rect.bottom; },
      leftIsBetter: function(rect){ return rect.left; },
      rightIsBetter: function(rect){ return -1 * rect.right; }
    };
  };

  SpatialNavigator.prototype._prioritize = function(priorities, target, direction){
    var destPriority = priorities.find(function(p){ return p.group && p.group.length; });
    if(!destPriority) return null;
    if(this.rememberSource && this._previous && target === this._previous.destination && direction === this._previous.reverse){
      var source = this._previous.source;
      var found = destPriority.group.find(function(dest){ return dest.element === source; });
      if(found) return found;
    }
    destPriority.group.sort(function(a,b){
      return destPriority.distance.reduce(function(ans, fn){ return ans || (fn(a) - fn(b)); }, 0);
    });
    return destPriority.group[0];
  };

  SpatialNavigator.prototype.setCollection = function(collection){
    this.unfocus();
    this._collection = Array.from(collection || []);
  };

  SpatialNavigator.prototype.focus = function(elem){
    if(!elem){
      var navigable = this._collection.filter(this._isNavigable.bind(this));
      if(!navigable.length) return false;
      elem = navigable[0];
    }
    if(this._collection.indexOf(elem) < 0 || !this._isNavigable(elem)) return false;
    this.unfocus();
    this._focus = elem;
    this.emit('focus', { elem: elem });
    return true;
  };

  SpatialNavigator.prototype.unfocus = function(){
    if(!this._focus) return true;
    var elem = this._focus;
    this._focus = null;
    this.emit('unfocus', { elem: elem });
    return true;
  };

  SpatialNavigator.prototype.getFocusedElement = function(){ return this._focus; };

  SpatialNavigator.prototype.navigate = function(target, direction){
    if(!target || !direction || !this._collection.length) return null;
    direction = String(direction).toLowerCase();
    var rects = this._collection.filter(function(el){ return el !== target; }).map(this._getRect.bind(this)).filter(Boolean);
    var targetRect = this._getRect(target);
    if(!targetRect || !rects.length) return null;
    var groups = this._partition(rects, targetRect);
    var centerRect = { left: targetRect.center.x, right: targetRect.center.x, top: targetRect.center.y, bottom: targetRect.center.y, width:0, height:0, center:targetRect.center };
    var internalGroups = this._partition(groups[4], centerRect);
    var d = this._distance(targetRect);
    var priorities;
    switch(direction){
      case 'left': priorities = [
        { group: internalGroups[0].concat(internalGroups[3], internalGroups[6]), distance:[d.nearPlumbLineIsBetter, d.topIsBetter] },
        { group: groups[3], distance:[d.nearPlumbLineIsBetter, d.topIsBetter] },
        { group: groups[0].concat(groups[6]), distance:[d.nearHorizonIsBetter, d.rightIsBetter, d.nearTargetTopIsBetter] }
      ]; break;
      case 'right': priorities = [
        { group: internalGroups[2].concat(internalGroups[5], internalGroups[8]), distance:[d.nearPlumbLineIsBetter, d.topIsBetter] },
        { group: groups[5], distance:[d.nearPlumbLineIsBetter, d.topIsBetter] },
        { group: groups[2].concat(groups[8]), distance:[d.nearHorizonIsBetter, d.leftIsBetter, d.nearTargetTopIsBetter] }
      ]; break;
      case 'up': priorities = [
        { group: internalGroups[0].concat(internalGroups[1], internalGroups[2]), distance:[d.nearHorizonIsBetter, d.leftIsBetter] },
        { group: groups[1], distance:[d.nearHorizonIsBetter, d.leftIsBetter] },
        { group: groups[0].concat(groups[2]), distance:[d.nearPlumbLineIsBetter, d.bottomIsBetter, d.nearTargetLeftIsBetter] }
      ]; break;
      case 'down': priorities = [
        { group: internalGroups[6].concat(internalGroups[7], internalGroups[8]), distance:[d.nearHorizonIsBetter, d.leftIsBetter] },
        { group: groups[7], distance:[d.nearHorizonIsBetter, d.leftIsBetter] },
        { group: groups[6].concat(groups[8]), distance:[d.nearPlumbLineIsBetter, d.topIsBetter, d.nearTargetLeftIsBetter] }
      ]; break;
      default: return null;
    }
    if(this.straightOnly) priorities.pop();
    var dest = this._prioritize(priorities, target, direction);
    return dest ? dest.element : null;
  };

  SpatialNavigator.prototype.move = function(direction){
    var reverse = { left:'right', right:'left', up:'down', down:'up' };
    if(!this._focus) return this.focus();
    var elem = this.navigate(this._focus, direction);
    if(!elem) return false;
    this._previous = { source:this._focus, destination:elem, reverse:reverse[direction] };
    this.focus(elem);
    return true;
  };

  global.TVSpatialNavigator = SpatialNavigator;
})(window);
