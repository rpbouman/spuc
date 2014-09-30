package org.pentaho.spuc;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import java.lang.reflect.Method;

import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;

import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletRequest;

import javax.tools.ToolProvider;

import org.apache.commons.logging.LogFactory;
import org.apache.commons.logging.Log;

import org.pentaho.di.core.plugins.PluginRegistry;
import org.pentaho.di.core.plugins.StepPluginType;
import org.pentaho.di.core.plugins.JobEntryPluginType;
import org.pentaho.di.core.plugins.PluginInterface;

import org.pentaho.di.trans.step.StepMetaInterface;
import org.pentaho.di.trans.step.StepMeta;

import org.pentaho.platform.api.repository.IContentItem;

import org.pentaho.platform.api.engine.IParameterProvider;
import org.pentaho.platform.api.engine.IPentahoSession;
import org.pentaho.platform.api.engine.IPluginResourceLoader;

import org.pentaho.platform.engine.core.system.PentahoSessionHolder;
import org.pentaho.platform.engine.core.system.PentahoSystem;

import org.pentaho.platform.engine.services.solution.BaseContentGenerator;

import org.pentaho.platform.util.UUIDUtil;


public class SpucContentGenerator extends BaseContentGenerator{

  public static final String PATH_ROOT = "";
  public static final String PATH_VERSION = "version";
  public static final String PATH_STEP_TYPES = "steptypes";
  public static final String PATH_STEP_TYPE_CATEGORIES = "steptypecategories";
  public static final String PATH_STEP_TEMPLATE = "steptemplate";
  public static final String PATH_STEP_DIALOG = "stepdialog";
  public static final String PATH_STEP_META = "stepmeta";
  public static final String PATH_EMPTY_TRANS = "emptytrans";
  public static final String PATH_JOBENTRY_TYPES = "jobentrytypes";
  public static final String PATH_JOBENTRY_TYPE_CATEGORIES = "jobentrytypecategories";

  public static final String PARAM_CATEGORY = "category";
  public static final String PARAM_STEP_TYPE_ID = "steptypeid";
  public static final String PARAM_DEBUG = "debug";

  public static final String version = "0.0.1";

  boolean debugEnabled = false;
  SpucLifecycleListener lifeCycleListener = SpucLifecycleListener.getInstance();
  IPluginResourceLoader resLoader = PentahoSystem.get(IPluginResourceLoader.class, null);
  IParameterProvider requestParameters = null;
  IParameterProvider pathParameters = null;
  IPentahoSession session = null;
  HttpServletRequest request;
  HttpServletResponse response;
  String method;
  String pathString;
  String[] path;
  OutputStream outputStream;
  IDataRenderer dataRenderer;
  Object responseData = null;

  public Log getLogger() {
    return LogFactory.getLog(SpucContentGenerator.class);
  }

  protected OutputStream getOutputStream(String mimeType) throws Exception {
    if (outputHandler == null) {
      throw new Exception("No output handler");
    }
    IContentItem contentItem = outputHandler.getOutputContentItem("response", "content", instanceId, mimeType);
    if (contentItem == null) {
      throw new Exception("No content item");
    }
    OutputStream outputStream = contentItem.getOutputStream(null);
    if (outputStream == null || !PentahoSystem.getInitializedOK() ) {
      throw new Exception("No output stream"); //$NON-NLS-1$
    }
    return outputStream;
  }

  protected void throwNotFound() throws SpucException {
    throw new SpucException(
      "Not found (" + pathString + ")",
      HttpServletResponse.SC_NOT_FOUND
    );
  }

  protected void throwMethodNotAllowed() throws SpucException {
    throw new SpucException(
      "Method " + method + " not allowed.",
      HttpServletResponse.SC_METHOD_NOT_ALLOWED
    );
  }

  protected void throwInternalServerError(String message) throws SpucException {
    throw new SpucException(
      message,
      HttpServletResponse.SC_INTERNAL_SERVER_ERROR
    );
  }

  protected void throwInternalServerError(String message, Throwable cause) throws SpucException {
    throw new SpucException(
      message,
      HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
      cause
    );
  }

  protected boolean initializeRequest() throws Exception {
    setInstanceId(UUIDUtil.getUUIDAsString());
    session = PentahoSessionHolder.getSession();
    pathParameters = parameterProviders.get("path");
    pathString = pathParameters.getStringParameter("path", "");
    if (pathString.length() > 0 && pathString.charAt(0) == '/') {
      pathString = pathString.substring(1);
    }
    if (pathString.length() > 0 && pathString.charAt(pathString.length() - 1) == '/') {
      pathString = pathString.substring(0, pathString.length() - 1);
    }
    path = pathString.split("/");
    request = (HttpServletRequest)pathParameters.getParameter("httprequest");
    method = request.getMethod();
    response = (HttpServletResponse)pathParameters.getParameter("httpresponse");
    if (!initContentType()) return false;
    requestParameters = parameterProviders.get(IParameterProvider.SCOPE_REQUEST);
    debugEnabled = Boolean.TRUE.toString().equals(
      requestParameters.getStringParameter(
        PARAM_DEBUG,
        SpucLifecycleListener.isDebugEnabled()
      )
    );
    return true;
  }

  protected boolean initContentType() throws IOException, Exception {
    String message;
    String contentType = null;
    String accept = request.getHeader("Accept");
    if (accept == null) {
      contentType = lifeCycleListener.getDefaultContentType();
      dataRenderer = lifeCycleListener.getContentType(contentType);
    }
    else {
      String[] acceptTypes = accept.split(",");
      int indexOfSemicolon;
      for (int i = 0; i < acceptTypes.length; i++){
        contentType = acceptTypes[i];
        indexOfSemicolon = contentType.indexOf(";");
        if (indexOfSemicolon != -1) {
          contentType = contentType.substring(0, indexOfSemicolon);
        }
        dataRenderer = lifeCycleListener.getContentType(contentType);
        if (dataRenderer != null) break;
      }
    }
    if (dataRenderer == null) {
      error("Error fetching " + pathString);
      message = "No contentTypeHandler found in settings.xml for requested content type (" + accept + ")";
      error(message);
      response.sendError(HttpServletResponse.SC_NOT_ACCEPTABLE, message);
      return false;
    }
    outputStream = getOutputStream(contentType);
    return true;
  }

  protected void handleRoot() {
    final String v = this.version;
    responseData = new Object() {
      public String version = v;
    };
  }

  protected void handleVersion(){
    responseData = version;
  }

  protected String getCategoryParameter() {
    return requestParameters.getStringParameter(PARAM_CATEGORY, null);
  }

  protected static Comparator<PluginInterface> createPluginComparator(final Class pluginType) {
    return new Comparator<PluginInterface>(){
      protected List<String> categories = listPluginCategories(pluginType);
      public int compare(PluginInterface a, PluginInterface b) {
        String aCategory = a.getCategory();
        String bCategory = b.getCategory();
        if (
          aCategory == null && bCategory == null ||
          aCategory != null && aCategory.equals(bCategory)
        ){
          return a.getName().compareTo(b.getName());
        }
        else {
          int aIndex = categories.indexOf(aCategory);
          int bIndex = categories.indexOf(bCategory);
          if (aIndex > bIndex) return 1;
          else
          if (aIndex < bIndex) return -1;
          else
          return 0;
        }
      }
    };
  }

  protected static List<PluginInterface> listPlugins(Class pluginType) {
    PluginRegistry registry = PluginRegistry.getInstance();
    List<PluginInterface> plugins;
    List<String> categories = listPluginCategories(pluginType);
    plugins = registry.getPlugins(pluginType);
    Collections.sort(plugins, createPluginComparator(pluginType));
    return plugins;
  }

  protected static List<String> listPluginCategories(Class pluginType) {
    PluginRegistry registry = PluginRegistry.getInstance();
    List<String> categories = registry.getCategories(pluginType);
    return categories;
  }

  protected static List<PluginInterface> stepTypes = null;
  protected void handleStepTypes(){
    if (stepTypes == null) {
      stepTypes = listPlugins(StepPluginType.class);
    }
    responseData = stepTypes;
  }

  protected static List<String> stepTypeCategories = null;
  protected void handleStepTypeCategories(){
    if (stepTypeCategories == null) {
      stepTypeCategories = listPluginCategories(StepPluginType.class);
    }
    responseData = stepTypeCategories;
  }

  protected static List<PluginInterface> jobEntryTypes = null;
  protected void handleJobEntryTypes() throws Exception {
    if (jobEntryTypes == null) {
      jobEntryTypes = listPlugins(JobEntryPluginType.class);
    }
    responseData = jobEntryTypes;
  }

  protected static List<String> jobEntryTypeCategories = null;
  protected void handleJobEntryTypeCategories(){
    if (jobEntryTypeCategories == null) {
      jobEntryTypeCategories = listPluginCategories(JobEntryPluginType.class);
    }
    responseData = jobEntryTypeCategories;
  }

  protected String getStepTypeIdParameter() {
    return requestParameters.getStringParameter(PARAM_STEP_TYPE_ID, null);
  }

  protected StepMetaInterface getStepMetaInterface() throws Exception {
    PluginRegistry registry = PluginRegistry.getInstance();
    PluginInterface pluginInterface = registry.findPluginWithId(
      StepPluginType.class,
      getStepTypeIdParameter()
    );
    StepMetaInterface stepMetaInterface = (StepMetaInterface)registry.loadClass(pluginInterface);
    return stepMetaInterface;
  }

  protected StepMeta getStepMeta() throws Exception {
    StepMetaInterface stepMetaInterface = getStepMetaInterface();
    stepMetaInterface.setDefault();
    StepMeta stepMeta = new StepMeta("", stepMetaInterface);
    return stepMeta;
  }

  protected void handleStepTemplate() throws Exception {
    responseData = getStepMeta();
  }

  protected void handleStepDialog() throws Exception {
    StepMetaInterface stepMetaInterface = getStepMetaInterface();
    String dialogClassName = stepMetaInterface.getDialogClassName();
    handleJavaToJavaScript(dialogClassName);
  }

  protected void handleStepMeta() throws Exception{
    StepMetaInterface stepMetaInterface = getStepMetaInterface();
    handleJavaToJavaScript(stepMetaInterface.getClass().getName());
  }

  protected void handleJavaToJavaScript(String className) throws Exception{
    File dialogDir = lifeCycleListener.getKettleDialogDir();
    File srcArchive = lifeCycleListener.getKettleSrcArchive();
    File pluginjar = lifeCycleListener.getPluginJar();

    try {
      URI pluginJarUri = pluginjar.toURI();
      URL pluginJarUrl = pluginJarUri.toURL();
      ClassLoader toolsProviderClassLoader = ToolProvider.getSystemToolClassLoader();
      URLClassLoader urlClassLoader = URLClassLoader.newInstance(
        new URL[]{pluginJarUrl},
        toolsProviderClassLoader
      );
      Class cls = urlClassLoader.loadClass("org.pentaho.spuc.JavaToJavascriptTranslator");
      Method m = cls.getDeclaredMethod("translate", String.class, File.class, File.class);
      Object o = m.invoke(null, className, dialogDir, srcArchive);
      responseData = o;
    }
    catch (Exception ex) {
      ex.printStackTrace();
    }
  }

  protected void handleEmptyTrans() throws Exception {
    responseData = lifeCycleListener.getEmptyTransMeta();
  }

  protected void handleRequest() throws Exception {
    //TODO: check request type
    switch (path.length) {
      case 0:
        break;
      case 1:
        if (PATH_ROOT.equals(path[0])) {
          handleRoot();
        }
        else
        if (PATH_VERSION.equals(path[0])){
          handleVersion();
        }
        else
        if (PATH_STEP_TYPES.equals(path[0])){
          handleStepTypes();
        }
        else
        if (PATH_STEP_TYPE_CATEGORIES.equals(path[0])){
          handleStepTypeCategories();
        }
        else
        if (PATH_STEP_TEMPLATE.equals(path[0])){
          handleStepTemplate();
        }
        else
        if (PATH_STEP_META.equals(path[0])){
          handleStepMeta();
        }
        else
        if (PATH_STEP_DIALOG.equals(path[0])){
          handleStepDialog();
        }
        else
        if (PATH_EMPTY_TRANS.equals(path[0])){
          handleEmptyTrans();
        }
        else
        if (PATH_JOBENTRY_TYPES.equals(path[0])){
          handleJobEntryTypes();
        }
        else
        if (PATH_JOBENTRY_TYPE_CATEGORIES.equals(path[0])){
          handleJobEntryTypeCategories();
        }
        else {
          throwNotFound();
        }
        break;
    }
  }

  protected void renderData(Object data) throws Exception {
    dataRenderer.render(outputStream, data);
  }

  protected void renderData() throws Exception {
    renderData(responseData);
  }

  protected void cleanUp(){
  }

  public void createContent() throws Exception {
    SpucException spucException = null;
    try {
      initializeRequest();
      handleRequest();
      renderData();
    }
    catch (SpucException exception1) {
      spucException = exception1;
      //renderData(exception1);
    }
    catch (Exception exception2) {
      spucException = new SpucException(exception2.getMessage(), HttpServletResponse.SC_INTERNAL_SERVER_ERROR, exception2);
      //renderData(exception2);
    }
    finally {
      cleanUp();
    }
    if (spucException != null) {
      response.setStatus(spucException.getCode());
      spucException.sendError(response);
      throw spucException;
    }
  }

}
