/***************************************************************
*
*   Observable
*
***************************************************************/
var Observable;
(Observable = function() {
}).prototype = {
  unlisten: function(type, method, scope, context){
    if (arguments.length === 0) {
      this.listeners = null;
      return;
    }
    var listeners = this.listeners;
    if (!listeners) return;
    if (arguments.length === 1) {
      this.listeners[type] = null;
      return;
    }
    listeners = this.listeners[type];
    if (!listeners) return;
    if (!scope) scope = win;
    if (!context) context = null;
    var listener, i, n = listeners.length;
    for (i = 0; i < n; i++){
      listener = listeners[i];
      if (
        listener.method === method &&
        listener.scope === scope &&
        listener.context === context
      ) listeners.splice(i, 1);
    }
  },
  listen: function(type, method, scope, context) {
    if (iArr(type)) {
      var i, n = type.length;
      for (i = 0; i < n; i++) {
        if (arguments.length === 1) {
          var o = type[i], args = [];
          if (iUnd(o.type)) continue;
          args.push(o.type);
          if (iUnd(o.method)) continue;
          args.push(o.method);
          if (iDef(o.scope)) args.push(o.scope);
          if (iDef(o.context)) args.push(o.context);
          this.listen.apply(this, args);
        }
        else {
          this.listen(type[i], method, scope, context);
        }
      }
      return;
    }
    else
    if (iObj(type)) {
      if (type.method) {
        this.listen(type.type, type.method, type.scope, type.context);
      }
      else {
        var p, v;
        for (p in type) {
          v = type[p];
          if (iFun(v)) {
            this.listen(p, v)
          }
          else
          if (iObj(v)) {
            this.listen(p, v.method, v.scope, v.context)
          }
        }
      }
      return;
    }
    var listeners, handlers, scope;
    if (!(listeners = this.listeners)) listeners = this.listeners = {};
    if (!(handlers = listeners[type])) handlers = listeners[type] = [];
    if (!scope) scope = win;
    if (!context) context = null;
    handlers.push({
      method: method,
      scope: scope,
      context: context
    });
  },
  fireEvent: function(type, data, context) {
    var listeners, handlers, i, n, handler, scope;
    if (!(listeners = this.listeners)) return;
    if (!(handlers = listeners[type])) return;
    for (i = 0, n = handlers.length; i < n; i++){
      handler = handlers[i];
      if (!iUnd(context) && context !== handler.context) continue;
      if (handler.method.call(handler.scope, this, type, data) === false) return false;
    }
    return true;
  }
};
