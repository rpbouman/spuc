/***************************************************************
*
*   Disabled
*
***************************************************************/
var Disabled;

(function() {
(Disabled = function(){
}).prototype = {
  isDisabled: function(){
    var dom = this.getDom();
    return Disabled.isDisabled(dom);
  },
  isEnabled: function(){
    return !this.isDisabled();
  },
  setEnabled: function(enabled) {
    var dom = this.getDom();
    if (enabled) {
      rCls(dom, "disabled", "");
    }
    else {
      aCls(dom, "disabled");
    }
  },
  enable: function(){
    Disabled.enable(this.getDom());
  },
  disable: function(){
    Disabled.disable(this.getDom());
  }
};

Disabled.isDisabled = function(dom) {
  dom = gEl(dom);
  return dom && hCls(dom, "disabled");
};

Disabled.isEnabled = function(dom) {
  dom = gEl(dom);
  return dom && !hCls(dom, "disabled");
};

Disabled.setDisabled = function(dom, disabled) {
  dom = gEl(dom);
  if (!dom) return;
  if (disabled) aCls(dom, "disabled");
  else rCls(dom, "disabled", "");
};

Disabled.disable = function(dom) {
  Disabled.setDisabled(dom, true);
};

Disabled.enable = function(dom) {
  Disabled.setDisabled(dom, false);
};


})();
