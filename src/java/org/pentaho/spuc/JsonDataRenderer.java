package org.pentaho.spuc;

import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.Member;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.DatabaseMetaData;

import java.io.OutputStream;
import java.io.File;
import java.io.FileInputStream;

import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.List;

import org.pentaho.di.core.plugins.PluginInterface;

public class JsonDataRenderer implements IDataRenderer {

  protected OutputStream outputStream;
  protected static Map<Class, Map<String, Member>> members = new HashMap<Class, Map<String, Member>>();
  protected Map<Object, String> recursionGuard = new HashMap<Object, String>();

  public JsonDataRenderer() {
  }

  public void render(OutputStream outputStream, Object o) throws Exception {
    this.outputStream = outputStream;
    render(o);
  }

  protected void render(Object o) throws Exception {
    if (o == null) {
      renderPrimitive("null");
    }
    else
    if (o instanceof String) {
      renderString((String)o);
    }
    else
    if (o instanceof Date) {
      renderString(o.toString());
    }
    else
    if (o instanceof Character) {
      renderString(((Character)o).toString());
    }
    else
    if (o instanceof Boolean
    ||  o instanceof Number
    ) {
      renderPrimitive(o);
    }
    else
    if (o instanceof ResultSet) {
      renderResultSet((ResultSet)o);
    }
    else
    if (o instanceof ResultSetMetaData) {
      renderResultSetMetaData((ResultSetMetaData)o);
    }
    else
    if (o instanceof Map) {
      renderMap((Map<String, Object>)o);
    }
    else
    if (o instanceof List) {
      renderList((List)o);
    }
    else
    if (o instanceof File) {
      renderFile((File)o);
    }
    else
    if (o instanceof PluginInterface) {
      renderPlugin((PluginInterface)o);
    }
    else
    if (o instanceof Class) {
      renderClass((Class)o);
    }
    else {
      renderObject(o);
    }
  }

  protected void startObject() throws Exception {
    outputStream.write('{');
  }

  protected void endObject() throws Exception {
    outputStream.write('}');
  }

  protected void startArray() throws Exception {
    outputStream.write('[');
  }

  protected void endArray() throws Exception {
    outputStream.write(']');
  }

  protected void separator() throws Exception {
    outputStream.write(',');
  }

  protected void punctuator() throws Exception {
    outputStream.write(':');
  }

  protected void delimiter() throws Exception {
    outputStream.write('"');
  }

  protected void renderPrimitive(Object o) throws Exception {
    outputStream.write(o.toString().getBytes());
  }

  protected void renderString(String string) throws Exception{
    StringBuilder stringBuilder = new StringBuilder();
    int i;
    int n = string.length();
    char ch;
    for (i = 0; i < n; i++) {
      ch = string.charAt(i);
      switch (ch) {
        case '\b':
          stringBuilder.append("\\b");
          break;
        case '\f':
          stringBuilder.append("\\f");
          break;
        case '\n':
          stringBuilder.append("\\n");
          break;
        case '\r':
          stringBuilder.append("\\r");
          break;
        case '\t':
          stringBuilder.append("\\t");
          break;
        case '/':
        case '"':
        case '\\':
          stringBuilder.append('\\');
        default:
          stringBuilder.append(ch);
      }
    }
    delimiter();
    renderPrimitive(stringBuilder.toString());
    delimiter();
  }

  protected void renderClass(Class cls) throws Exception {
    renderString(cls.getName());
  }

  protected void renderResultSetMetaData(ResultSetMetaData metadata) throws Exception {
    int columnCount = metadata.getColumnCount();
    int i;
    startArray();
    for (i = 1; i <= columnCount; i++) {
      if (i > 1) separator();
      startObject();
      renderObjectMember("displaySize", new Integer(metadata.getColumnDisplaySize(i)));
      separator();
      renderObjectMember("label", metadata.getColumnLabel(i));
      separator();
      renderObjectMember("name", metadata.getColumnName(i));
      separator();
      renderObjectMember("type", new Integer(metadata.getColumnType(i)));
      separator();
      renderObjectMember("typeName", metadata.getColumnTypeName(i));
      separator();
      renderObjectMember("precision", new Integer(metadata.getPrecision(i)));
      separator();
      renderObjectMember("scale", new Integer(metadata.getScale(i)));
      separator();
      renderObjectMember("schema", metadata.getSchemaName(i));
      separator();
      renderObjectMember("table", metadata.getTableName(i));
      separator();
      renderObjectMember("autoIncrement", new Boolean(metadata.isAutoIncrement(i)));
      separator();
      renderObjectMember("caseSensitive", new Boolean(metadata.isCaseSensitive(i)));
      separator();
      renderObjectMember("currency", new Boolean(metadata.isCurrency(i)));
      separator();
      renderObjectMember("nullable", new Integer(metadata.isNullable(i)));
      separator();
      renderObjectMember("readonly", new Boolean(metadata.isReadOnly(i)));
      separator();
      renderObjectMember("searchable", new Boolean(metadata.isSearchable(i)));
      separator();
      renderObjectMember("signed", new Boolean(metadata.isSigned(i)));
      separator();
      renderObjectMember("writeable", new Boolean(metadata.isWritable(i)));
      endObject();
    }
    endArray();
  }

  protected void renderResultSet(ResultSet resultSet) throws Exception {
    ResultSetMetaData metaData = resultSet.getMetaData();
    int columnCount = metaData.getColumnCount();
    int i;
    String[] names = new String[columnCount+1];
    for (i = 1; i <= columnCount; i++) {
      names[i] = metaData.getColumnName(i);
    }
    int j = 0;
    startArray();
    while (resultSet.next()) {
      if (j++ > 0) separator();
      startObject();
      for (i = 1; i <= columnCount; i++){
        if (i > 1) separator();
        renderObjectMember(names[i], resultSet.getObject(i));
      }
      endObject();
    }
    endArray();
  }

  protected void renderList(List list) throws Exception {
    Iterator iterator = list.iterator();
    int j = 0;
    startArray();
    while (iterator.hasNext()) {
      if (j++ > 0) separator();
      render(iterator.next());
    }
    endArray();
  }

  protected void renderPlugin(PluginInterface plugin) throws Exception {
    startObject();
    renderObjectMember("ids", plugin.getIds());
    separator();
    renderObjectMember("type", plugin.getPluginType().getName());
    separator();
    renderObjectMember("mainType", plugin.getMainType().getName());
    separator();
    renderObjectMember("name", plugin.getName());
    separator();
    renderObjectMember("description", plugin.getDescription());
    separator();
    renderObjectMember("image", plugin.getImageFile());
    separator();
    renderObjectMember("category", plugin.getCategory());
    separator();
    renderObjectMember("isNative", plugin.isNativePlugin());
    separator();
    renderObjectMember("documentationUrl", plugin.getDocumentationUrl());
    endObject();
  }

  protected void renderFile(File file) throws Exception {
    String name = file.getName();
    if (!file.exists()) throw new SpucException("File not found", 404);
    if (!file.isFile() || !name.endsWith(".json")) throw new SpucException("Not a JSON file", 500);
    int buffLen = 4096;
    int read;
    byte[] buff = new byte[buffLen];
    FileInputStream is = new FileInputStream(file);
    do {
      read = is.read(buff);
      outputStream.write(buff, 0, read);
    } while (read == buffLen);
  }

  protected void renderMap(Map<String, Object> map) throws Exception {
    Set<String> keySet = map.keySet();
    Iterator<String> iterator = keySet.iterator();
    int j = 0;
    String name;
    startObject();
    while (iterator.hasNext()) {
      if (j++ > 0) separator();
      name = iterator.next();
      renderObjectMember(name, map.get(name));
    }
    endObject();
  }

  protected Map<String, Member> loadMembers(Class c) throws Exception {
    Map<String, Member> members = new HashMap<String, Member>();
    int i, modifiers;
    int j = 0;
    Field[] fs = c.getFields();
    Field f;
    for (i = 0; i < fs.length; i++) {
      f = fs[i];
      modifiers = f.getModifiers();
      if (Modifier.isStatic(modifiers) || !Modifier.isPublic(modifiers)) continue;
      members.put(f.getName(), f);
    }
    Method[] ms = c.getMethods();
    Method m;
    String name;
    for (i = 0; i < ms.length; i++) {
      m = ms[i];
      modifiers = m.getModifiers();
      if (Modifier.isStatic(modifiers)
      ||  Modifier.isAbstract(modifiers)
      || !Modifier.isPublic(modifiers)
      ||  m.getParameterTypes().length != 0
      ) continue;
      name = m.getName();
      if (name.startsWith("get") && !"getClass".equals(name)) {
        name = name.substring("get".length());
      }
      else
      if (name.startsWith("is")) {
        name = name.substring("is".length());
      }
      else {
        continue;
      }
      name = name.substring(0, 1).toLowerCase() + name.substring(1);
      members.put(name, m);
    }
    this.members.put(c, members);
    return members;
  }

  protected Map<String, Member> loadDatabaseMetaDataMembers() throws Exception {
    Map<String, Member> members = new HashMap<String, Member>();
    Class c = DatabaseMetaData.class;
    int i;
    int j = 0;
    Field[] fs = c.getFields();
    Field f;
    for (i = 0; i < fs.length; i++) {
      f = fs[i];
      members.put(f.getName(), f);
    }
    Method[] ms = c.getMethods();
    Method m;
    String name;
    Class returnType;
    for (i = 0; i < ms.length; i++) {
      m = ms[i];
      if (m.getParameterTypes().length != 0) continue;
      returnType = m.getReturnType();
      if (!
        ( returnType.equals(String.class)
        ||returnType.equals(Character.class)
        ||returnType.equals(Number.class)
        ||returnType.equals(Boolean.class)
        ||ResultSet.class.isAssignableFrom(returnType)
        )
      ) continue;
      name = m.getName();
      if ("getClass".equals(name)) continue;
      if (name.startsWith("get")) {
        name = name.substring("get".length());
      }
      char char1 = name.charAt(0);
      if (name.length() > 1) {
        char char2 = name.charAt(1);
        if (Character.isUpperCase(char1) && Character.isLowerCase(char2)) {
          name = name.substring(0,1).toLowerCase() + name.substring(1);
        }
      }
      members.put(name, m);
    }
    this.members.put(c, members);
    return members;
  }

  protected void renderArray(Object array) throws Exception{
    startArray();
    int length = Array.getLength(array);
    for (int i = 0; i < length; i++){
      if (i > 0) outputStream.write(',');
      render(Array.get(array, i));
    }
    endArray();
  }

  protected void renderObjectMember(String name, Object value) throws Exception {
    renderString(name);
    punctuator();
    render(value);
  }

  protected Map<String, Member> getMembersForClass(Class c) throws Exception {
    Map<String, Member> members;
    boolean isDatabaseMetaData = (DatabaseMetaData.class.isAssignableFrom(c));
    if (!DatabaseMetaData.class.equals(c) && isDatabaseMetaData) {
      members = getMembersForClass(DatabaseMetaData.class);
    }
    else
    if (!this.members.containsKey(c)) {
      if (isDatabaseMetaData) {
        members = loadDatabaseMetaDataMembers();
      }
      else {
        members = loadMembers(c);
      }
    }
    else {
      members = this.members.get(c);
    }
    return members;
  }

  protected void renderObject(Object object) throws Exception {
    Class c = object.getClass();
    int j = 0;
    if (c.isArray()) {
      renderArray(object);
      return;
    }
    startObject();
    String oid = null;
    if (recursionGuard.containsKey(object)) {
      oid = recursionGuard.get(object);
    }
    else {
      oid = object.toString();
      recursionGuard.put(object, oid);
      Map<String, Member> members = getMembersForClass(c);
      Set<String> keySet = members.keySet();
      Iterator<String> iterator = keySet.iterator();
      String name;
      Member member;
      Field field;
      Method method;
      Object value = null;
      while (iterator.hasNext()) {
        if (j++ > 0) outputStream.write(',');
        name = iterator.next();
        member = members.get(name);
        if (member instanceof Field) {
          field = (Field)member;
          try {
            value = field.get(object);
          } catch (Exception fe) {
            value = fe;
          }
        }
        else
        if (member instanceof Method) {
          method = (Method)member;
          try {
            value = method.invoke(object, null);
          }
          catch (Exception me) {
            value = me;
          }
        }
        renderObjectMember(name, value);
      }
    }
    if (j++ > 0) outputStream.write(',');
    renderObjectMember("_oid", oid);
    endObject();
  }

}
