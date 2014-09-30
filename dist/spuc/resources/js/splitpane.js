var SplitPane;

(function(){
(SplitPane = function(conf){
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++SplitPane.id;
  SplitPane.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return SplitPane.prefix + this.id;
  },
  getSize: function(arg) {
    var orientation = this.getOrientation();
    var property;
    switch (orientation) {
      case SplitPane.orientations.vertical:
        property = "clientWidth";
        break;
      case SplitPane.orientations.horizontal:
        property = "clientHeight";
        break;
    }
    var dom;
    switch (typeof(arg)) {
      case "undefined":
        dom = this.getDom();
        break;
      case "string":
        switch (arg) {
          case "first":
            dom = this.getFirstComponent();
            break;
          case "second":
            dom = this.getSecondComponent();
            break;
          default:
        }
        break;
      default:
        throw "not supported";
    }
    return dom[property];
  },
  getSplitterPosition: function(splitter, orientation){
    if (!splitter) splitter = this.getSplitter();
    if (!orientation) orientation = orientation = this.getOrientation();

    var property;
    switch (orientation) {
      case SplitPane.orientations.vertical:
        property = "offsetLeft";
        break;
      case SplitPane.orientations.horizontal:
        property = "offsetTop";
        break;
    }
    return splitter[property];
  },
  maintainRatio: function(){
    return iDef(this.conf.maintainRatio) ? Boolean(this.conf.maintainRatio) : true;
  },
  setSplitterPosition: function(position) {
    var me = this;
    var orientation = this.getOrientation();
    var splitter = this.getSplitter();
    var data = {
      oldPosition: this.getSplitterPosition(splitter, orientation),
      newPosition: position
    };
    if (this.fireEvent("beforeSplitterPositionChange", data) === false) return;
    var property, complementaryProperty;
    switch (orientation) {
      case SplitPane.orientations.vertical:
        property = "left";
        complementaryProperty = "width";
        break;
      case SplitPane.orientations.horizontal:
        property = "top";
        complementaryProperty = "height";
        break;
    }
    splitter.style[property] = position;

    var clientProperty;
    clientProperty = "offset" + property.charAt(0).toUpperCase() + property.substr(1);
    position = splitter[clientProperty];
    splitter.style[property] = position + "px";

    var dom = me.getDom();
    var complementaryPropertyPostfix = complementaryProperty.charAt(0).toUpperCase() + complementaryProperty.substr(1);
    clientProperty = "client" + complementaryPropertyPostfix;
    var size = dom[clientProperty];
    var splitterSize = splitter[clientProperty];
    dom.style["min" + complementaryPropertyPostfix] = (position + splitterSize) + "px";

    var style;
    style = me.getFirstComponent().style;
    style[complementaryProperty] = (position + splitterSize/2) + "px";

    style = me.getSecondComponent().style;
    //style[complementaryProperty] = ((size - position) + splitterSize/2) + "px";
    style[property] = (position + splitterSize/2) + "px";
    this.fireEvent("splitterPositionChanged", data);
  },
  getOrientation: function(){
    return this.conf.orientation || SplitPane.orientations.vertical;
  },
  setOrientation: function(orientation){
    var oldOrientation = this.getOrientation();
    if (orientation == oldOrientation) return;
    if (
      orientation !== SplitPane.orientations.vertical &&
      orientation !== SplitPane.orientations.horizontal
    ) throw "Invalid orientation";

    var data = {
      oldOrientation: oldOrientation,
      newOrientation: orientation
    };
    if (this.fireEvent("beforeOrientationChange", data) === false) return;

    var size = this.getSize();
    var splitterPosition = this.getSplitterPosition();

    var splitterStyle = this.getSplitter().style;
    splitterStyle.top = "";
    splitterStyle.left = "";

    var firstComponentStyle = this.getFirstComponent().style;
    firstComponentStyle.height = "";
    firstComponentStyle.width = "";
    firstComponentStyle.top = "";
    firstComponentStyle.left = "";

    var secondComponentStyle = this.getSecondComponent().style;
    secondComponentStyle.height = "";
    secondComponentStyle.width = "";
    secondComponentStyle.top = "";
    secondComponentStyle.left = "";

    rCls(this.getDom(), this.conf.orientation, orientation);
    this.conf.orientation = orientation;
    this.setSplitterPosition((100 * splitterPosition / size) + "%");

    this.fireEvent("orientationChanged", data);
  },
  getFirstComponent: function() {
    return getDom(this.conf.firstComponent);
  },
  getSecondComponent: function() {
    return getDom(this.conf.secondComponent);
  },
  createDom: function(){
    var conf = this.conf;

    var componentPrefix = SplitPane.prefix + "-component";
    var parentNode;

    var firstComponent = this.getFirstComponent();
    if (parentNode = firstComponent.parentNode) parentNode.removeChild(firstComponent);
    firstComponent.className += " " + componentPrefix + " " + componentPrefix + "-first";

    var secondComponent = this.getSecondComponent();
    if (parentNode =  secondComponent.parentNode) parentNode.removeChild(secondComponent);
    secondComponent.className += " " + componentPrefix + " " + componentPrefix + "-second";

    var el = cEl("div", {
      id: this.getId(),
      "class": confCls(
        SplitPane.prefix,
        SplitPane.prefix + "-" + this.getOrientation(),
        conf
      )
    }, [
      firstComponent,
      cEl("div", {
        id: this.getSplitterId(),
        "class": SplitPane.prefix + "-splitter"
      }),
      secondComponent
    ]);
    var container = conf.container;
    if (container) {
      container = gEl(container);
      container.appendChild(el);
    }
    return el;
  },
  getSplitterId: function(){
    return this.getId() + "-splitter";
  },
  getSplitter: function() {
    return gEl(this.getSplitterId());
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) el = this.createDom();
    return el;
  },
  render: function() {
    this.createDom();
  }
};
SplitPane.orientations = {
  horizontal: "horizontal",
  vertical: "vertical"
}
SplitPane.id = 0;
SplitPane.prefix = "splitpane";
SplitPane.instances = {};
SplitPane.getInstance = function(id){
    if (iInt(id)) id = SplitPane.prefix + id;
    return SplitPane.instances[id];
};
SplitPane.lookup = function(el){
  var re = new RegExp("^" + SplitPane.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return SplitPane.getInstance(el.id);
};
SplitPane.orientations.vertical = "vertical";
SplitPane.orientations.horizontal = "horizontal";
SplitPane.listenToDnd = function(dnd){
  dnd.listen({
    startDrag: function(event, ddHandler) {
      var target = event.getTarget();
      if (!hCls(target, "splitpane-splitter")) return false;

      var currentSplitPane = SplitPane.lookup(target);
      if (!currentSplitPane) {
        console.log("Error: splitter found but corresponding splitpane not found.");
        return false;
      }
      var orientation = currentSplitPane.getOrientation();
      var dom = currentSplitPane.getDom();
      var splitter = currentSplitPane.getSplitter();
      currentSplitPane.pos = pos(dom);
      var max, min = 0;
      var first = currentSplitPane.getFirstComponent();
      var firstSplitPane = SplitPane.lookup(first);
      //if (currentSplitPane.maintainRatio()) firstSplitPane = null;
      if (firstSplitPane === currentSplitPane) firstSplitPane = null;
      if (firstSplitPane) firstSplitPane = firstSplitPane.getDom().style;
      switch (orientation) {
        case SplitPane.orientations.horizontal:
          max = dom.clientHeight - splitter.clientHeight;
          if (firstSplitPane) min = parseInt(firstSplitPane.minHeight, 10);
          break;
        case SplitPane.orientations.vertical:
          max = dom.clientWidth - splitter.clientWidth;
          if (firstSplitPane) min = parseInt(firstSplitPane.minWidth, 10);
          break;
      }
      currentSplitPane.max = max;
      currentSplitPane.min = min;

      var contentArea = ContentArea.lookup(dom);
      if (contentArea) {
        var selectedPane = contentArea.getSelectedPane();
        if (selectedPane) {
          dnd.highlighter = contentArea.getHighlighter();
        }
        else {
          dnd.highlighter = null;
        }
      }
      dnd.currentSplitPane = currentSplitPane;
      return true;
    },
    whileDrag: function(event, dnd) {
      var currentSplitPane = dnd.currentSplitPane;
      var xy = event.getXY();
      var pos;
      var dom = currentSplitPane.getDom();

      switch (currentSplitPane.getOrientation()) {
        case SplitPane.orientations.horizontal:
          pos = xy.y - currentSplitPane.pos.top;
          break;
        case SplitPane.orientations.vertical:
          pos = xy.x - currentSplitPane.pos.left;
          break;
        default:
          return;
      }

      var min = currentSplitPane.min;
      if (pos < min) pos = min;

      var max = currentSplitPane.max;
      if (pos > max) pos = max;

      currentSplitPane.setSplitterPosition(pos + "px");
      if (dnd.highlighter) dnd.highlighter.sync();
    },
    endDrag: function(event, ddHandler) {
      var currentSplitPane = dnd.currentSplitPane;
      if (!currentSplitPane) return;
      /*
      if (currentSplitPane.maintainRatio()) {
        var splitter = currentSplitPane.getSplitter();
        var firstComponent = currentSplitPane.getFirstComponent();
        var secondComponent = currentSplitPane.getSecondComponent();
        var position = currentSplitPane.getSplitterPosition();
        var size = currentSplitPane.getSize();
        var size100 = size / 100;
        var ratio = position / size100;
        var otherRatio = (size - position) / size100;
        switch (currentSplitPane.getOrientation()) {
          case SplitPane.orientations.horizontal:
            firstComponent.style.height = ratio + "%";
            splitter.style.top = ratio + "%";
            secondComponent.style.top = ratio + "%";
            break;
          case SplitPane.orientations.vertical:
            firstComponent.style.width = ratio + "%";
            splitter.style.left = ratio + "%";
            secondComponent.style.left = ratio + "%";
            break;
          default:
        }
      }
      */
      dnd.currentSplitPane = null;
    }
  });
};
adopt(SplitPane, Observable);

linkCss("../css/splitpane.css");

})();
