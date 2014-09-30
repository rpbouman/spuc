package org.pentaho.spuc;

import com.sun.source.tree.*;
import com.sun.tools.javac.api.JavacTrees;

import com.sun.source.util.TreePath;
import com.sun.source.util.TreePathScanner;
import com.sun.source.util.Trees;

import java.io.File;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.IOException;
import java.io.Reader;

import java.lang.reflect.Method;

import java.net.URI;
import java.net.URISyntaxException;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Stack;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipException;

import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.Processor;
import javax.annotation.processing.ProcessingEnvironment;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.annotation.processing.SupportedSourceVersion;

import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.Name;
import javax.lang.model.element.TypeElement;
import javax.lang.model.type.TypeMirror;

import javax.tools.JavaCompiler;
import javax.tools.JavaCompiler.CompilationTask;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

@SupportedSourceVersion(SourceVersion.RELEASE_6)
@SupportedAnnotationTypes("*")
public class JavaToJavascriptTranslator extends AbstractProcessor {

  //map of java primitive types and their default values.
  protected static Map<String, String> javaPrimitiveTypes = new HashMap<String, String>();
  static {
    javaPrimitiveTypes.put("boolean", "false");
    javaPrimitiveTypes.put("byte", "0");
    javaPrimitiveTypes.put("char", "\'\\u0000\'");
    javaPrimitiveTypes.put("double", "0");
    javaPrimitiveTypes.put("float", "0");
    javaPrimitiveTypes.put("int", "0");
    javaPrimitiveTypes.put("long", "0");
    javaPrimitiveTypes.put("short", "0");
  }

  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Reserved_Words?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FReserved_Words
  protected static Set<String> javascriptReservedWords = new HashSet(Arrays.asList(new String[]{
    "break",
    "case", "catch", "continue",
    "debugger", "default", "delete", "do",
    "else", "finally", "for", "function",
    "if", "in", "instanceof",
    "new",
    "return",
    "switch",
    "this", "throw", "try", "typeof",
    "var", "void",
    "while", "with"
  }));

  protected String className;
  protected File destinationDir;
  protected File sourceArchive;

  protected Trees trees;
  protected CompilationUnitTree compilationUnit;

  protected String indent = "  ";
  protected int level;
  protected StringBuilder indentStringBuilder = new StringBuilder();
  protected StringBuilder target = new StringBuilder();
  protected Stack<String> elementKind = new Stack<String>();

  //type maps:
  //key: simple name, value: fully qualified name
  protected Map<String, String> depsMap = new HashMap<String, String>();    //types that are instantiated
  protected Map<String, String> typeMap = new HashMap<String, String>();    //types that are referenced
  protected Map<String, String> importMap = new HashMap<String, String>();  //imports, used to resolve types
  //
  protected Set<String> importedPackages = new HashSet<String>();             //list of wildcard imports to search

  class Vardef {
    String name;
    String type;
    boolean isStatic;
    Vardef(String name, String type, boolean isStatic) {
      this.name = name;
      this.type = type;
      this.isStatic = isStatic;
    }
  };
  //A stack of scopes. Each scope is a map of <found variable name>, <renamed variable name>
  protected List<Map<String, Vardef>> scopes = new ArrayList<Map<String, Vardef>>();

  public JavaToJavascriptTranslator(String className, File destinationDir, File sourceArchive){
    super();
    this.className = className;
    this.destinationDir = destinationDir;
    this.sourceArchive = sourceArchive;
    importedPackages.add("java.lang");
  }

  protected void setLevel(int level){
    if (this.level < level) {
      int j;
      for (int i = this.level; i < level; i++) {
        indentStringBuilder.append(indent);
      }
    }
    if (true) {
        int j = 2;
        j = j + 1;
    }
    indentStringBuilder.setLength(level * indent.length());
    this.level = level;
  }

  protected void incLevel() {
    //nl(); emit("/* incLevel */");
    setLevel(level + 1);
  }

  protected void decLevel() {
    //nl(); emit("/* decLevel */");
    setLevel(level - 1);
  }

  protected void emit(String str){
    target.append(str);
  }

  protected void nl(){
    emit("\n" + indentStringBuilder.toString());
  }

  protected void emit(char ch){
    target.append(ch);
  }

  protected void newScope(){
    Map<String, Vardef> scope = new HashMap<String, Vardef>();
    scopes.add(scope);
  }

  protected void enterBlock(){
    emit("{");
    incLevel();
    newScope();
  }

  protected void exitBlock(){
    decLevel();
    nl();
    emit("}");
    scopes.remove(scopes.size()-1);
  }

  protected Map<String, Vardef> getScope() {
    return scopes.get(scopes.size() - 1);
  }

  protected Map<String, Vardef> getThisScope() {
    return scopes.get(0);
  }

  protected static boolean isStatic(Tree tree) {
    VariableTree variable = (VariableTree)tree;
    ModifiersTree modifiers = variable.getModifiers();
    Set<Modifier> flags = modifiers.getFlags();
    return flags.contains(Modifier.STATIC);
  }

  protected Vardef newVar(String name, String type, boolean isStatic) throws Exception, ClassNotFoundException {
    Map<String, Vardef> currentScope = getScope();
    if (currentScope.containsKey(name)) {
      throw new Exception("Variable " + name + " already exists in this scope");
    }
    String name1 = name;
    if (javascriptReservedWords.contains(name1)) name1 = "_" + name1;
    Map<String, Vardef> thisScope = getThisScope();
    String varName;
    if (currentScope == thisScope) {
      varName = "this." + name1;
    }
    else {
      Map<String, Vardef> scope;
      int occurrence = 0;
      for (int i = 0, n = scopes.size(); i < n; i++){
        scope = scopes.get(i);
        if (scope.containsKey(name)) occurrence++;
      }
      if (thisScope.containsKey(name)) occurrence--;
      varName = name1;
      if (occurrence > 0) varName += occurrence;
    }
    //emit("/* Storing variable: " + name + " -> " + varName + "*/ ");
    type = getQualifiedName(type);
    Vardef vardef = new Vardef(varName, type, isStatic);
    currentScope.put(name, vardef);
    return vardef;
  }

  protected Vardef newVar(VariableTree variableTree) throws Exception, ClassNotFoundException {
    return newVar(variableTree.getName().toString(), variableTree.getType().toString(), isStatic(variableTree));
  }

  protected String getVar(String name) throws Exception {
    //emit("/*Looking up variable: " + name + " */");
    Map<String, Vardef> scope;
    for (int i = scopes.size() - 1, n = 0; i >= n; i--){
      scope = scopes.get(i);
      if (!scope.containsKey(name)) continue;
      Vardef vardef = scope.get(name);
      return vardef.name;
    }
    //can't find the variable. This means it must have been defined higher up in the inheritance chain.
    //emit("/*cant find variable " + name + "*/ ");
    throw new Exception("/*cant find variable " + name + "*/");
    //return name;
  }

  protected String getQualifiedName(String simpleName) throws ClassNotFoundException {
    int indexOf;
    indexOf = simpleName.indexOf("<");
    if (indexOf != -1) simpleName = simpleName.substring(0, indexOf);
    indexOf = simpleName.indexOf("[");
    if (indexOf != -1) simpleName = simpleName.substring(0, indexOf);
    //is this a primitive type?
    if (typeMap.containsKey(simpleName)) return typeMap.get(simpleName);
    //look up the qualified name in the used type map.
    if (javaPrimitiveTypes.containsKey(simpleName)) return simpleName;
    String qualifiedName = null;
    if (importMap.containsKey(simpleName)) {  //maybe this type was imported?
      qualifiedName = importMap.get(simpleName);
    }
    else {  //maybe this type was imported through a wildcard?
      for (String packageName : importedPackages) {
        qualifiedName = packageName + "." + simpleName;
        try {
          Class.forName(qualifiedName);
          break;
        }
        catch (ClassNotFoundException cnfex) {
          qualifiedName = null;
          continue;
        }
      }
    }
    if (qualifiedName == null) {
      Class.forName(simpleName);
      qualifiedName = simpleName;
    }
    typeMap.put(simpleName, qualifiedName);
    return qualifiedName;
  }

  protected String storeDependency(String simpleName) throws ClassNotFoundException {
    if (depsMap.containsKey(simpleName)) {
      return depsMap.get(simpleName);
    }
    String qualifiedName = getQualifiedName(simpleName);
    depsMap.put(simpleName, qualifiedName);
    return qualifiedName;
  }

  public class JavaCodeVisitor extends TreePathScanner<Object, Trees> {

    protected int staticBlockCounter = 0;
    protected Stack<String> classNames = new Stack<String>();

    public JavaCodeVisitor(){
      super();
    }

    protected void renderExpression(ExpressionTree expression, Trees p) {
      if (expression.getKind() == Tree.Kind.IDENTIFIER) {
        String name = ((IdentifierTree)expression).getName().toString();
        //emit("/* rendering identifier: " +name +" */");
        try {
          name = getVar(name);
        }
        catch (Exception ex) {
          try {
            String qualifiedName = getQualifiedName(name);
            depsMap.put(name, qualifiedName);
            name = "_" + expression;
          }
          catch (ClassNotFoundException cnfex) {
            //emit("/* expression "+ expression.toString()+" is neither a variable nor a class */");
            emit("this.");
          }
        }
        emit(name);
      }
      else {
        //emit("/* rendering argument " + expression.toString() + " of kind " + expression.getKind().toString() +" */");
        scan(expression, p);
      }
    }

    protected void renderStatement(StatementTree statement, Trees p) {
      scan(statement, p);
      switch (statement.getKind()) {
        case EXPRESSION_STATEMENT:
        case VARIABLE:
          emit(";");
          break;
        default:
      }
    }

    protected void renderStatements(List<? extends StatementTree> statements, Trees p){
      if (statements == null || statements.isEmpty()) return;
      incLevel();
      for (StatementTree statement : statements){
        emit("\n" + indentStringBuilder.toString());
        renderStatement(statement, p);
      }
      decLevel();
    }

    protected void renderExpressionStatementList(List<? extends StatementTree> statements, Trees p){
      if (statements == null || statements.isEmpty()) return;
      boolean first = true;
      for (StatementTree statement : statements){
        if (first) first = false;
        else emit(", ");
        scan(statement, p);
      }
    }

    protected void renderArguments(List<? extends ExpressionTree> arguments, Trees p){
      emit("(");
      if (arguments != null && !arguments.isEmpty()) {
        boolean first = true;
        for (ExpressionTree argument : arguments) {
          if (first) first = false;
          else emit(", ");
          renderExpression(argument, p);
        }
      }
      emit(")");
    }

    protected void renderAnnotations(List<? extends AnnotationTree> annotations, Trees p) {
      if (annotations == null || annotations.isEmpty()) return;
      for (AnnotationTree annotation : annotations) {
        visitAnnotation(annotation, p);
      }
    }

    protected Pattern escapeCharacterPattern = Pattern.compile("[\\u0008\\t\\n\\f\\r\\\"\\\'\\\\]", Pattern.MULTILINE);

    protected String escapeCharacters(String string) {
      StringBuilder stringBuilder = new StringBuilder();
      int offset = 0;
      char esc, match;
      Matcher matcher = escapeCharacterPattern.matcher(string);
      while (matcher.find()) {
        match = matcher.group().charAt(0);
        switch (match) {
          case '\b':
            esc = 'b';
            break;
          case '\t':
            esc = 't';
            break;
          case '\n':
            esc = 'n';
            break;
          case '\f':
            esc = 'f';
            break;
          case '\r':
            esc = 'r';
            break;
          default:
            esc = match;
            break;
        }
        stringBuilder.append(string.subSequence(offset, matcher.start()));
        offset = matcher.end();
        stringBuilder.append('\\');
        stringBuilder.append(esc);
      }
      stringBuilder.append(string.subSequence(offset, string.length()));
      return stringBuilder.toString();
    }

    @Override
    public Object scan(TreePath path, Trees p) {
      setLevel(0);
      Object o = super.scan(path, p);
      return o;
    }

    /**
     * Java array access generates identical js code.
     */
    @Override
    public Object visitArrayAccess(ArrayAccessTree node, Trees p){
      renderExpression(node.getExpression(), p);
      emit("[");
      renderExpression(node.getIndex(), p);
      emit("]");
      return null;
    }

    @Override
    public Object visitArrayType(ArrayTypeTree node, Trees p){
      scan(node.getType(), p);
      emit("[]");
      return null;
    }

    /**
     *  A Java assert statement like this:
     *
     *  assert condition : detail;
     *
     * is rendered as:
     *
     * if (_asserts_enabled && (condition)) _assert(detail);
     */
    @Override
    public Object visitAssert(AssertTree node, Trees p){
      emit("\n" + indentStringBuilder.toString());
      emit("if (_asserts_enabled && !(");
      scan(node.getCondition(), p);
      emit(")) _assert(");
      ExpressionTree detail = node.getDetail();
      if (detail == null) {
        scan(detail, p);
      }
      emit(");");
      return null;
    }

    /**
     * Java assignment generates identical js code.
     */
    @Override
    public Object visitAssignment(AssignmentTree node, Trees p){
      ExpressionTree variable = node.getVariable();
      //emit("/* assignment to variable of kind: " + variable.getKind().toString() + "*/");
      String variableName = variable.toString();
      switch (variable.getKind()) {
        case IDENTIFIER:
          try {
            variableName = getVar(variableName);
          }
          catch (Exception e){
            try {
              String qualifiedName = getQualifiedName(variableName);
              variableName = "_" + variableName;
              depsMap.put(variableName, qualifiedName);
            }
            catch (ClassNotFoundException cnfe) {
              //emit("/* " + variableName + " is neiter a class nor a variable. */");
              //apparently, this is a variable defined higher up in the inheritance chain.
              emit("this.");
            }
          }
          emit(variableName);
          break;
        default:
          scan(variable, p);
      }
      emit(" = ");
      renderExpression(node.getExpression(), p);
      return null;
    }

    /**
     * Java binary operators generate identical js code.
     */
    @Override
    public Object visitBinary(BinaryTree node, Trees p){
      scan(node.getLeftOperand(), p);
      String op = null;
      switch (node.getKind()){
        case AND:
          op = "&";
          break;
        case CONDITIONAL_AND:
          op = "&&";
          break;
        case CONDITIONAL_OR:
          op = "||";
          break;
        case DIVIDE:
          op = "/";
          break;
        case EQUAL_TO:
          op = "==";
          break;
        case GREATER_THAN:
          op = ">";
          break;
        case GREATER_THAN_EQUAL:
          op = ">=";
          break;
        case LEFT_SHIFT:
          op = "<<";
          break;
        case LESS_THAN:
          op = "<";
          break;
        case LESS_THAN_EQUAL:
          op = "<=";
          break;
        case MINUS:
          op = "-";
          break;
        case MULTIPLY:
          op = "*";
          break;
        case NOT_EQUAL_TO:
          op = "!=";
          break;
        case OR:
          op = "!";
          break;
        case PLUS:
          op = "+";
          break;
        case REMAINDER:
          op = "%";
          break;
        case RIGHT_SHIFT:
          op = ">>";
          break;
        case UNSIGNED_RIGHT_SHIFT:
          op = ">>>";
          break;
        case XOR:
          op = "^";
          break;
      }
      emit(" " + op + " ");
      scan(node.getRightOperand(), p);
      return null;
    }

    /**
     * TODO: rethink blocks to suit js function scope.
     */
    @Override
    public Object visitBlock(BlockTree node, Trees p){
      boolean isStatic = node.isStatic();
      String staticBlockId = null;
      if (isStatic) {
        staticBlockId = "this._static_block_" + (++staticBlockCounter);
        emit("if (typeof(" + staticBlockId + ") === \"undefined\")");
      }
      TreePath parentPath = getCurrentPath().getParentPath();
      boolean method = parentPath.getLeaf().getKind() == Tree.Kind.METHOD;
      boolean renderPlainBlock = method && !isStatic;
      enterBlock();
      renderStatements(node.getStatements(), p);
      if (node.isStatic()) {
        nl();
        emit(staticBlockId);
        emit(" = true;");
      }
      exitBlock();
      return null;
    }

    /**
     *  Java break generates identical javascript code
     */
    @Override
    public Object visitBreak(BreakTree node, Trees p){
      emit("break");
      Name label = node.getLabel();
      if (label != null) {
        emit(" " + label.toString());
      }
      emit(";");
      return null;
    }

    /**
     *  Java case generates identical javascript code
     */
    @Override
    public Object visitCase(CaseTree node, Trees p){
      emit("\n" + indentStringBuilder.toString());
      ExpressionTree expression = node.getExpression();
      if (expression == null) {
        emit("default:");
      }
      else {
        emit("case ");
        renderExpression(expression, p);
        emit(":");
      }
      renderStatements(node.getStatements(), p);
      return null;
    }

    /**
     *  Java catch generates identical javascript code
     */
    @Override
    public Object visitCatch(CatchTree node, Trees p){
      emit("\n" + indentStringBuilder.toString());
      newScope();
      Vardef vardef = null;
      try {
        vardef = newVar(node.getParameter());
      } catch (Exception ex) {
        emit("/* error creating exception variable */");
      }
      emit("catch (");
      emit(vardef.name);
      emit(") {");
      incLevel();
      renderStatements(node.getBlock().getStatements(), p);
      exitBlock();
      return null;
    }

    /**
     *  Java class generates a function and a prototype
     */
    @Override
    public Object visitClass(ClassTree node, Trees p){
      elementKind.push(node.getKind().toString());
      String className = node.getSimpleName().toString();
      classNames.push(className);

      nl();
      emit("var ");
      emit(className);
      emit(";");

      List<? extends Tree> members = node.getMembers();
      nl();
      emit("(");
      emit(className);
      emit(" = function() {");
      newScope();
      incLevel();
      for (Tree member : members) {
        switch (member.getKind()) {
          case VARIABLE:
            if (isStatic(member)) continue;
          case BLOCK:
            break;
          default:
            continue;
        }
        nl();
        scan(member, p);
        emit(";");
      }
      decLevel();
      nl();
      emit("}).prototype = {");
      incLevel();
      boolean first = true;
      VariableTree variable = null;
      for (Tree member : members) {
        switch (member.getKind()) {
          case VARIABLE:
            if (isStatic(member)) break;
          case CLASS:
          case BLOCK:
            continue;
          default:
            break;
        }
        if (first) first = false;
        else emit(",");
        nl();
        switch (member.getKind()) {
          case VARIABLE:
            variable = (VariableTree)member;
            String name = null;
            try {
              name = newVar(variable).name;
              name = name.substring("this.".length());
            }
            catch (Exception ex) {
              emit("/* Exception creating variable " + variable.getName().toString() + ".  " + ex.getMessage() + " */");
            }
            emit(name);
            emit(": ");
            renderExpression(variable.getInitializer(), p);
            break;
          default:
            scan(member, p);
        }
      }
      decLevel();

      nl();
      emit("};");

      Tree extendsClause = node.getExtendsClause();
      if (extendsClause != null) {
        try {
          String extendsClass = extendsClause.toString();
          String qualifiedNameExtendsClass = storeDependency(extendsClass);
          nl();
          emit("extends(");
          emit(className);
          emit(", _");
          emit(extendsClass);
          emit(");");
          JavaToJavascriptTranslator.translate(qualifiedNameExtendsClass, destinationDir, sourceArchive);
        }
        catch (ClassNotFoundException cnfex) {
          cnfex.printStackTrace();
        }
        catch (URISyntaxException use) {
          use.printStackTrace();
        }
        catch (IOException ioe) {
          ioe.printStackTrace();
        }
      }

      classNames.pop();
      elementKind.pop();
      return null;
    }
    /**
     *  Compilation units become javascript require modules.
     *  http://requirejs.org/docs/api.html#funcmodule
     */
    @Override
    public Object visitCompilationUnit(CompilationUnitTree node, Trees p){
      compilationUnit = node;
      elementKind.push(node.getKind().toString());
      List<? extends Tree> typeDecls = node.getTypeDecls();
      if (typeDecls != null && !typeDecls.isEmpty()) {
        ModifiersTree modifiers;
        Set<Modifier> flags;
        ClassTree publicClass = null;
        for (Tree typeDecl : typeDecls) {
          if (publicClass == null && typeDecl.getKind() == Tree.Kind.CLASS) {
            publicClass = (ClassTree)typeDecl;
            modifiers = publicClass.getModifiers();
            flags = modifiers.getFlags();
            if (flags.contains(Modifier.PUBLIC)) {
              String packageName = node.getPackageName().toString();
              String className = publicClass.getSimpleName().toString();
              String qualifiedClassName = className;
              if (!"".equals(packageName)) {
                qualifiedClassName = packageName + "." + className;
              }
              typeMap.put(className, qualifiedClassName);
            }
            else publicClass = null;
          }
          scan(typeDecl, p);
        }
        nl();
        emit("return ");
        emit(publicClass.getSimpleName().toString());
        emit(";");
      }
      elementKind.pop();

      StringBuilder deps = new StringBuilder();
      StringBuilder args = new StringBuilder();
      String className, qualifiedClassName;
      boolean isFirst = true;
      for (Map.Entry<String, String> type : depsMap.entrySet()) {
        if (isFirst) isFirst = false;
        else {
          deps.append(",");
          args.append(",");
        }
        deps.append("\n  ");
        args.append("\n  _");
        deps.append("\"");
        deps.append(type.getValue());
        deps.append("\"");
        args.append(type.getKey());
      }

      target.insert(0, "pen.define([" + deps + "\n], function(" + args + "\n){");
      target.append("\n});");
      return null;
    }

    @Override
    public Object visitCompoundAssignment(CompoundAssignmentTree node, Trees p){
      String op;
      switch (node.getKind()) {
        case AND_ASSIGNMENT:
          op = "&";
          break;
        case DIVIDE_ASSIGNMENT:
          op = "/";
          break;
        case LEFT_SHIFT_ASSIGNMENT:
          op = "<<";
          break;
        case MINUS_ASSIGNMENT:
          op = "-";
          break;
        case MULTIPLY_ASSIGNMENT:
          op = "*";
          break;
        case OR_ASSIGNMENT:
          op = "|";
          break;
        case PLUS_ASSIGNMENT:
          op = "+";
          break;
        case REMAINDER_ASSIGNMENT:
          op = "%";
          break;
        case RIGHT_SHIFT_ASSIGNMENT:
          op = ">>";
          break;
        case UNSIGNED_RIGHT_SHIFT_ASSIGNMENT:
          op = ">>>";
          break;
        case XOR_ASSIGNMENT:
          op = "^";
          break;
        default:
          op = null;
      }
      scan(node.getVariable(), p);
      emit(" " + op + "= ");
      renderExpression(node.getExpression(), p);
      return null;
    }

    @Override
    public Object visitConditionalExpression(ConditionalExpressionTree node, Trees p){
      scan(node.getCondition(), p);
      emit(" ? ");
      renderExpression(node.getTrueExpression(), p);
      emit(" : ");
      renderExpression(node.getFalseExpression(), p);
      return null;
    }

    @Override
    public Object visitContinue(ContinueTree node, Trees p){
      emit("continue");
      Name label = node.getLabel();
      if (label != null) {
        emit(" " + label.toString());
      }
      emit(";");
      return null;
    }

    @Override
    public Object visitDoWhileLoop(DoWhileLoopTree node, Trees p){
      emit("do");
      scan(node.getStatement(), p);
      emit("\n" + indentStringBuilder.toString());
      emit("while (");
      renderExpression(node.getCondition(), p);
      emit(")");
      emit(";");
      return null;
    }

    @Override
    public Object visitEmptyStatement(EmptyStatementTree node, Trees p){
      emit(";");
      return null;
    }

    @Override
    public Object visitEnhancedForLoop(EnhancedForLoopTree node, Trees p){
      newScope();
      String _expr = null, _isArray = null, _length = null, variable = null, iterator = null;
      try {
        _expr = newVar("_expr", "String", false).name;
        _isArray = newVar("_isArray", "boolean", false).name;
        _length = newVar("_length", "int", false).name;
        variable = newVar(node.getVariable()).name;
        iterator = newVar("_iterator", "Iterator", false).name;
      }
      catch (Exception ex) {
        emit("/* error creating var: " +  ex.getMessage() + "*/");
      }
      emit("var ");
      emit(_expr);
      emit(" = ");
      renderExpression(node.getExpression(), p);
      emit(", ");
      emit(iterator);
      emit(", ");
      emit(_length);
      emit(", ");
      emit(_isArray);
      emit(" = ");
      emit(_expr);
      emit(" instanceof Array;");
      nl();
      emit("if (");
      emit(_isArray);
      emit(") {");
      incLevel();
      nl();
      emit(iterator);
      emit(" = 0;");
      nl();
      emit(_length);
      emit(" = ");
      emit(_expr);
      emit(".length;");
      decLevel();
      nl();
      emit("}");
      nl();
      emit("else {");
      incLevel();
      nl();
      emit(iterator);
      emit(" = ");
      emit(_expr);
      emit(".iterator();");
      decLevel();
      nl();
      emit("}");
      nl();
      emit("for ( ; ");
      emit(_isArray);
      emit(" ? ");
      emit(iterator);
      emit(" < ");
      emit(_length);
      emit(" : ");
      emit(iterator);
      emit(".hasNext() ; ) {");
      incLevel();
      nl();
      emit(variable);
      emit(" = ");
      emit(_isArray);
      emit(" ? ");
      emit(_expr);
      emit("[");
      emit(iterator);
      emit("++]");
      emit(" : ");
      emit(iterator);
      emit(".next();");
      nl();
      StatementTree statement = node.getStatement();
      if (statement.getKind() == Tree.Kind.BLOCK) {
        BlockTree blockTree = (BlockTree)statement;
        renderStatements(blockTree.getStatements(), p);
      } else {
        renderStatement(statement, p);
      }
      decLevel();
      nl();
      emit("} ");
      return null;
    }

    @Override
    public Object visitErroneous(ErroneousTree node, Trees p){
      emit("/* error */");
      return super.visitErroneous(node, p);
    }

    @Override
    public Object visitExpressionStatement(ExpressionStatementTree node, Trees p){
      return super.visitExpressionStatement(node, p);
    }

    @Override
    public Object visitForLoop(ForLoopTree node, Trees p){
      newScope();
      emit("for (");

      List<? extends StatementTree> initializer = node.getInitializer();
      renderExpressionStatementList(initializer, p);

      emit("; ");
      scan(node.getCondition(), p);
      emit("; ");

      List<? extends StatementTree> update = node.getUpdate();
      renderExpressionStatementList(update, p);

      emit(") ");

      renderStatement(node.getStatement(), p);
      return null;
    }

    @Override
    public Object visitIdentifier(IdentifierTree node, Trees p){
      emit(node.getName().toString());
      return null;
    }

    @Override
    public Object visitIf(IfTree node, Trees p){
      emit("if (");
      scan(node.getCondition(), p);
      emit(") ");
      renderStatement(node.getThenStatement(), p);
      StatementTree elseStatement = node.getElseStatement();
      if (elseStatement == null) return null;
      emit("\n" + indentStringBuilder.toString());
      emit("else ");
      renderStatement(elseStatement, p);
      return null;
    }

    @Override
    public Object visitImport(ImportTree node, Trees p){
      if (node.isStatic()) emit("static ");
      emit("import ");
      scan(node.getQualifiedIdentifier(), p);
      return null;
    }

    @Override
    public Object visitInstanceOf(InstanceOfTree node, Trees p){
      renderExpression(node.getExpression(), p);
      emit(" instanceof ");
      scan(node.getType(), p);
      return null;
    }

    @Override
    public Object visitLabeledStatement(LabeledStatementTree node, Trees p){
      emit("\n" + indentStringBuilder.toString());
      Name label = node.getLabel();
      emit(label.toString());
      emit(": ");
      renderStatement(node.getStatement(), p);
      return null;
    }

    @Override
    public Object visitLiteral(LiteralTree node, Trees p){
      char postfix = '\u0000';
      switch (node.getKind()) {
        case BOOLEAN_LITERAL:
          break;
        case CHAR_LITERAL:
          postfix = '\'';
          break;
        case DOUBLE_LITERAL:
          postfix = 'd';
          break;
        case FLOAT_LITERAL:
          postfix = 'f';
          break;
        case INT_LITERAL:
          break;
        case LONG_LITERAL:
          postfix = 'l';
          break;
        case STRING_LITERAL:
          postfix = '\"';
          break;
        case NULL_LITERAL:
          emit("null");
          return null;
      }
      String stringValue = node.getValue().toString();
      if (postfix == '\'' || postfix == '\"') {
        emit(postfix);
        stringValue = escapeCharacters(stringValue);
      }
      emit(stringValue);
      if (postfix != '\u0000') emit(postfix);
      return null;
    }

    @Override
    public Object visitMemberSelect(MemberSelectTree node, Trees p){
      ExpressionTree expressionTree = node.getExpression();
      String expression = expressionTree.toString();
      renderExpression(expressionTree, p);
      emit(".");
      Name name = node.getIdentifier();
      emit(name.toString());
      return null;
    }

    @Override
    public Object visitMethod(MethodTree node, Trees p){
      String name;
      name = node.getName().toString();
      if ("<init>".equals(name)) {
        name = classNames.peek();
        elementKind.push("Constructor");
      }
      else {
        elementKind.push(node.getKind().toString());
      }
      emit(name);
      emit(": function(");
      newScope();
      List<? extends VariableTree> parameters = node.getParameters();
      boolean first;
      if (parameters != null && !parameters.isEmpty()) {
        first = true;
        String paramName;
        for (VariableTree parameter : parameters) {
          if (first) first = false;
          else emit(", ");
          try {
            emit(newVar(parameter).name);
          }
          catch (Exception ex) {
            emit("/* error creating argument " + parameter.toString() + ". " + ex.getMessage() + "*/");
          }
        }
      }
      emit(") {");
      incLevel();
      renderStatements(node.getBody().getStatements(), p);
      exitBlock();
      elementKind.pop();
      return null;
    }

    @Override
    public Object visitMethodInvocation(MethodInvocationTree node, Trees p){
      ExpressionTree methodSelect = node.getMethodSelect();
      emit("/* methodSelect kind: " + methodSelect.getKind().toString() + "*/");
      scan(node.getMethodSelect(), p);
      renderArguments(node.getArguments(), p);
      return null;
    }

    @Override
    public Object visitNewArray(NewArrayTree node, Trees p){
      Tree type = node.getType();
      String typeName = type.toString();
      try {
        typeName = storeDependency(typeName);
      }
      catch (ClassNotFoundException cnfex) {
        emit("/* class not found: " + typeName + "*/");
      }
      emit("[");
      List<? extends ExpressionTree> initializers = node.getInitializers();
      if (initializers != null && !initializers.isEmpty()) {
        incLevel();
        boolean first = true;
        for (ExpressionTree initializer : initializers) {
          if (first) first = false;
          else emit(",");
          nl();
          renderExpression(initializer, p);
        }
        decLevel();
        if (!first) nl();
      }
      emit("]");
      return null;
    }

    @Override
    public Object visitNewClass(NewClassTree node, Trees p){
      emit("new _");
      String typeName;
      ExpressionTree identifier = node.getIdentifier();
      ExpressionTree enclosingExpression = node.getEnclosingExpression();
      if (enclosingExpression == null) {
        typeName = identifier.toString();
      }
      else {
        typeName = enclosingExpression.toString();
        scan(enclosingExpression, p);
        emit(".");
      }
      try {
        storeDependency(typeName);
        emit(typeName);
      }
      catch (ClassNotFoundException cnfex) {
        emit("/* class not found: " + typeName + "*/");
        scan(identifier, p);
      }
      renderArguments(node.getArguments(), p);
      ClassTree classBody = node.getClassBody();
      if (classBody != null) {
        visitClass(classBody, p);
      }
      return null;
    }

    @Override
    public Object visitOther(Tree node, Trees p){
      return super.visitOther(node, p);
    }

    @Override
    public Object visitParameterizedType(ParameterizedTypeTree node, Trees p){
      scan(node.getType(), p);
      emit("<");
      List<? extends Tree> typeArguments = node.getTypeArguments();
      boolean first = true;
      for (Tree typeArgument : typeArguments) {
        if (first) first = false;
        else emit(", ");
        scan(typeArgument, p);
      }
      emit(">");
      return null;
    }

    @Override
    public Object visitParenthesized(ParenthesizedTree node, Trees p){
      emit("(");
      renderExpression(node.getExpression(), p);
      emit(")");
      return null;
    }

    @Override
    public Object visitPrimitiveType(PrimitiveTypeTree node, Trees p){
      emit(node.getPrimitiveTypeKind().toString().toLowerCase());
      return null;
    }

    @Override
    public Object visitReturn(ReturnTree node, Trees p){
      emit("return");
      ExpressionTree expressionTree = node.getExpression();
      if (expressionTree != null) {
        emit(" ");
        renderExpression(expressionTree, p);
      }
      emit(";");
      return null;
    }

    @Override
    public Object visitSwitch(SwitchTree node, Trees p){
      nl();
      emit("switch (");
      renderExpression(node.getExpression(), p);
      emit(") ");
      enterBlock();
      scan(node.getCases(), p);
      exitBlock();
      return null;
    }

    @Override
    public Object visitSynchronized(SynchronizedTree node, Trees p){
      nl();
      emit("synchronized (");
      renderExpression(node.getExpression(), p);
      emit(")");
      visitBlock(node.getBlock(), p);
      return null;
    }

    @Override
    public Object visitThrow(ThrowTree node, Trees p){
      nl();
      emit("throw ");
      renderExpression(node.getExpression(), p);
      emit(";");
      return null;
    }

    @Override
    public Object visitTry(TryTree node, Trees p){
      nl();
      emit("try ");
      visitBlock(node.getBlock(), p);
      List<? extends CatchTree> catchTrees = node.getCatches();
      for (CatchTree catchTree : catchTrees) {
        visitCatch(catchTree, p);
      }
      BlockTree finallyBlock = node.getFinallyBlock();
      if (finallyBlock == null) return null;
      nl();
      emit("finally ");
      visitBlock(finallyBlock, p);
      return null;
    }

    @Override
    public Object visitTypeCast(TypeCastTree node, Trees p){
      renderExpression(node.getExpression(), p);
      return null;
    }

    @Override
    public Object visitTypeParameter(TypeParameterTree node, Trees p){
      Name name = node.getName();
      emit(name.toString());
      List <? extends Tree> bounds = node.getBounds();
      if (bounds == null || bounds.isEmpty()) return null;
      for (Tree bound : bounds) {
        scan(bound, p);
      }
      return null;
    }

    @Override
    public Object visitUnary(UnaryTree node, Trees p){
      Tree.Kind kind = node.getKind();
      String op = null;
      boolean prefix = true;
      switch (kind) {
        case BITWISE_COMPLEMENT:
          op = "~";
          break;
        case LOGICAL_COMPLEMENT:
          op = "!";
          break;
        case POSTFIX_INCREMENT:
          op = "++";
          prefix = false;
          break;
        case POSTFIX_DECREMENT:
          op = "--";
          prefix = false;
          break;
        case PREFIX_INCREMENT:
          op = "++";
          break;
        case PREFIX_DECREMENT:
          op = "--";
          break;
        case UNARY_MINUS:
          op = "-";
          break;
        case UNARY_PLUS:
          op = "+";
          break;
      }
      if (prefix) emit(op);
      renderExpression(node.getExpression(), p);
      if (!prefix) emit(op);
      return null;
    }

    @Override
    public Object visitVariable(VariableTree node, Trees p){
      //visitModifiers(node.getModifiers(), p);
      //scan(node.getType(), p);
      Tree type = node.getType();
      String typeName = type.toString();
      String currentElementKind = elementKind.peek();
      boolean isStatic = isStatic(node);
      if (!"CLASS".equals(currentElementKind)) {
        emit("var ");
      }
      Name name = node.getName();
      String varName = name.toString();
      try{
        varName = newVar(node).name;
      }
      catch (Exception ex) {
        emit("/* error creating variable: " + varName  + ". " + ex.getMessage() + "*/");
      }
      emit(varName);
      emit(" = ");
      ExpressionTree initializer = node.getInitializer();
      String defaultValue = null;
      switch (type.getKind()) {
        case PRIMITIVE_TYPE:
          defaultValue = javaPrimitiveTypes.get(typeName);
          break;
        default:
          defaultValue = "null";
          try {
            getQualifiedName(typeName);
          }
          catch (Exception ex){
            emit("/*Class " + typeName + " not found. */ ");
          }
      }
      if (initializer == null) {
        emit(defaultValue);
      }
      else {
        renderExpression(initializer, p);
      }
      return null;
    }

    @Override
    public Object visitWhileLoop(WhileLoopTree node, Trees p){
      emit("while (");
      renderExpression(node.getCondition(), p);
      emit(")");
      renderStatement(node.getStatement(), p);
      return null;
    }

    @Override
    public Object visitWildcard(WildcardTree node, Trees p){
      return null;
    }
  }

  public String getJavascript() {
    return target.toString();
  }

  @Override
  public void init(ProcessingEnvironment pe) {
    super.init(pe);
    trees = Trees.instance(pe);
  }

  @Override
  public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnvironment)  {
    try {
      TreePath treepath = null;

      //get only the first element.
      //We need only the first element since we're initially only interested in the compilation unit.
      for (Element element : roundEnvironment.getRootElements()) {
        treepath = trees.getPath(element);
        break;
      }
      if (treepath == null) return false;

      compilationUnit = treepath.getCompilationUnit();
      ExpressionTree packageNameTree = compilationUnit.getPackageName();

      //store the imports so we can resolve types.
      String packageName, className;
      int i;
      List <? extends ImportTree> imports = compilationUnit.getImports();
      for (ImportTree importTree : imports) {
        packageName = importTree.getQualifiedIdentifier().toString();
        i = packageName.lastIndexOf(".");
        if (i == -1) {
          className = packageName;
          packageName = "";
        }
        else {
          className = packageName.substring(i + 1);
          packageName = packageName.substring(0, i);
        }

        if ("*".equals(className)) importedPackages.add(packageName);
        else importMap.put(className, packageName + "." + className);
      }

      //do the actual code analysis, starting from the compilation unit.
      JavaCodeVisitor visitor = new JavaCodeVisitor();
      visitor.scan(compilationUnit, trees);

    } catch (Exception ex) {
      ex.printStackTrace();
    }
    return true;
  }

  class ZippedJavaFileObject extends SimpleJavaFileObject {
    protected File sourceArchive;
    protected String sourceFile;
    protected ZipFile zipFile;

    ZippedJavaFileObject(File sourceArchive, String sourceFile) throws URISyntaxException {
      super(new URI(sourceArchive.toURI() + "#" + sourceFile), JavaFileObject.Kind.SOURCE);
      this.sourceArchive = sourceArchive;
      this.sourceFile = sourceFile;
    }

    protected ZipFile getZipFile() throws IOException, ZipException {
      if (zipFile == null) {
        zipFile = new ZipFile(sourceArchive);
      }
      return zipFile;
    }

    protected ZipEntry getZipEntry () throws IOException, ZipException {
      ZipFile zipFile = getZipFile();
      return zipFile.getEntry(sourceFile);
    }

    public boolean exists() {
      try {
        return getZipEntry() != null;
      }
      catch (Exception ex) {
        return false;
      }
    }

    public InputStream openInputStream() throws IOException {
      ZipEntry zipEntry;
      try {
        zipEntry = getZipEntry();
      }
      catch (ZipException zipException) {
        throw new IOException("Error opening zipfile", zipException);
      }
      if (zipEntry == null) throw new IOException("File not found");

      InputStream inputStream = zipFile.getInputStream(zipEntry);
      return inputStream;
    }

    public Reader openReader(boolean ignoreEncodingErrors) throws IOException {
      InputStream inputStream = openInputStream();
      InputStreamReader inputStreamReader = new InputStreamReader(inputStream);
      return inputStreamReader;
    }

    public CharSequence getCharContent(boolean ignoreEncodingErrors) throws IOException {
      Reader reader = openReader(ignoreEncodingErrors);
      StringBuilder stringBuilder = new StringBuilder();
      int buffLen = 4096, read;
      char[] buff = new char[buffLen];
      do {
        read = reader.read(buff, 0, buffLen);
        stringBuilder.append(buff, 0, read);
      } while (read == buffLen);
      return stringBuilder;
    }

    public void close() throws IOException {
      if (zipFile != null) zipFile.close();
    }

  }

  public ZippedJavaFileObject getJavaFile(File sourceArchive, String sourceFile) throws URISyntaxException {
    return new ZippedJavaFileObject(sourceArchive, sourceFile);
  }

  public static File translate(String className, File destinationDir, File sourceArchive) throws URISyntaxException, IOException {
    File destinationFile = null;
    ZippedJavaFileObject zippedJavaFileObject = null;
    try {
      String destinationFilename = className + ".js";
      destinationFile = new File(destinationDir, destinationFilename);
      if (destinationFile.exists()) return destinationFile;

      JavaToJavascriptTranslator processor = new JavaToJavascriptTranslator(className, destinationDir, sourceArchive);
      String path = className.replace(".", "/");
      zippedJavaFileObject = processor.getJavaFile(sourceArchive, path + ".java");
      if (zippedJavaFileObject.exists()) {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        StandardJavaFileManager fileManager = compiler.getStandardFileManager(null, null, null);

        ArrayList<AbstractProcessor> processors = new ArrayList<AbstractProcessor>();
        processors.add(processor);

        ArrayList<ZippedJavaFileObject> javaFileObjects = new ArrayList<ZippedJavaFileObject>();
        javaFileObjects.add(zippedJavaFileObject);

        CompilationTask task = compiler.getTask(null, fileManager, null, null, null, javaFileObjects);
        task.setProcessors(processors);
        boolean callResult = task.call();

        FileWriter writer = new FileWriter(destinationFile);
        String javascript = processor.getJavascript();
        writer.write(javascript);
        writer.close();
        fileManager.close();
      }
    }
    catch (Exception ex) {
      ex.printStackTrace();
    }
    finally {
      if (zippedJavaFileObject != null) zippedJavaFileObject.close();
    }
    return destinationFile;
  }

  public static void main(String[] args) {
    if (args.length != 3) {
      System.out.println("This expects 3 arguments: classname, destination dir, source archive");
      return;
    }
    File destinationDir = new File(args[1]);
    File sourceArchive = new File(args[2]);
    try {
      translate(args[0], destinationDir, sourceArchive);
    }
    catch(Exception ex) {
      ex.printStackTrace();
    }
  }

}
