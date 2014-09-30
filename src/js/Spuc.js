/*
    Copyright 2009,2010,2011 Roland Bouman
    contact: Roland.Bouman@gmail.com ~ http://rpbouman.blogspot.com/ ~ http://code.google.com/p/xmla4js
    twitter: @rolandbouman

    This is spuc - a stand-alone, cross-browser javascript library
    for working with Pentaho data integration (aka kettle).
    Spuc, pronounced as "file" is an acronym for PentHO fILEs.
    Pentaho is a leading open source business intelligence platform.
    Pentaho has a repository for storing content.
    The repository is organized resembling a directory/file system.
    phile4js enables web applications to access files in the pentaho repository/

    This file contains human-readable javascript source along with the YUI Doc compatible annotations.
    Include this in your web-pages for debug and development purposes only.
    For production purposes, consider using the minified/obfuscated versions in the /js directory.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Spuc;

(function(){

Spuc = function(options) {
  this.options = merge({}, options, Spuc.defaultOptions);
}

Spuc.prototype = {
  request: function(conf){
    if (!conf) conf = {};
    var scope = conf.scope || window;
    var success = conf.success;
    var failure = conf.failure;
    var url = this.options.service;
    var action = conf.action;
    if (action) {
      url += "/" + action;
    }
    conf.url = url;
    if (!conf.headers) conf.headers = {};
    if (!conf.headers.Accept) conf.headers.Accept = "application/json";
    ajax(conf);
  },
  getEmptyTransformation: function(conf) {
    conf.action = "emptytrans";
    conf.headers = {
      Accept: "application/xml"
    };
    this.request(conf);
  },
  getStepTypes: function(conf) {
    conf.action = "steptypes";
    this.request(conf);
  },
  getStepTemplate: function(conf) {
    conf.action = "steptemplate";
    conf.params = {
      steptypeid: conf.type
    }
    conf.headers = {
      Accept: "application/xml"
    };
    this.request(conf);
  },
  getJobEntryTypes: function(conf) {
    conf.action = "jobentrytypes";
    this.request(conf);
  },
  getStepTypeDialogModule: function(conf){
    conf.action = "stepdialog";
    conf.headers = {
      Accept: "application/javascript"
    };
    this.request(conf);
  }
}

Spuc.defaultOptions = {
    requestTimeout: 30000,      //by default, we bail out after 30 seconds
    async: true,               //by default, we do a synchronous request
    service: "/pentaho/content/spuc"
};

})();
