var TreeSelection;

(function() {

(TreeSelection = function(conf) {
  this.conf = conf;
  this.treeListener = conf.treeListener || new TreeListener(conf);
  this.treeListener.listen("nodeClicked", this.clickHandler, this);
  this.selection = [];
  this.multiple = Boolean(conf.multiple) || false;
}).prototype = {
  clickHandler: function(treeListener, type, data){
    var newSelection = [];
    var treeNode = data.treeNode;
    var event = data.event;
    if (this.multiple) {
    }
    else {
      newSelection[0] = treeNode;
    }
    this.setSelection(newSelection);
  },
  isNodeSelected: function(treeNode) {
    return hCls(getDom(treeNode), "selected");
  },
  updateSelection: function(selection, selected) {
    var i, n = selection.length, node;
    for (i = 0; i < n; i++){
      node = selection[0];
      nodeDom = getDom(node);
      if (selected && !this.isNodeSelected(node)) {
        aCls(nodeDom, "selected")
      }
      else
      if (!selected && this.isNodeSelected(node)) {
        rCls(nodeDom, "selected")
      }
    }
  },
  setSelection: function(selection) {
    var oldSelection = this.selection;
    var newSelection = selection;
    if (this.fireEvent("beforeChangeSelection", {
      oldSelection: oldSelection,
      newSelection: newSelection
    }) === false) return;
    this.updateSelection(oldSelection, false);
    this.updateSelection(newSelection, true);
    this.selection = newSelection;
    this.fireEvent("selectionChanged", {
      oldSelection: oldSelection,
      newSelection: newSelection
    });
  }
};

adopt(TreeSelection, Observable);

})();
