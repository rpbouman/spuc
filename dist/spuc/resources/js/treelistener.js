var TreeListener;

(function(){

(TreeListener = function(conf) {
  this.conf = conf;
  this.registerListeners();
}).prototype = {
  getContainer: function(){
    return getDom(this.conf.container);
  },
  registerListeners: function(){
    var container = this.getContainer();
    listen(container, "click", function(e){
      var target = e.getTarget();
      var treeNode = TreeNode.lookup(target);
      if (!treeNode) return;

      if (hCls(target, "toggle")) {
        if (this.fireEvent("beforeToggleNode", treeNode) === false) {
          return;
        }
        treeNode.toggle();
        this.fireEvent("afterToggleNode", treeNode);
      }
      else {
        this.fireEvent("nodeClicked", {
          treeNode: treeNode,
          event: e
        });
      }
    }, this);
  },

};

adopt(TreeListener, Observable);


})();
