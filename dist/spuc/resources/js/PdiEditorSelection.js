var PdiEditorSelection;

(function () {

(PdiEditorSelection = function(conf){
  this.conf = conf;
  var editor = this.editor = conf.editor;
  if (editor instanceof PdiTransformationEditor) {
    this.document = editor.getTransformation();
    this.iterator = this.document.eachStep;
  }
  else
  if (editor instanceof PdiJobEditor) {
    this.document = editor.getJob();
    this.iterator = this.document.eachJobEntry;
  }
  this.items = {};
  if (conf.items) this.setItems(conf.items);
}).prototype = {
  setItems: function(items){
    var p, oldItems = this.items;
    for (p in oldItems) {
      if (items[p]) continue;
      this.unselect(p);
    }
    for (p in items){
      if (oldItems[p]) continue;
      this.select(p);
    }
    return true;
  },
  clearSelection: function(){
    this.setItems({});
  },
  isSelected: function(name){
    return iDef(this.items[name]);
  },
  setSelected: function(name, selected){
    var items = this.items;
    if (selected) {
      if (iUnd(items[name])) {
        if (this.fireEvent("beforeSelectItem", {
          item: name
        }) === false) return false;
        items[name] = true;
        this.fireEvent("itemSelected", {
          item: name
        });
      }
    }
    else {
      if (iDef(items[name])) {
        if (this.fireEvent("beforeUnselectItem", {
          item: name
        }) === false) return false;
        delete items[name];
        this.fireEvent("itemUnselected", {
          item: name
        });
      }
    }
  },
  select: function(name){
    this.setSelected(name, true);
  },
  unselect: function(name){
    this.setSelected(name, false);
  },
  eachEditorItem: function(callback, scope){
    var document = this.document;
    var iterator = this.iterator;
    if(iterator.call(document, function(index, item){
      if (callback.call(scope, index, item) === false) return false;
    }, this) === false) return false;
    return true;
  },
  eachSelectedItem: function(callback, scope) {
    if (this.eachEditorItem(function(index, item){
      if (this.isSelected(item.name)) {
        if (callback.call(scope, index, item) === false) return false;
      }
    }, this) === false) return false;
    return true;
  },
  eachSelectedHop: function(callback, scope) {
    var editor = this.editor;
    var document = editor.getDocument();
    if (document.eachHop(function(index, hop){
      if (this.isSelected(hop.from) || this.isSelected(hop.to)) {
        if (callback.call(scope, index, hop) === false) return false;
      }
    }, this) === false) return false;
    return true;
  },
  selectionRangeUpdated: function(x, y, w, h){
    this.eachEditorItem(function(index, item) {
      var name = item.name;
      var xloc = parseInt(item.GUI.xloc, 10);
      var yloc = parseInt(item.GUI.yloc, 10);
      var selected = this.isSelected(name);
      if (xloc >= x && xloc <= x + w && yloc >= y && yloc <= y + h) {
        if (!selected) this.select(name);
      }
      else
      if (selected) {
        this.unselect(name);
      }
    }, this);
  }
}

adopt(PdiEditorSelection, Observable);

linkCss("../css/pdieditorselection.css");
})();
