var PdiJobEditor;

(function(){

(PdiJobEditor = function(conf){
  this.conf = conf;
  this.id = conf.id ? conf.id : ++PdiJobEditor.id;
  if (!conf.job) conf.job = new PdiJob();
  PdiJobEditor.instances[this.getId()] = this;
}).prototype = {
  getType: function(){
    return PdiJobEditor.prefix;
  },
  getId: function(){
    return PdiJobEditor.prefix + ":" + this.id;
  },
  createDom: function(){
    var conf = this.conf;
    var id = this.getId();
    var el = cEl("div", {
      "class": confCls(PdiJobEditor.prefix, conf),
      id: id,
      style: conf.style || ""
    });
    return el;
  },
  getJob: function() {
    return this.conf.job;
  },
  renderJobEntry: function(index) {
    var job = this.getJob();
    var jobEntry = job.getJobEntry(index);
  },
  renderJobEntries: function(){
    var job = this.getJob();
    job.eachJobEntry(function(index, step){
      this.renderJobEntry(index);
    }, this);
  },
  renderNotepad: function(index) {
    var job = this.getJob();
    var notepad = job.getNotepad(index);
  },
  renderNotepads: function(){
    var job = this.getJob();
    job.eachNotepad(function(index, notepad){
      this.renderNotepad(index);
    }, this);
  },
  render: function(){
    this.renderJobEntries();
    this.renderNotepads();
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) el = this.createDom();
    return el;
  },
};

PdiJobEditor.id = 0;
PdiJobEditor.prefix = "pdi-job-editor";
PdiJobEditor.instances = {};
PdiJobEditor.getInstance = function(id){
    if (iInt(id)) id = PdiJobEditor.prefix + id;
    return PdiJobEditor.instances[id];
};
PdiJobEditor.lookup = function(el){
  var re = new RegExp("\\b" + PdiJobEditor.prefix + "\\b", "g");
  while (el && !re.test(el.className)) {
    if ((el = el.parentNode) === doc) return null;
  }
  return PdiJobEditor.getInstance(el.id);
};

linkCss("../css/pdi-job-editor.css");
})();
