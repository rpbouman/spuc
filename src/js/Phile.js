/*
    Copyright 2009-2013 Roland Bouman
    contact: Roland.Bouman@gmail.com ~ http://rpbouman.blogspot.com/ ~ http://code.google.com/p/xmla4js
    twitter: @rolandbouman

    This is phile4js - a stand-alone, cross-browser javascript library
    for working with Pentaho repository files.
    Phile, pronounced as "file" is an acronym for PentHO fILEs.
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

var Phile;

(function(){

function escapePath(path){
  return path.replace(/\//g, ":");
}

Phile = function(options) {
  this.options = merge({}, options, Phile.defaultOptions);
}

Phile.prototype = {
  request: function(conf){
    var scope = conf.scope || window;
    var success = conf.success;
    var failure = conf.failure;
    var url = this.options.service;
    var path = conf.path;
    if (path) {
      path = iArr(path) ? path.join(":") : escapePath(path);
      url += path;
    }
    conf.url = url;
    if (conf.action) url += "/" + conf.action;
    if (!conf.headers) conf.headers = {};
    if (!conf.headers.Accept) conf.headers.Accept = "application/json";
    ajax(conf);
  },
  getChildren: function(conf) {
    if (!conf.params) conf.params = {};
    conf.params.depth = 1;
    conf.action = "children";
    conf.method = "GET";
    this.request(conf);
  },
  getTree: function(conf) {
    if (!conf.params) conf.params = {};
    conf.params.depth = 0;
    conf.action = "children";
    conf.method = "GET";
    this.request(conf);
  },
  getContents: function(conf) {
    conf.action = null;
    conf.method = "GET";
    this.request(conf);
  },
  getProperties: function(conf) {
    conf.action = "properties";
    conf.method = "GET";
    this.request(conf);
  },
  save: function(conf) {
    conf.method = "PUT";
    var _success, _scope;
    if (conf.success) {
      _success = conf.success;
      _scope = conf.scope || null;
    }
    var success = function(options, xhr, data){
      var mantle_fireEvent = window.top.mantle_fireEvent;
      if (iFun(mantle_fireEvent)) {
        mantle_fireEvent.call(window.top, "GenericEvent", {"eventSubType": "RefreshBrowsePerspectiveEvent"});
        mantle_fireEvent.call(window.top, "GenericEvent", {"eventSubType": "RefreshCurrentFolderEvent"});
      }
      if (iFun(_success)) {
        _success.call(_scope, options, xhr, data);
      }
    }
    conf.success = success;
    this.request(conf);
  }
}

Phile.defaultOptions = {
    requestTimeout: 30000,      //by default, we bail out after 30 seconds
    async: true,               //by default, we do a synchronous request
    service: "/pentaho/api/repo/files/"
};

})();
