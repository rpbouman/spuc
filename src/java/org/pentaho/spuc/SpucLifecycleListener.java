package org.pentaho.spuc;

import java.io.File;

import java.net.URL;
import java.net.URI;
import java.net.URISyntaxException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletResponse;

import org.pentaho.platform.api.engine.IPluginLifecycleListener;
import org.pentaho.platform.api.engine.PluginLifecycleException;
import org.pentaho.platform.api.engine.IPluginResourceLoader;
import org.pentaho.platform.engine.core.system.PentahoSystem;

import org.pentaho.di.trans.TransMeta;

public class SpucLifecycleListener implements IPluginLifecycleListener {

  protected static SpucLifecycleListener instance = null;
  protected static TransMeta emptyTransMeta = null;

  protected static Map<String,Class> contentTypes = new HashMap<String, Class>();

  protected static File plugindir = null;
  protected static File libdir = null;
  protected static File pluginjar = null;
  protected static IPluginResourceLoader resourceLoader;
  protected static String SETTINGS = "settings/";

  protected static String DEFAULT_CONTENT_TYPE_SETTINGS = SETTINGS + "default-content-type";
  protected static String defaultContentType = "application/json";

  protected static String DEBUG_ENABLED_SETTINGS = SETTINGS + "debug-enabled";
  protected static String debugEnabled = "false";

  protected static String CONTENT_TYPE_SETTINGS = SETTINGS + "content-types" + "/";

  protected static String KETTLE_DIALOG_PATH_SETTINGS = SETTINGS + "kettle-dialogs";
  protected static File kettleDialogDir = null;
  protected static String DEFAULT_KETTLE_DIALOG_PATH = "resources/ui/dialogs";

  protected static String KETTLE_SRC_ARCHIVE_SETTINGS = SETTINGS + "kettle-src-archive";
  protected static File kettleSrcArchive = null;
  protected static String DEFAULT_KETTLE_SRC_ARCHIVE = "lib/pdi-ce-TRUNK-SNAPSHOT-sources.zip";

  protected static String getPluginSetting(String path, String defaultValue) {
    String value = resourceLoader.getPluginSetting(SpucContentGenerator.class, path, null);
    if (value == null) {
      System.out.println("Warning: plugin setting for \"" + path + "\" not found.");
      System.out.println("Falling back to default: " + (defaultValue == null? "null" : defaultValue));
      value = defaultValue;
    }
    return value;
  }

  protected static boolean getPluginSetting(String path, boolean defaultValue) {
    return Boolean.TRUE.toString().equals(
      getPluginSetting(
        path,
        defaultValue ? Boolean.TRUE.toString() : Boolean.FALSE.toString()
      )
    );
  }

  protected void initSteps(){

  }

  /**
   * Called just prior to the plugin being registered
   * with the platform.  Note: This event does *not*
   * precede the detection of the plugin by any {@link IPluginProvider}s
   * @throws PluginLifecycleException if an error occurred
   */
  public void init() throws PluginLifecycleException {
    try {
      SpucLifecycleListener.instance = this;
      resourceLoader = PentahoSystem.get(IPluginResourceLoader.class, null);
      initPluginDir();
      defaultContentType = getPluginSetting(DEFAULT_CONTENT_TYPE_SETTINGS, defaultContentType);
      debugEnabled = getPluginSetting(DEBUG_ENABLED_SETTINGS, debugEnabled);
      initKettleDialogDir();
      initKettleSrcArchive();
    } catch (Exception exception) {
      throw new PluginLifecycleException("An error occurred while loading the plugin.", exception);
    }
  }

  /**
   * Called after the plugin has been registered with the platform,
   * i.e. all content generators, components, etc. have been loaded.
   * @throws PluginLifecycleException if an error occurred
   */
  public void loaded() throws PluginLifecycleException {
  }

  /**
   * Called when the plugin needs to be unloaded. This
   * method should release all resources and return things
   * to a pre-loaded state.
   * @throws PluginLifecycleException if an error occurred
   */
  public void unLoaded() throws PluginLifecycleException {
    SpucLifecycleListener.instance = null;
  }

  public static SpucLifecycleListener getInstance() {
    return SpucLifecycleListener.instance;
  }

  public static String isDebugEnabled(){
    return debugEnabled;
  }

  public static String getDefaultContentType(){
    return defaultContentType;
  }

  public static File getKettleDialogDir(){
    return kettleDialogDir;
  }

  public static File getKettleSrcArchive(){
    return kettleSrcArchive;
  }

  public static File getPluginDir(){
    return plugindir;
  }

  protected static void initLibDir(){
    libdir = new File(getPluginDir(), "lib");
  }

  public static File getLibDir(){
    if (libdir == null) initLibDir();
    return libdir;
  }

  protected static void initPluginJar(){
    pluginjar = new File(getLibDir(), "spuc.jar");
  }

  public static File getPluginJar(){
    if (pluginjar == null) initPluginJar();
    return pluginjar;
  }

  public IDataRenderer getContentType(String contentType) throws SpucException {
    IDataRenderer dataRenderer = null;
    Class contentTypeHandlerClass = contentTypes.get(contentType);
    if (contentTypeHandlerClass == null) {
      String contentTypeTag = escapeTagName(contentType);
      String contentTypeClassName = getPluginSetting(CONTENT_TYPE_SETTINGS + contentTypeTag, null);
      if (contentTypeClassName == null) return null;
      try {
        contentTypeHandlerClass = Class.forName(contentTypeClassName);
        if (contentTypeHandlerClass.isInterface()) {
          throw new SpucException(
            contentTypeClassName + " is an interface, not a class.",
            HttpServletResponse.SC_INTERNAL_SERVER_ERROR
          );
        }
        Class iDataRenderer = IDataRenderer.class;
        if (!iDataRenderer.isAssignableFrom(contentTypeHandlerClass)) {
          throw new SpucException(
            "The specified class " + contentTypeClassName + " does not implement " + iDataRenderer.getName(),
            HttpServletResponse.SC_INTERNAL_SERVER_ERROR
          );
        }
        contentTypes.put(contentType, contentTypeHandlerClass);
      }
      catch (ClassNotFoundException classNotFoundException) {
        throw new SpucException(
          "Could not find contentTypeHandler class " + contentTypeClassName + " for requested content type (" + contentType + ")",
          HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
          classNotFoundException
        );
      }
    }
    try {
      dataRenderer = (IDataRenderer)contentTypeHandlerClass.newInstance();
    }
    catch (Exception exception) {
      throw new SpucException(
        "Couldn't instantiate content handler of type " + contentTypeHandlerClass.getName(),
        HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
        exception
      );
    }
    return dataRenderer;
  }

  protected void initKettleDialogDir() throws Exception {
    String kettleDialogPath = getPluginSetting(KETTLE_DIALOG_PATH_SETTINGS, DEFAULT_KETTLE_DIALOG_PATH);
    File file = new File(plugindir, kettleDialogPath);
    if (!file.exists()) {
      file.mkdir();
    }
    kettleDialogDir = file;
  }

  protected void initKettleSrcArchive() throws Exception {
    String fileLocation = getPluginSetting(KETTLE_SRC_ARCHIVE_SETTINGS, DEFAULT_KETTLE_SRC_ARCHIVE);
    kettleSrcArchive = new File(plugindir, fileLocation);
    if (!kettleSrcArchive.exists()) {
      throw new PluginLifecycleException("Kettle src archive " + kettleSrcArchive.getAbsolutePath() + " does not exist.");
    }
    if (!kettleSrcArchive.isFile()) {
      throw new PluginLifecycleException("Kettle src archive " + kettleSrcArchive.getAbsolutePath() + " is not a file.");
    }
  }

  protected void initPluginDir() throws URISyntaxException {
    List<URL>  list = resourceLoader.findResources(SpucContentGenerator.class, "plugin.xml");
    URL url = list.get(0);
    URI uri;
    uri = url.toURI();
    File file = new File(uri);
    plugindir = file.getParentFile();
  }

  public static String escapeTagName(String tagName) {
    StringBuilder escapedTagName = new StringBuilder();
    char ch;
    int n = tagName.length();
    for (int i = 0; i < n; i++) {
      ch = tagName.charAt(i);
      if (ch >= '0' && ch <= '9' || ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z'){
        escapedTagName.append(ch);
      }
      else {
        escapedTagName.append("_x");
        escapedTagName.append(Integer.toHexString((int)ch));
        escapedTagName.append("_");
      }
    }
    return escapedTagName.toString();
  }

  public static TransMeta getEmptyTransMeta(){
    if (instance.emptyTransMeta == null) {
      instance.emptyTransMeta = new TransMeta();
    }
    return instance.emptyTransMeta;
  }
}

