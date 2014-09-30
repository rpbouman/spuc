function parseXmlNode(el) {
  var obj,
      i,
      nodes = el.childNodes,
      n = nodes.length,
      node, tagName, member
  ;
  for(i = 0; i < n; i++){
    node = nodes[i];
    switch (node.nodeType) {
      case 1:
        if (!obj) obj = {};
        break;
      case 3:
        if (!obj) obj = "";
        if (!iStr(obj)) continue;
        if (/^\s+$/g.test(node.data)) continue;
        obj += node.data;
        break;
      default:
        continue;
    }
    tagName = node.tagName;
    if (obj.hasOwnProperty(tagName)) {
      member = obj[tagName];
      if (!iArr(member)) {
          member = obj[tagName] = [member];
      }
      member.push(parseXmlNode(node));
    }
    else {
      obj[tagName] = parseXmlNode(node);
    }
  }
  return obj;
}

function unescapeEntities(text) {
  var t = "", match, value, i = 0, re = /&((#x([\dA-Fa-f]+))|(\w+));/g;
  while (match = re.exec(text)) {
    t += text.substr(i, match.index - i);
    if (value = match[3]){
      t += String.fromCharCode(parseInt(value, 16));
    }
    else
    if (value = match[4]){
      switch (value) {
        case "lt":
          t += "<";
          break;
        case "gt":
          t += ">";
          break;
        case "amp":
          t += "&";
          break;
        case "apos":
          t += "'";
          break;
        case "quot":
          t += "\"";
          break;
        default:
          throw "Don't recognize named entity " + value;
      }
    }
    i = re.lastIndex;
  }
  t += text.substr(i);
  return t;
}

function parseXmlText(xml) {
  //         1234             5           6          789             10             11   12          13  14                 15         1617    18                   19
  var re = /<(((([\w\-\.]+):)?([\w\-\.]+))([^>]+)?|\/((([\w\-\.]+):)?([\w\-\.]+))|\?(\w+)([^\?]+)?\?|(!--([^\-]|-[^\-])*--)|(!\[CDATA\[(([^\]]+(\][^\]])?)+)\]\]))>|([^<>]+)/ig;
  var match, value, atts;
  var pop, push, stack = [], _p, p, hasOwn;
  var root = {}, obj, pObj = root, member;

  while (match = re.exec(xml)) {
    //we have an element start tag
    if (value = match[5]) {
      push = true;
      //make a new object to represent this element
      obj = {};
      //attach the new object to its parent (if it exists)
      if (pObj) {
        //see if such a child item already exists
        member = pObj[value];
        if (member) {
          //it already exists.
          //add the new object to the existing array of items of this name
          if (member.constructor === Array) {
            member.push(obj);
          }
          //if this item existed only as scalar, make it an array
          else {
            pObj[value] = [member, obj];
          }
        }
        else {
          //if it didn't exist already, add this item.
          pObj[value] = obj;
        }
      }

      //do we have "stuff" beyond the tagname?
      if (atts = match[6]) {
        //check if this element is self-closing
        if (atts.length && atts.substr(atts.length - 1, 1) === "\/") {
          //it is. remove the trailing "/" character
          //make sure not to push this item on the stack
          atts = atts.substr(0, atts.length - 1);
          push = false;
        }
        var attMatch;
        //            123          4                5 6         7
        var attRe = /((([\w\-]+):)?([\w\-]+))\s*=\s*('([^']*)'|"([^"]*)")/g;
        var objAtts, attName, attVal;
        //parse attributes
        while (attMatch = attRe.exec(atts)) {
          if (!objAtts) objAtts = obj["@"] = {};
          //check if such an item already exists
          attName = attMatch[4];
          if (typeof(objAtts[attName]) !== "undefined") {
            throw "Attribute \"" + attName + "\" already exists."
          }
          //Nope, add it.
          attVal = attMatch[5];
          objAtts[attName] = attVal.substr(1, attVal.length - 2);
        }
        //reset the regex so we can use it again next time.
        if (attRe.lastIndex) {
          attRe.lastIndex = 0;
        }
        else {
          pObj[value] = null;
        }
      }
      //push the item on the stack, and make it the new parent object.
      if (push) {
        obj._type = value;
        pObj = obj;
        stack.push(obj);
      }
    }
    else
    //element end tag
    if (value = match[10]) {
      //get the last item from the stack
      pop = stack.pop();
      //check if tagname matches the current item.
      if (pop._type !== value) {
        //nope. this means the tags aren't balanced.
        throw "Error: not wellformed. Found closing tag " + value + " but expected " + pop.tag + " at " + match.index;
      }
      //set the current parent object
      pObj = stack.length ? stack[stack.length -1] : null;
      //if the popped item has a _value property, then fold it into a scalar
      //note that we assume that if a _value property is present, it is the
      //only meaningful property. We don't explicitly check if that is the case.
      //we probably should, and throw an error if we find that it has more properties.
      p = pop._type;
      //remove the tagname info
      delete pop._type;
      //clean up the value: if scalar, just use the value
      if (pop._value) {
        pObj[p] = pop._value;
      }
      //if empty object, use null instead.
      else {
        hasOwn = false;
        for (_p in pop) {
          if (pop.hasOwnProperty(_p)) {
            hasOwn = true;
            break;
          }
        }
        if (!hasOwn) pObj[p] = null;
      }
    }
    else
    if (value = match[11]) {                              //processing instruction
      //ignore
      //typically we only get this for the xml declaration
    }
    else
    if (value = match[13]) {                              //comment
      //ignore
      //comments are stripped
    }
    else
    if (value = match[15]) {                              //cdata
      //grab the text, add that as value
      pObj._value = match[16];
    }
    else
    if ((value = match[19]) && (!/^\s+$/.test(value))) {  //text (but not whitespace)
      //grab the text, add that as value
      var text = match[19];
      pObj._value = unescapeEntities(text);
    }
  }
  return root;
}
