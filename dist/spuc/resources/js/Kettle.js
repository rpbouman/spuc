var Kettle;

(function(){

(Kettle = function(conf){
  this.conf = conf || {};
  this.spuc = this.conf.spuc || new Spuc();
  this.phile = this.conf.phile || new Phile();
  this.jobEntryTypeCache = {};
  this.stepTypeCache = {};
}).prototype = {
  getStepTypes: function(conf){
    var me = this;
    var scope = conf.scope || this;
    if (me.stepTypes) {
      conf.success.call(scope, me.stepTypes);
    }
    else {
      me.spuc.getStepTypes({
        success: function(options, xhr, data) {
          me.stepTypes = data;
          conf.success.call(scope, me.stepTypes);
        },
        failure: function(options, xhr, exception) {
          conf.failure.call(scope, exception);
        }
      });
    }
  },
  eachStepType: function(callback, scope) {
    if (!scope) scope = this;
    var stepTypes = this.stepTypes;
    if (!stepTypes) throw "Steptypes not yet initialized.";
    var i, n = stepTypes.length;
    for (i = 0; i < n; i++) {
      if (callback.call(scope, i, stepTypes[i]) === false) return false;
    }
    return true;
  },
  getStepType: function(id) {
    if (iObj(id)) {
      id = id.type;
    }
    if (!iStr(id)) throw "invalid id";
    var ret, stepTypeCache = this.stepTypeCache;
    if (iUnd(ret = stepTypeCache[id])) {
      this.eachStepType(function(index, stepType){
        var ids = stepType.ids, i, n = ids.length;
        for (i = 0; i < n; i++){
          if (ids[i] === id) {
            ret = stepType;
            return false;
          }
        }
      });
      stepTypeCache[id] = ret;
    }
    return ret;
  },
  getStepTemplate: function(conf) {
    var stepTypeId = conf.type;
    var stepType = this.getStepType(stepTypeId);
    var stepTemplate = stepType["template"];
    var scope = conf.scope || this;
    var success = conf.success;
    if (stepTemplate) {
      success.call(scope, clone(stepTemplate));
    }
    else {
      this.spuc.getStepTemplate({
        type: stepTypeId,
        scope: this,
        success: function(options, xhr, data) {
          stepTemplate = parseXmlText(xhr.responseText);
          stepType["template"] = stepTemplate.step;
          success.call(scope, stepTemplate.step);
        },
        failure: function(options, xhr, exception){
          conf.failure.call(scope, exception);
        }
      });
    }
  },
  getJobEntryTypes: function(conf){
    var me = this;
    var scope = conf.scope || this;
    if (me.jobEntryTypes) {
      conf.success.call(scope, me.jobEntryTypes);
    }
    else {
      me.spuc.getJobEntryTypes({
        success: function(options, xhr, data) {
          me.jobEntryTypes = data;
          conf.success.call(scope, me.jobEntryTypes);
        },
        failure: function(options, xhr, exception) {
          conf.failure.call(scope, exception);
        }
      });
    }
  },
  eachJobEntryType: function(callback, scope) {
    if (!scope) scope = this;
    var jobEntryTypes = this.jobEntryTypes;
    if (!jobEntryTypes) throw "Steptypes not yet initialized.";
    var i, n = jobEntryTypes.length;
    for (i = 0; i < n; i++) {
      if (callback.call(scope, i, jobEntryTypes[i]) === false) return false;
    }
    return true;
  },
  getJobEntryType: function(id) {
    if (iObj(id)) {
      id = id.type;
    }
    if (!iStr(id)) throw "invalid id";
    var ret, jobEntryTypeCache = this.jobEntryTypeCache;
    if (iUnd(ret = jobEntryTypeCache[id])) {
      this.eachJobEntryType(function(index, jobEntryType){
        var ids = jobEntryType.ids, i, n = ids.length;
        for (i = 0; i < n; i++){
          if (ids[i] === id) {
            ret = jobEntryType;
            return false;
          }
        }
      });
      jobEntryTypeCache[id] = ret;
    }
    return ret;
  },
  createPdiTransformation: function(conf) {
    return new PdiTransformation({
      data: conf.data || {},
      kettle: this,
      file: conf.file || null
    });
  },
  getEmptyTransformation: function(conf){
    var me = this, scope = conf.scope || this;
    var emptyTransformation = this.emptyTransformation;
    if (emptyTransformation) {
      conf.success.call(scope, clone(emptyTransformation));
    }
    else {
      this.spuc.getEmptyTransformation({
        success: function(options, xhr, data) {
          emptyTransformation = parseXmlText(xhr.responseText);
          me.emptyTransformation = emptyTransformation;
          conf.success.call(scope, clone(emptyTransformation));
        },
        failure: function(options, xhr, exception) {
          conf.failure.call(scope, exception);
        }
      });
    }
  },
  newPdiTransformation: function(conf){
    var me = this;
    var scope = conf.scope || me;
    var docConf = {
      file: conf.file || null
    }
    if (conf.data) {
      docConf.data = conf.data;
      conf.success.call(scope, me.createPdiTransformation(docConf));
    }
    else {
      this.getEmptyTransformation({
        scope: scope,
        success: function(emptyTransformation){
          docConf.data = emptyTransformation;
          var transformation = me.createPdiTransformation(docConf);
          var dt = new Date();
          transformation.setCreatedDate(dt);
          transformation.setModifiedDate(dt);
          conf.success.call(scope, transformation);
        },
        failure: function(exception) {
          conf.failure.call(scope, exception);
        }
      });
    }
  },
  createPdiJob: function(data){
    return new PdiJob({
      data: data || {},
      kettle: this
    });
  },
  openFile: function(conf) {
    var me = this, file = conf.name;
    var scope = conf.scope || me;
    me.phile.getContents({
      path: file,
      headers: {
        Accept: "text/xml"
      },
      success: function(options, xhr, data){
        data = parseXmlText(xhr.responseText);
        var type, doc;
        if (/^.+\.ktr$/i.test(file)) {
          me.newPdiTransformation({
            data: data,
            success: conf.success,
            failure: conf.failure,
            file: file
          });
        }
        else
        if (/^.+\.kjb$/i.test(file)) {
          //TODO...
        }
        else {
          throw "Illegal file type."
        }
      },
      failure: function(options, xhr, exception){
        conf.failure.call(scope, exception);
      }
    });
  },
  savePdiDataDocument: function(conf) {
    var document = conf.document;
    var file = conf.file || document.getFile();
    var xml = document.getXml();
    this.phile.save({
      path: file,
      data: xml,
      success: function() {
        debugger;
      },
      failure: function() {
        debugger;
      },
    });
  },
  getStepTypeDialogModule: function(conf) {
    var stepType = this.getStepType(conf.stepType);
    if (stepType.stepTypeDialogModule) {
      conf.success(stepType.stepTypeDialogModule);
    }
    else {
      this.spuc.getStepTypeDialogModule({
        params: {
          steptypeid: conf.stepType
        },
        success: function(stepTypeDialogModule){
          stepType.stepTypeDialogModule = stepTypeDialogModule;
          conf.success(stepTypeDialogModule);
        },
        failure: conf.failure
      })
    }
  }
};

adopt(Kettle, Observable);

})();
