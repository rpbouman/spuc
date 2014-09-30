var ContentPane;

(function() {
(ContentPane = function(conf){
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++ContentPane.id;
  ContentPane.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return ContentPane.prefix + this.id;
  },
  getTitleId: function(){
    return this.getId() + "-title";
  },
  createDom: function(){
    var conf = this.conf;
    var id = this.getId();
    var el = cEl("div", {
      "class": confCls(ContentPane.prefix, conf),
      id: id,
      style: conf.style || ""
    });

    var titleBar, titleId = this.getTitleId();
    if (conf.title || conf.toolbar) {
      titleBar = cEl("div", {
        id: titleId,
        "class": "pentaho-titled-toolbar"
      }, conf.title, el);
    }
    if (conf.toolbar) {
      if (conf.toolbar instanceof Toolbar){
        this.toolbar = conf.toolbar;
      }
      else {
        this.toolbar = new Toolbar(conf.toolbar);
      }
      this.toolbar.conf.container = titleId;
      this.toolbar.createDom();
    }

    var container = conf.container;
    container = gEl(container);
    if (container) container.appendChild(el);
    return el;
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) el = this.createDom();
    return el;
  },
  setTitle: function(title){
    this.conf.title = title;
    var title = gEl(this.getTitleId());
    title.innerHTML = title;
  },
  render: function() {
    this.createDom();
  }
}
ContentPane.id = 0;
ContentPane.prefix = "contentpane";
ContentPane.instances = {};
ContentPane.getInstance = function(id){
    if (iInt(id)) id = ContentPane.prefix + id;
    return ContentPane.instances[id];
};
ContentPane.lookup = function(el){
  var re = new RegExp("^" + ContentPane.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return ContentPane.getInstance(el.id);
};

linkCss("../css/contentpane.css");

})();
