/***************************************************************
*
*   TreeNode
*
***************************************************************/
var TreeNode;
(TreeNode = function(conf){
    this.conf = conf;
    this.id = conf.id ? conf.id : ++TreeNode.id;
    TreeNode.instances[this.getId()] = this;
    var parentTreeNode = conf.parentTreeNode;
    if (parentTreeNode) {
      if (iStr(parentTreeNode)) {
        parentTreeNode = TreeNode.getInstance(parentTreeNode);
      }
      if (!(parentTreeNode instanceof TreeNode)) throw "Invalid parent treenode";
      parentTreeNode.appendTreeNode(this);
    }
    else
    if (conf.parentElement) {
        this.appendToElement(gEl(conf.parentElement));
    }
}).prototype = {
    getId: function(){
        return TreeNode.prefix + ":" + this.id;
    },
    getConf: function() {
        return this.conf;
    },
    appendToElement: function(el) {
        aCh(el, this.getDom());
    },
    appendTreeNode: function(treeNode, body){
        aCh(body || this.getDomBody(), treeNode.getDom());
    },
    getState: function(){
        return this.conf.state || TreeNode.states.collapsed;
    },
    getCustomClass: function(){
        return this.conf.customClass;
    },
    setCustomClass: function(customClass){
        this.conf.customClass = customClass;
        var dom = this.getDomFromDocument();
        if (!dom) return;
        this.initClass(dom);
    },
    getTitle: function(){
        return this.conf.title;
    },
    getDomFromDocument: function() {
      return gEl(this.getId())
    },
    getDom: function() {
        var dom;
        if (!(dom = this.getDomFromDocument())){
            dom = this.createDom();
        }
        return dom;
    },
    getDomBody: function() {
        return gEls(this.getDom(), "DIV", 1);
    },
    toggle: function() {
        var state = this.getState();
        switch (state) {
            case TreeNode.states.collapsed:
                state = TreeNode.states.expanded;
                break;
            case TreeNode.states.expanded:
                state = TreeNode.states.collapsed;
                break;
        }
        this.setState(state);
    },
    checkState: function(state) {
      var k, states = TreeNode.states;
      for (k in states) {
        if (state === states[k]) return true;
      }
      return false;
    },
    setState: function(state){
        if (!this.checkState(state)) throw "Illegal state: "  + state;
        rCls(this.getDom(), this.getState(), this.conf.state = state);
        if (state === TreeNode.states.collapsed || gEls(this.getDomBody(), "DIV").length) return;
        this.loadChildren();
    },
    loadChildren: function(body) {
        var me = this,
            loader = me.conf.loadChildren,
            children
        ;
        if (!body) body = this.getDomBody();
        if (loader) {
            var ajaxLoader = cEl("IMG", {
                src: "../images/ajax-loader-small.gif"
            }, null, me.getDomBody()),
            f = function(){
                loader.call(me, function(){
                    dEl(ajaxLoader);
                });
            }
            setTimeout(f, 1);
        }
        else
        if (children = me.conf.children) {
            var i, n = children.length, child;
            for (i = 0; i < n; i++){
                child = children[i];
                if (!iObj(child)) continue;
                if (!(child instanceof TreeNode)) {
                    child = new TreeNode(child);
                }
                this.appendTreeNode(child, body);
            }
        }
    },
    createDom: function() {
        var state = this.getState(), conf = this.conf;
        var body = cEl("DIV", {
            "class": "body"
        });
        var labelContents = [this.getTitle()];
        var toggleConf = {
            "class": "toggle"
        };
        if (conf.icon) {
          toggleConf.style = {
            "background-image": "url('" + conf.icon + "')"
          }
        }
        var contents = [
            cEl("SPAN", toggleConf),
            cEl("SPAN", {
                "class": "label"
            }, labelContents)
        ];
        var dom = cEl("DIV", {
            id: this.getId(),
            "class": confCls(TreeNode.prefix, state, conf).join(" ")
        }, [
            cEl("DIV", {
                "class": "head"
            }, contents),
            body
        ]);
        if (state === TreeNode.states.expanded && conf.children) {
            this.loadChildren(body);
        }
        return dom;
    },
    getSaveData: function(){
      var children = [];
      this.eachChild(function(treeNode) {
        children.push(treeNode.getSaveData());
      });
      return {
        conf: this.conf,
        children: children
      }
    },
    eachChild: function(callback, scope) {
      if (!scope) scope = null;
      var body = this.getDomBody();
      var children = body.children;
      var i, n = children.length, child;
      for (i = 0; i < n; i++) {
        child = children.item(i);
        child = TreeNode.lookup(child);
        callback.call(scope, child);
      }
    }
};
TreeNode.states = {
    collapsed: "collapsed",
    expanded: "expanded",
    leaf: "leaf"
};
TreeNode.id = 0;
TreeNode.prefix = "node";
TreeNode.instances = {};
TreeNode.getInstance = function(id){
    if (iInt(id)) id = TreeNode.prefix + id;
    return TreeNode.instances[id];
};
TreeNode.lookup = function(el){
  var re = new RegExp("\\b" + TreeNode.prefix + "\\b", "g");
  while (el && !re.test(el.className)) {
    if ((el = el.parentNode) === doc) return null;
  }
  return TreeNode.getInstance(el.id);
};

linkCss("../css/treenode.css");
