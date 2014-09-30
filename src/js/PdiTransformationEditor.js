var PdiTransformationEditor;

(function(){

(PdiTransformationEditor = function(conf){
  this.conf = conf;
  this.id = conf.id ? conf.id : ++PdiTransformationEditor.id;
  this.initTransformation();
  this.selection = new PdiEditorSelection({
    editor: this
  });
  this.selection.listen({
    itemSelected: {
      method: function(editor, event, data){
        var id = this.getStepId(data.item);
        aCls(id, "pdi-selected");
      },
      scope: this
    },
    itemUnselected: {
      method: function(editor, event, data){
        var id = this.getStepId(data.item);
        rCls(id, "pdi-selected");
      },
      scope: this
    }
  });
  PdiTransformationEditor.instances[this.getId()] = this;
}).prototype = {
  stepSize: 32,
  getSelection: function() {
    return this.selection;
  },
  initTransformation: function(){
    var conf = this.conf;
    var transformation = conf.transformation;
    if (!transformation) {
      transformation = new PdiTransformation();
      conf.transformation = transformation;
    }
    transformation.listen({
      stepAdded: {
        method: function(transformation, event, data) {
          this.renderStep(data.index);
        },
        scope: this
      },
      hopAdded: {
        method: function(transformation, event, data){
          this.renderHop(data.index);
        },
        scope: this
      }
    });
  },
  getType: function(){
    return PdiTransformationEditor.prefix;
  },
  getId: function(){
    return PdiTransformationEditor.prefix + ":" + this.id;
  },
  createDom: function(){
    var conf = this.conf;
    var id = this.getId();
    var el = cEl("div", {
      "class": confCls(PdiTransformationEditor.prefix, conf),
      id: id,
      style: conf.style || ""
    });
    listen(el, "dblclick", this.dblClickHandler, this);
    return el;
  },
  getDocument: function(){
    return this.getTransformation();
  },
  getTransformation: function() {
    return this.conf.transformation;
  },
  getStepIdPrefix: function() {
    return this.getId() + ":steps:";
  },
  getStepId: function(stepName) {
    return this.getStepIdPrefix() + stepName;
  },
  stepIdToStepName: function(stepId) {
    if (iNod(stepId)) stepId = stepId.id;
    if (!iStr(stepId)) throw "Invalid type. Id must either be node or string";
    var stepIdPrefix = this.getStepIdPrefix();
    if (stepId.indexOf(stepIdPrefix)) return null;
    return stepId.substr(stepIdPrefix.length);
  },
  getHopId: function(fromStepName, toStepName) {
    var id = this.getId() + ":hops:" + fromStepName;
    if (toStepName) id += ":" + toStepName;
    return id;
  },
  getNotepadId: function(index){
    return this.getId() + ":notepads:" + index;
  },
  getHopDom: function(id1, id2) {
    var hop, id;
    switch (arguments.length) {
      case 1:
        switch (typeof(id1)){
          case "number":
            id1 = this.getTransformation().getHop(id1);
          case "object":
            id2 = id1.to;
            id1 = id1.from;
        }
      case 2:
        id =  this.getHopId(id1, id2);
        break;
      default:
        throw "Invalid number of arguments"
    }
    return gEl(id);
  },
  getStepDom: function(id) {
    switch (typeof(id)){
      case "number":
        id = this.getTransformation().getStep(id);
      case "object":
        id = id.name;
      case "string":
        id = this.getStepId(id);
        break;
    }
    return gEl(id);
  },
  renderStep: function(index) {
    var transformation = this.getTransformation();
    var step = transformation.getStep(index);
    var gui = step.GUI;
    if (gui.draw === "N") return;
    var stepTypeId = step.type;
    var stepName = step.name;
    var stepType = transformation.kettle.getStepType(stepTypeId);
    var dom = this.getDom();
    var label = cEl("div", {
      "class": confCls("pdi-label")
    }, stepName);
    var stepDom = cEl("div", {
      id: this.getStepId(stepName),
      "class": confCls("pdi-step", stepTypeId).join(" "),
      style: {
        "background-image": "url('../" + stepType.image + "')",
        left: gui.xloc + "px",
        top: gui.yloc + "px"
      }
    }, label, dom);
    label.style.left = ((this.stepSize/2) - (label.clientWidth / 2)) + "px";
  },
  renderSteps: function(){
    var transformation = this.getTransformation();
    transformation.eachStep(function(index, step){
      this.renderStep(index);
    }, this);
  },
  renderNotepad: function(index) {
    var transformation = this.getTransformation();
    var notepad = transformation.getNotepad(index);
    var dom = this.getDom();
    var notepadDom = cEl("div", {
      "class": confCls("pdi-notepad").join(" "),
      id: this.getNotepadId(index),
      style: {
        left: notepad.xloc + "px",
        top: notepad.yloc + "px",
//        width: notepad.width + "px",
//        height: notepad.height + "px"
        height: notepad.heigth + "px"
      }
    }, notepad.note, dom);
  },
  renderNotepads: function(){
    var transformation = this.getTransformation();
    transformation.eachNotepad(function(index, notepad){
      this.renderNotepad(index);
    }, this);
  },
  drawLine: function(el, x1, y1, x2, y2) {
    //thanks to: http://monkeyandcrow.com/blog/drawing_lines_with_css3/
    var length = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
    var angle  = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    var transform = 'rotate('+angle+'deg)';
    var atts = {
      style: {
        left: x1 + "px",
        top: y1 + "px",
        width: length + "px",
        "-moz-transform": transform,
        "-webkit-transform": transform
      }
    };
    sAtts(el, atts);
  },
  createHopDom: function(fromStepName, hopClasses, toStepName) {
    hopClasses = confCls(hopClasses);
    var transformation = this.getTransformation();
    var fromStep = transformation.getStep(fromStepName);
    var id = this.getHopId(fromStepName, toStepName);
    var decoration = [];
    switch (fromStep.distribute) {
      case "N":
        decoration.push(cEl("div", {
          "class": "pdi-hop-copy-icon"
        }));
        hopClasses.push("hop-copy");
        break;
      case "Y":
        hopClasses.push("hop-distribute");
        break;
    }
    //thanks to: http://css-tricks.com/snippets/css/css-triangle/
    decoration.push(cEl("div", {
      "class": "pdi-hop-arrow"
    }));
    var dom = this.getDom();
    var hopDom = cEl("div", {
      id: id,
      "class": confCls(
        "pdi-hop",
        hopClasses.join(" ")
      ).join(" "),
      id: id
    }, decoration, dom);
    return hopDom;
  },
  renderHop: function(index) {
    var transformation = this.getTransformation();
    var hop;
    if (iInt(index)) {
      hop = transformation.getHop(index);
    }
    else
    if (iObj(index)) {
      hop = index;
    }
    var from = hop.from;
    var fromDom = this.getStepDom(from);
    from = transformation.getStep(from);

    var to = hop.to;
    var toDom = this.getStepDom(to);
    to = transformation.getStep(to);

    var hopDom = this.getHopDom(hop);
    if (!hopDom) {
      var hopClasses = hop.enabled === "Y" ? "hop-enabled" : "hop-disabled";
      hopDom = this.createHopDom(hop.from, hopClasses, hop.to);
    }
    var halfStepSize = this.stepSize / 2;
    var fromGui = from.GUI;
    var toGui = to.GUI;
    this.drawLine(
      hopDom,
      fromDom.offsetLeft + halfStepSize,
      fromDom.offsetTop + halfStepSize,
      toDom.offsetLeft + halfStepSize,
      toDom.offsetTop + halfStepSize
    );
  },
  renderHops: function() {
    var transformation = this.getTransformation();
    transformation.eachHop(function(index, hop){
      this.renderHop(index);
    }, this);
  },
  clear: function() {
    var dom = this.getDom();
    dom.innerHTML = "";
  },
  render: function(){
    this.clear();
    this.renderSteps();
    this.renderHops();
    this.renderNotepads();
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) el = this.createDom();
    return el;
  },
  editStep: function(step) {
    step = this.stepIdToStepName(step);
    var transformation = this.getTransformation();
    step = transformation.getStep(step);
    transformation.kettle.getStepTypeDialogModule({
      stepType: step.type,
      success: function(module) {
        debugger;
      },
      failure: function(){
        debugger;
      }
    });
  },
  dblClickHandler: function(event) {
    var target = event.getTarget();
    if (!hCls(target, "pdi-step")) return;
    this.editStep(target);
  },
  dispose: function(){
    unlisten(this.getDom(), this._dblClickHandler);
  }
};

PdiTransformationEditor.id = 0;
PdiTransformationEditor.prefix = "pdi-trans-editor";
PdiTransformationEditor.instances = {};
PdiTransformationEditor.getInstance = function(id){
    if (iInt(id)) id = PdiTransformationEditor.prefix + id;
    return PdiTransformationEditor.instances[id];
};
PdiTransformationEditor.lookup = function(el){
  var re = new RegExp("\\b" + PdiTransformationEditor.prefix + "\\b", "g");
  while (el && !re.test(el.className)) {
    if ((el = el.parentNode) === doc) return null;
  }
  return PdiTransformationEditor.getInstance(el.id);
};

PdiTransformationEditor.dndHopListener = {
  startDrag: function(event, dnd) {
    var target = event.getTarget();
    if (!event.getShiftKey() || !hCls(target, "pdi-step")) return false;
    var editor = PdiTransformationEditor.lookup(target);
    var transformation = editor.getTransformation();
    var fromStepName = editor.stepIdToStepName(target);
    var fromStep = transformation.getStep(fromStepName);
    var fromStepGui = fromStep.GUI;
    var halfStepSize = editor.stepSize / 2;
    dnd.dragInfo = {
      editor: editor,
      editorId: editor.getId(),
      transformation: transformation,
      fromStepName: fromStepName,
      halfStepSize: halfStepSize,
      hopDom: editor.createHopDom(fromStepName, ""),
      editorPos: pos(editor.getDom()),
      originX: parseInt(fromStepGui.xloc, 10) + halfStepSize,
      originY: parseInt(fromStepGui.yloc, 10) + halfStepSize
    };
    return true;
  },
  whileDrag: function(event, dnd) {
    if (!event.getShiftKey()) return false;
    var dragInfo = dnd.dragInfo;
    var hopDom = dragInfo.hopDom;
    var editor = dragInfo.editor
    var halfStepSize = dragInfo.halfStepSize;
    var x, y;
    var target = event.getTarget();
    if (hCls(target, "pdi-step")) {
      var transformation = dragInfo.transformation;
      var fromStepName = dragInfo.fromStepName;
      var toStepName = editor.stepIdToStepName(target);
      if (toStepName !== fromStepName && !transformation.getHop(fromStepName, toStepName)) {
        dragInfo.toStepName = toStepName;
        var toStep = transformation.getStep(toStepName);
        var toStepGui = toStep.GUI;
        x = parseInt(toStepGui.xloc, 10) + halfStepSize;
        y = parseInt(toStepGui.yloc, 10) + halfStepSize;
      }
      else {
        dragInfo.toStepName = null;
      }
    }
    if (iUnd(x)) {
      var xy = event.getXY();
      var editorPos = dragInfo.editorPos;
      x = (xy.x - editorPos.left) - 2;
      y = (xy.y - editorPos.top) - 2;
    }
    editor.drawLine(
      hopDom,
      dragInfo.originX, dragInfo.originY,
      x, y
    );
  },
  endDrag: function(event, dnd) {
    var dragInfo = dnd.dragInfo;
    var hopDom = dragInfo.hopDom;
    var target = event.getTarget();
    var toStepName = dragInfo.toStepName;
    if (event.getShiftKey() && hCls(target, "pdi-step") && toStepName !== null) {
      var transformation = dragInfo.transformation;
      var fromStepName = dragInfo.fromStepName;
      transformation.addHop(fromStepName, toStepName);
    }
    hopDom.parentNode.removeChild(hopDom);
    delete dnd.dragInfo;
  }
};

PdiTransformationEditor.dndStepListener = {
  startDrag: function(event, dnd) {
    var target = event.getTarget();
    if (event.getShiftKey() || !hCls(target, "pdi-step")) return false;
    var editor = PdiTransformationEditor.lookup(target);
    var selection = editor.getSelection();
    var transformation = editor.getTransformation();
    var stepName = editor.stepIdToStepName(target);
    if (!selection.isSelected(stepName)) {
      var items = {};
      items[stepName] = true;
      selection.setItems(items);
    }
    var originalXY = dnd.startDragEvent.getXY();
    dnd.dragInfo = {
      originalX: originalXY.x,
      originalY: originalXY.y,
      editor: editor,
      selection: selection,
      transformation: transformation
    };
    return true;
  },
  whileDrag: function(event, dnd) {
    var xy = event.getXY();
    var dragInfo = dnd.dragInfo;
    var x = xy.x - dragInfo.originalX;
    var y = xy.y - dragInfo.originalY;
    var selection = dragInfo.selection;
    var transformation = dragInfo.transformation;
    var editor = dragInfo.editor;
    selection.eachSelectedItem(function(index, step){
      var gui = step.GUI;
      var xloc = parseInt(gui.xloc, 10);
      var yloc = parseInt(gui.yloc, 10);
      var stepDom = editor.getStepDom(step);
      var style = stepDom.style;
      style.left = (xloc + x) + "px";
      style.top = (yloc + y) + "px";
    });
    selection.eachSelectedHop(function(index, hop){
      editor.renderHop(hop);
    });
  },
  endDrag: function(event, dnd) {
    var xy = event.getXY();
    var dragInfo = dnd.dragInfo;
    var x = xy.x - dragInfo.originalX;
    var y = xy.y - dragInfo.originalY;
    var selection = dragInfo.selection;
    var transformation = dragInfo.transformation;
    var editor = dragInfo.editor;
    selection.eachSelectedItem(function(index, step){
      var gui = step.GUI;
      var xloc = parseInt(gui.xloc, 10);
      var yloc = parseInt(gui.yloc, 10);
      var stepDom = editor.getStepDom(step);
      var style = stepDom.style;
      style.left = (gui.xloc = (xloc + x)) + "px";
      style.top = (gui.yloc = (yloc + y)) + "px";
    });
    selection.eachSelectedHop(function(index, hop){
      editor.renderHop(hop);
    });
    delete dnd.dragInfo;
  }
};

PdiTransformationEditor.listenToDnd = function(dnd) {
  dnd.listen(PdiTransformationEditor.dndHopListener);
  dnd.listen(PdiTransformationEditor.dndStepListener);
};

linkCss("../css/pdi-trans-editor.css");
})();
