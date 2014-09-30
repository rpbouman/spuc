/***************************************************************
*
*   Displayed
*
***************************************************************/
var Displayed;

(function() {
(Displayed = function(){
}).prototype = {
  isHidden: function() {
    return Displayed.isHidden(this.getDom());
  },
  isVisible: function() {
    return !this.isHidden();
  },
  setDisplayed: function(displayed) {
    Displayed.setDisplayed(this.getDom(), displayed);
  },
  show: function() {
    this.setDisplayed(true);
  },
  hide: function() {
    this.setDisplayed(false);
  }
};

Displayed.isHidden = function(dom) {
  dom = gEl(dom);
  return (!dom) || (dom.style.display === "none");
};

Displayed.isVisible = function(dom) {
  return Displayed.isHidden(dom);
};

Displayed.setDisplayed = function(dom, displayed) {
  dom = gEl(dom);
  if (!dom) return;
  dom.style.display = displayed ? "" : "none";
};

Displayed.show = function(dom) {
  Displayed.setDisplayed(dom, true);
};

Displayed.hide = function(dom) {
  Displayed.setDisplayed(dom, false);
};


})();
