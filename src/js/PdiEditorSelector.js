var PdiEditorSelector;

(function(){

(PdiEditorSelector = function(conf) {
  var me = this;
  me.conf = conf;
  var dnd = conf.dnd;
  dnd.listen({
    startDrag: function(event, dnd) {
      var target = event.getTarget();
      if (!hCls(target, "pdi-trans-editor")) return false;
      var editor = PdiTransformationEditor.lookup(target);
      me.startSelection(editor, event.getXY());
      return true;
    },
    whileDrag: function(event, dnd) {
      var target = event.getTarget();
      if (!fEl(target, "pdi-trans-editor")) return false;
      me.updateSelection(event.getXY());
    },
    endDrag: function(event, dnd){
      me.endSelection();
    }
  });
}).prototype = {
  getId: function(){
    return PdiTransformationEditor.prefix + ":" + this.id;
  },
  getContainer: function() {
    return gEl(this.conf.container) || body;
  },
  createDom: function() {
    var el = cEl("DIV", {
      "class": PdiEditorSelector.prefix,
      id: this.getId()
    });
    this.dom = el;
    return el;
  },
  getDom: function() {
    var el = this.dom;
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
  startSelection: function(editor, xy) {
    var x = xy.x;
    var y = xy.y;
    this.editor = editor;
    this.selection = editor.getSelection();
    this.selection.clearSelection();
    var editorDom = editor.getDom();
    this.editorPosition = pos(editorDom);
    this.origX = x - this.editorPosition.left;
    this.origY = y - this.editorPosition.top;
    var dom = this.getDom();
    if (dom.parentNode) {
      dom.parentNode.removeChild(dom);
    }
    editorDom.appendChild(dom);
    this.setDimension(this.origX, this.origY, 0, 0);
    this.show();
  },
  updateSelection: function(xy){
    var x = xy.x;
    var y = xy.y;
    var nX, nY, nW, nH;
    x -= this.editorPosition.left;
    y -= this.editorPosition.top;
    if (x > this.origX) {
      nX = this.origX;
      nW = x - this.origX;
    }
    else {
//      nX = x;
//      nW = this.origX - x;
      nX = this.origX;
      nW = 0;
    }

    if (y > this.origY) {
      nY = this.origY;
      nH = y - this.origY;
    }
    else {
//      nX = y;
//      nH = this.origY - y;
      nY = this.origY;
      nH = 0;
    }
    this.setDimension(nX, nY, nW, nH);
    this.selection.selectionRangeUpdated(nX, nY, nW, nH);
  },
  endSelection: function(){
    this.setSize(0, 0);
    this.hide();
  },
  setPosition: function(x, y) {
    var style = this.getDom().style;
/*
    var myX = this.bounds.x;
    var myW = this.bounds.w
    if (x < myX) x = myX;
    if (x > (myX + myW)) x = myX + myW;

    var myY = this.bounds.y;
    var myH = this.bounds.h
    if (y < myY) x = myY;
    if (y > (myY + myH)) y = myY + myH;
*/
    style.left = x + "px";
    style.top = y + "px";
  },
  getPosition: function(){
    var dom = this.getDom();
    return {
      x: dom.offsetLeft,
      y: dom.offsetTop
    };
  },
  setSize: function(w, h) {
    var dom = this.getDom();
    var style = dom.style;
/*
    var x = dom.clientLeft;
    var y = dom.clientTop;
    style.width = width + "px";
    style.height = height + "px";
*/
    style.width = w + "px";
    style.height = h + "px";
  },
  setDimension: function(x, y, w, h){
    var style = this.getDom().style;
    style.left = x + "px";
    style.top = y + "px";
    style.width = w + "px";
    style.height = h + "px";
  },
  getDimension: function() {
    var dom = this.getDom();
    return {
      x: dom.offsetLeft,
      y: dom.offsetTop,
      w: dom.offsetWidth,
      h: dom.offsetHeight
    }
  },
  setWidth: function(w){
    var dom = this.getDom();
    var style = dom.style;
    style.width = w + "px";
  },
  setHeight: function(h){
    var dom = this.getDom();
    var style = dom.style;
    style.height = h + "px";
  }
};

PdiEditorSelector.prefix = "pdi-editor-selector";
PdiEditorSelector.id = 0;

adopt(PdiEditorSelector, Displayed);

linkCss("../css/pdieditorselector.css");
})();
