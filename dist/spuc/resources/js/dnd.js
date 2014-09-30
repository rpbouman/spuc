/***************************************************************
*
*   DDHandler
*
***************************************************************/
var DDHandler;
(DDHandler = function (config) {
    config = merge(config, {
        node: doc
    });
    var me = this;
    me.listeners = [];
    me.endDragListeners = null;
    me.whileDragListeners = null;
    me.node = (node = gEl(config.node));
    me.mousedown = false;
    me.initdrag = false;
    if (config.dragProxy!==false) {
        if (!(me.dragProxy = gEl(config.dragProxy))) {
            me.dragProxy = cEl("DIV", null, null, node);
        }
    }
    if (config.dropProxy!==false) {
        if (!(me.dropProxy = gEl(config.dropProxy))) {
            me.dropProxy = cEl("DIV", null, null, node);
        }
    }
    me.startDragEvent = null;
    listen(this.node, "mousedown", function(e){
        me.event = e;
        if (e.getButton()===0) {
            me.handleMouseDown(e);
        }
        return false;
    }, this);
    listen(this.node, "mouseup", function(e){
        me.event = e;
        if (e.getButton()===0) {
            me.handleMouseUp(e);
        }
        return false;
    }, this);
    listen(this.node, "mousemove", function(e){
        me.event = e;
        me.handleMouseMove(e);
        return false;
    }, this);
}).prototype = {
    listen: function(listener){
        if (!listener.scope) {
            listener.scope = win;
        }
        this.listeners.push(listener);
    },
    handleMouseDown: function(e) {
        var me = this;
        me.mousedown = true;
        if (!me.initdrag) {
            me.initdrag = true;
            me.node.focus();
            me.startDrag(e);
        }
    },
    handleMouseUp: function(e){
        var me = this;
        if (me.mousedown) {
            if (me.initdrag) {
                me.initdrag = false;
                me.endDrag(e);
            }
            me.mousedown = false;
        }
    },
    handleMouseMove: function(e) {
        var me = this;
        if (me.mousedown) {
            if (!me.initdrag) {
                me.initdrag = true;
                me.startDrag(e);
            }
            else {
                me.whileDrag(e);
            }
        }
    },
    cancelDrag: function() {
      var me = this;
      me.endDragListeners = null;
      me.whileDragListeners = null;
      me.mouseMoveEvent = null;
      if (me.startDragEvent) {
        me.startDragEvent.destroy();
        me.startDragEvent = null;
      }
    },
    startDrag: function(e) {
        var me = this, i,
            listeners = me.listeners,
            n = listeners.length,
            listener
        ;
        me.endDragListeners = [];
        me.whileDragListeners = [];
        me.startDragEvent = e.save();
        for (i = 0; i < n; i++) {
            listener = listeners[i];
            if (listener.startDrag.call(listener.scope, e, me) !== true) continue;
            if (iFun(listener.endDrag)) me.endDragListeners.push(listener);
            if (iFun(listener.whileDrag)) me.whileDragListeners.push(listener);
        }
        if (me.endDragListeners.length + me.whileDragListeners.length) return;
        me.cancelDrag();
    },
    endDrag: function(e) {
        var me = this, i, listeners, listener, n;
        if (!me.startDragEvent) return;
        listeners = me.endDragListeners;
        n = listeners.length;
        for (i = 0; i < n; i++) {
            listener = listeners[i];
            listener.endDrag.call(listener.scope, e, me)
        }
        me.cancelDrag();
        clearBrowserSelection();
    },
    whileDrag: function(e) {
        var me = this, i, n, listeners, listener;
        if (!me.startDragEvent) return;
        listeners = me.whileDragListeners;
        n = listeners.length;
        for (i = 0; i < n; i++) {
            listener = listeners[i];
            listener.whileDrag.call(listener.scope, e, me);
        }
        clearBrowserSelection();
    }
};
