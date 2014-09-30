var ModelBasedQueryEditor;
(function() {

(ModelBasedQueryEditor = function(conf) {
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++ModelBasedQueryEditor.id;
  ModelBasedQueryEditor.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return ModelBasedQueryEditor.prefix + this.id;
  },
  createDom: function() {
    var el = cEl("div", {
      id: this.getId(),
      "class": confCls(
        ModelBasedQueryEditor.prefix
        conf
      ),
    }, null, null;
  }
}
adopt(ModelBasedQueryEditor, Observable);

ModelBasedQueryEditor.id = 0;
ModelBasedQueryEditor.prefix = "mql-editor";
ModelBasedQueryEditor.instances = {};
ModelBasedQueryEditor.getInstance = function(id){
    if (iInt(id)) id = ModelBasedQueryEditor.prefix + id;
    return ModelBasedQueryEditor.instances[id];
};
ModelBasedQueryEditor.lookup = function(el){
  var re = new RegExp("^" + ModelBasedQueryEditor.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return ModelBasedQueryEditor.getInstance(el.id);
};

})();
