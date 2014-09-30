(function(){

var kettle = new Kettle();

var dnd = new DDHandler({
  node: body
});
SplitPane.listenToDnd(dnd);

//handle dragging steps unto the canvas.
dnd.listen({
  startDrag: function(event, dnd) {
    var el = event.getTarget();
    if (!hCls(el, "label")) return false;
    el = el.parentNode;
    if (!hCls(el, "head")) return false;
    el = el.parentNode;
    if (!hCls(el, "node")) return false;
    if (!hCls(el, "org.pentaho.di.core.plugins.StepPluginType")) return false;

    var tree = fEl(el, "tree");
    var scrollLeft = tree.scrollLeft;
    var scrollTop = tree.scrollTop
    dnd.startDragEvent.scrollLeft = scrollLeft;
    dnd.startDragEvent.scrollTop = scrollTop;
/*
    var treePos = pos(tree);
    tree.firstChild.style.position = "fixed";
    tree.firstChild.style.top = (treePos.top - scrollTop)+"px";
    tree.lastChild.style.position = "fixed";
    tree.lastChild.style.top = (treePos.top - scrollTop)+"px";
*/
    var stepType = el.id.substr("node:org.pentaho.di.core.plugins.StepPluginType:".length);
    dnd.currentStepType = stepType;
    stepType = kettle.getStepType(stepType);
    var proxy = dnd.dragProxy;
    proxy.className = "pdi-step";
    proxy.style.backgroundImage = "url('../" + stepType.image + "')";
    Displayed.show(proxy);
    var xy = event.getXY();
    var dragProxyStyle = dnd.dragProxy.style;
    dragProxyStyle.left = (xy.x + 2) + "px";
    dragProxyStyle.top = (xy.y + 2) + "px";
    return true;
  },
  whileDrag: function(event, dnd) {
    var xy = event.getXY();
    var dragProxyStyle = dnd.dragProxy.style;
    dragProxyStyle.left = (xy.x + 2) + "px";
    dragProxyStyle.top = (xy.y + 2) + "px";
/*
    var startDragEvent = dnd.startDragEvent;
    var node = startDragEvent.getTarget();
    var tree = fEl(node, "tree");
    setTimeout(function(){tree.scrollLeft = startDragEvent.scrollLeft;}, 1);
*/
  },
  endDrag: function(event, dnd){
    var startDragEvent = dnd.startDragEvent;
    var node = startDragEvent.getTarget();
    var tree = fEl(node, "tree");
/*
    tree.firstChild.style.position = "";
    tree.lastChild.style.position = "";
*/
    tree.scrollLeft = startDragEvent.scrollLeft;
    tree.scrollTop = startDragEvent.scrollTop;

    var target = event.getTarget();
    var stepType = dnd.currentStepType;
    delete dnd.currentStepType;
    var proxy = dnd.dragProxy;
    proxy.className = "";
    proxy.style.backgroundImage = "";
    Displayed.hide(proxy);
    if (!hCls(target, "pdi-trans-editor")) return;
    if (!hCls(target.parentNode, "tabpane-components")) return;
    var editorPos = pos(target);
    var editor = PdiTransformationEditor.getInstance(target.id);
    var transformation = editor.getTransformation();
    var xy = event.getXY();
    transformation.addStep(stepType, (xy.x - editorPos.left) - 1, (xy.y - editorPos.top) - 1);
  }
});

PdiTransformationEditor.listenToDnd(dnd);

function newTrans(){
  kettle.newPdiTransformation({
    scope: this,
    success: function(transformation) {
      openEditor(transformation);
    },
    failure: function(exception) {
      debugger;
    }
  })
}

function showMessage(title, text){
  var parent = win.parent;
  if (parent && iFun(parent.mantle_showMessage)) {
    parent.mantle_showMessage(title, text);
  }
  else {
    alert(title + "\n\n" + text);
  }
}

function newJob(doc){
  showMessage("Not implemented", "Sorry, I'm not yet implemented");
  return;
  openEditor(kettle.newPdiJob());
}

function openEditor(doc){
  var editor;
  if (doc instanceof PdiTransformation) {
    editor = new PdiTransformationEditor({
      transformation: doc
    });
  }
  else
  if (doc instanceof PdiJob) {
    editor = new PdiJobEditor({
      job: doc
    });
  }
  else throw "Invalid document";
  mainTabPane.addTab({
    text: doc.getName() || editor.getId(),
    "class": editor.getType(),
    selected: true,
    component: editor,
    closeable: true
  });
  editor.render();
}

var lastPath = "/";
function openFile(){
  var win = window.parent || window.opener;
  if (!win) {
    alert("No window to open file dialog from.");
    return;
  }
  win.openFileDialogWithPath({
    fileSelected: function(solution, fullname, name) {
      kettle.openFile({
        name: fullname,
        success: function(doc){
          openEditor(doc);
          lastPath = fullname.substr(0, fullname.length - name.length);
        },
        failure: function(exception){
          debugger;
        }
      });
    }
  }, lastPath, "Open a Kettle file", "Open", "kjb,ktr");
/*
  win.openFileChooserDialog({
    fileSelected: function(solution, fullname, name) {
      kettle.openFile({
        name: fullname,
        success: function(doc){
          openEditor(doc);
          lastPath = fullname.substr(0, fullname.length - name.length);
        },
        failure: function(exception){
          debugger;
        }
      });
    },
    dialogCanceled: function(){
    }
  }, lastPath);
*/
}

function saveDocument(document) {
  kettle.savePdiDataDocument({
    document: document
  });
}

function saveAs(){
  var document = getCurrentDocument();
  if (!document) return;
  var win = window.parent || window.opener;
  if (!win) {
    alert("No window to open file dialog from.");
    return;
  }
  win.saveFileChooserDialog({
    fileSelected: function(path, pathName, fileName) {
      var ext;
      var extIndex = fileName.lastIndexOf(".");
      var docExt = document.getFileExtension();
      if (extIndex === -1 || fileName.substr(extIndex + 1) !== docExt) {
        fileName += "." + docExt;
      }
      //pathName = path.path.substr(0, path.path.length - path.name_0.length);
      lastPath = pathName;
      if (pathName.substr(pathName.length - 1) !== "/") pathName += "/";
      var file = pathName + fileName;
      document.setFile(file);
      saveDocument(document);
    },
    dialogCanceled: function() {
    }
  }, lastPath);
}

function save(){
  var document = getCurrentDocument();
  if (!document) return;
  if (!document.getFile()) {
    saveAs();
    return;
  }
  saveDocument(document);
}

var mainToolbar = new Toolbar({
  container: body,
});
mainToolbar.addButton([
  {"class": "new-trans", tooltip: "New Transformation"},
  {"class": "new-job", tooltip: "New Job"},
  {"class": "separator"},
  {"class": "open", tooltip: "Open"},
  {"class": "separator"},
  {"class": "save", tooltip: "Save"},
  {"class": "save-as", tooltip: "Save As..."},
]);
mainToolbar.listen({
  "buttonPressed": function(toolbar, event, button){
    var conf = button.conf;
    var className = conf["class"];
    switch (className) {
      case "new-trans":
        newTrans();
        break;
      case "new-job":
        newJob();
        break;
      case "open":
        openFile();
        break;
      case "save":
        save();
        break;
      case "save-as":
        saveAs();
        break;
      default:
        throw "Not implemented";
    }
  }
});

var sideBar = new TabPane({
  classes: ["sidebar"]
});

var mainTabPane = new TabPane({
  classes: ["maintabpane"]
});

mainTabPane.listen(["tabSelected", "beforeCloseTab"], function(tabPane, event, data){
  var show, hide;
  switch (event) {
    case "tabSelected":
      var index = data.newTab;
      var tab = tabPane.getTab(index);
      var tabClass = tab["class"];
      var oldIndex = data.oldTab;
      if (iDef(oldIndex) && oldIndex !== null) {
        var oldTab = tabPane.getTab(oldIndex);
        if (oldTab["class"] === tabClass) return;
      }
      switch (tabClass) {
        case "pdi-trans-editor":
          show = [stepTypesTree];
          hide = [jobEntryTypesTree]
          break;
        case "pdi-job-editor":
          show = [jobEntryTypesTree];
          hide = [stepTypesTree]
          break;
      }
      break;
    case "beforeCloseTab":
      var tab = tabPane.getTab(data.oldTab);
      var editor = tab.component;
      editor.dispose();
      if (tabPane.getTabCount() === 1) {
        hide = [stepTypesTree, jobEntryTypesTree];
      }
      break;
  }
  var i, n = 2;
  for (i = 0; i < n; i++){
    if (iDef(show) && i < show.length) Displayed.show(show[i]);
    if (iDef(hide) && i < hide.length) Displayed.hide(hide[i]);
  }
});

function getCurrentEditor() {
  var selectedTab = mainTabPane.getSelectedTab();
  if (selectedTab === null) return null;
  return selectedTab.component;
}

function getCurrentDocument() {
  var currentEditor = getCurrentEditor();
  if (currentEditor === null) return null;
  return currentEditor.getDocument();
}

var mainSplitPane = new SplitPane({
  classes: ["mainsplitpane"],
  container: body,
  firstComponent: sideBar,
  secondComponent: mainTabPane,
  orientation: SplitPane.orientations.vertical
});
mainSplitPane.createDom();

var pdiEditorSelector = new PdiEditorSelector({
  dnd: dnd
});

var viewTreePane = new ContentPane({
  classes: [
    "tree",
    "contentpane-noselect"
  ]
//  title: "Explorer"
});
sideBar.addTab({
  text: "View",
  classes: ["sidebar-view"],
  component: viewTreePane
});

var designTreePane = new ContentPane({
  classes: [
    "tree",
    "contentpane-noselect"
  ]
//  title: "Steps"
});
sideBar.addTab({
  text: "Design",
  classes: ["sidebar-design"],
  selected: true,
  component: designTreePane
});

function pluginSorter(a, b){
  if (a.category > b.category) {
    return 1;
  }
  else
  if (a.category < b.category) {
    return -1
  }
  else
  if (a.name > b.name) {
    return 1;
  }
  else
  if (a.name < b.name) {
    return -1;
  }
  return 0;
}
function renderPluginTree(plugins, container){
  //plugins.sort(pluginSorter);
  var n = plugins.length, i, plugin, category, categoryNode, id, type;
  for (i = 0; i < n; i++) {
    plugin = plugins[i];
    type = plugin.type;

    if (plugin.category !== category) {
      category = plugin.category;
      categoryNode = new TreeNode({
        id: type + ":category:" + category,
        classes: ["category", type + "-category"],
        title: category,
        tooltip: plugin.description,
        parentElement: container
      });
    }

    id = type + ":" + plugin.ids[0];
    new TreeNode({
      id: id,
      classes: [type, plugin.ids[0]],
      title: plugin.name,
      tooltip: plugin.description,
      icon: "../" + plugin.image,
      state: TreeNode.states.leaf,
      parentTreeNode: categoryNode
    });
  }
}

var jobEntryTypesTree = cEl("DIV", {
  id: "job-entry-types",
  "class": "job-entry-types",
});
Displayed.setDisplayed(jobEntryTypesTree, false);
var designTreePaneDom = designTreePane.getDom();
aCh(designTreePaneDom, jobEntryTypesTree);
kettle.getJobEntryTypes({
  success: function(data) {
    renderPluginTree(data, jobEntryTypesTree);
  }
});

var stepTypesTree = cEl("DIV", {
  id: "step-types",
  "class": "step-types"
});
Displayed.setDisplayed(stepTypesTree, false);
aCh(designTreePaneDom, stepTypesTree);
kettle.getStepTypes({
  success: function(data) {
    renderPluginTree(data, stepTypesTree);
  }
});
new TreeListener({container: designTreePaneDom});
mainSplitPane.setSplitterPosition("300px");

linkCss("../css/styles.css");
}());
