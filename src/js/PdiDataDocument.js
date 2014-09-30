var PdiDataDocument;

(function(){

(PdiDataDocument = function(conf){
  DataDocument.call(this, conf);
  this.kettle = conf.kettle;
  this.setFile(conf.file || null);
}).prototype = {
  notepadPath: "notepads/notepad",
  connectionPath: "connection",
  getName: function() {
    return this.getDataAtPath(this.namePath, this.getRoot());
  },
  getConnections: function(){
    return this.getArrayAtPath(this.connectionPath, this.getRoot());
  },
  getConnection: function(index){
    return this.getConnections()[index];
  },
  eachConnection: function(callback, scope){
    this.eachElement(this.getConnections(), callback, scope);
  },
  getHops: function(){
    return this.getArrayAtPath(this.hopPath, this.getRoot());
  },
  getHop: function(index){
    return this.getHops()[index];
  },
  eachHop: function(callback, scope){
    this.eachElement(this.getHops(), callback, scope);
  },
  getNotepads: function() {
    return this.getArrayAtPath(this.notepadPath, this.getRoot());
  },
  getNotepad: function(index){
    return this.getNotepads()[index];
  },
  eachNotepad: function(callback, scope){
    this.eachElement(this.getNotepads(), callback, scope);
  },
  formatDate: function(date) {
    if (!date) date = new Date();
    var month = date.getMonth() + 1;
    if (month < 10) month = "0" + month;
    var day = date.getDate();
    if (day < 10) day = "0" + day;
    var hours = date.getHours();
    if (hours < 10) hours = "0" + hours;
    var minutes = date.getMinutes();
    if (minutes < 10) minutes = "0" + minutes;
    var seconds = date.getSeconds();
    if (seconds < 10) seconds = "0" + seconds;
    var millis = date.getMilliseconds();
    if (millis < 10) millis = "0" + millis;
    if (millis.length < 3) millis = "0" + millis;
    date = date.getFullYear() +
            "/" + month +
            "/" + day +
            " " + hours +
            ":" + minutes +
            ":" + seconds +
            "." + millis
    ;
    return date;
  },
  setModifiedDate: function(date) {
    this.setDataAtPath(this.modifiedDatePath, this.formatDate(date), merge.MERGE, this.getRoot());
  },
  setCreatedDate: function(date) {
    this.setDataAtPath(this.createdDatePath, this.formatDate(date), merge.MERGE, this.getRoot());
  }
};

adopt(PdiDataDocument, DataDocument);

})();
