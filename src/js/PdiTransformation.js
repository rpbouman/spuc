var PdiTransformation;
(function(){

(PdiTransformation = function(conf){
  if (!conf) conf = {};
  PdiDataDocument.call(this, conf);
}).prototype = {
  fileExtension: "ktr",
  rootPath: "transformation",
  namePath: "info/name",
  hopPath: "order/hop",
  stepPath: "step",
  modifiedDatePath: "info/modified_date",
  createdDatePath: "info/created_date",
  getFileExtension: function() {
    return this.fileExtension;
  },
  getSteps: function(){
    return this.getArrayAtPath(this.stepPath, this.getRoot());
  },
  getHop: function(fromStepName, toStepName) {
    var h;
    if (this.eachHop(function(index, hop){
      if (hop.from === fromStepName && hop.to === toStepName) {
        h = hop;
        return false;
      }
    })===false) {
      return h;
    }
    return null;
  },
  getStep: function(index){
    var steps = this.getSteps();
    if (iInt(index)) {
      return steps[index];
    }
    else
    if (iStr(index)){
      var i, n = steps.length, step;
      for (i = 0; i < n; i++) {
        step = steps[i];
        if (step.name === index) return step;
      }
      return null;
    }
    else {
      throw "Invalid index";
    }
  },
  eachStep: function(callback, scope){
    this.eachElement(this.getSteps(), callback, scope);
  },
  getNameForNewStep: function(name) {
    var max = 0, num;
    var re = new RegExp("^" + name + "( (\\d+))?$");
    this.eachStep(function(index, step){
      var match;
      re.lastIndex = 0;
      if (match = re.exec(step.name)) {
        num = match[2];
        if (num) num = parseInt(num, 10);
        else num = 0;
        if (num > max) max = num;
      }
    });
    if (iDef(num)) {
      name += " " + (num + 1);
    }
    return name;
  },
  addStep: function(type, x, y, config) {
    if (this.fireEvent("beforeAddStep", {
      type: type,
      x: x,
      y: y
    }) === false) return;
    var kettle = this.kettle;
    var stepType = kettle.getStepType(type);
    kettle.getStepTemplate({
      type: type,
      scope: this,
      success: function(stepTemplate){
        var gui = stepTemplate.GUI;
        gui.xloc = x;
        gui.yloc = y;
        gui.draw = "Y";
        stepTemplate.name = this.getNameForNewStep(stepType.name);
        var index = this.appendToArrayAtPath(this.stepPath, stepTemplate, this.getRoot());
        this.fireEvent("stepAdded", {
          index: index,
          step: stepTemplate
        });
      },
      failure: function() {
      }
    });
  },
  addHop: function(fromStepName, toStepName){
    var fromStep = this.getStep(fromStepName);
    if (!fromStep) throw "Invalid step: " + fromStepName;
    var toStep = this.getStep(toStepName);
    if (!toStep) throw "Invalid step: " + toStepName;
    if (this.getHop(fromStepName, toStepName)) throw "A hop from " + fromStepName + " to " + toStepName + " already exists.";
    var hop = {
      from: fromStepName,
      to: toStepName,
      enabled: "Y"
    };
    if (this.fireEvent("beforeAddStep", hop) === false) return;
    var index = this.appendToArrayAtPath(this.hopPath, hop, this.getRoot());
    hop.index = index;
    this.fireEvent("hopAdded", hop);
    delete hop.index;
  }
};

adopt(PdiTransformation, PdiDataDocument);

})();
