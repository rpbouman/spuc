var Highlighter;
(function() {

(Highlighter = function(conf) {
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++Highlighter.id;
}).prototype = {
  getId: function(){
    return Highlighter.prefix + this.id;
  },
  createDom: function(){
    var conf = this.conf || {};
    var container = conf.container;
    container = gEl(container);
    if (!container) container =  body;
    var el = cEl("div", {
      "class": confCls(Highlighter.prefix, conf),
      id: this.getId()
    });
    container.appendChild(el);
    return el;
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) el = this.createDom();
    return el;
  },
  render: function() {
    this.createDom();
  },
  sync: function() {
    var dom = this.getDom();
    var style = dom.style;
    var el = gEl(this.highlightedElement);
    if (!el) {
      style.display = "none";
      return;
    }
    style.display = "";
    var position = pos(el);
    style.left = (position.left + 4) + "px";
    style.top = (position.top + 4) + "px";
    style.width = (el.clientWidth - 8) + "px";
    style.height = (el.clientHeight - 8) + "px";
  },
  highlight: function(el){
    this.highlightedElement = el;
    this.sync();
  }
};

Highlighter.id = 0;
Highlighter.prefix = "highlighter";

adopt(Highlighter, Displayed);

linkCss("../css/highlighter.css");
})();
