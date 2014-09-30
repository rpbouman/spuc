var PdiJob;
(function(){

(PdiJob = function(conf){
  if (!conf) conf = {};
  var data = conf.data || {};
  DataDocument.call(this, data);
  this.kettle = conf.kettle;
}).prototype = {
  rootPath: "job",
  jobEntryPath: "entries/entry",
  namePath: "name",
  getJobEntries: function(){
    return this.getArrayAtPath(this.jobEntryPath, this.getRoot());
  },
  getJobEntry: function(index){
    return this.getJobEntries()[index];
  },
  eachJobEntry: function(callback, scope){
    this.eachElement(this.getJobEntries(), callback, scope);
  }
};

adopt(PdiJob, PdiDataDocument);

})();
