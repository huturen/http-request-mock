const fs = require('fs');
const path = require('path');
const pbjs = require('protobufjs/cli/pbjs');
const faker = require('../plugin/faker');

module.exports = {
  getProtoService,
  generateMockFiles
};

let protorc = null;

/**
 * Generate mock files for the specified proto file.
 * @param {string} protorcConfig Configs defined in .protorc
 * @param {string} outputDir A directory in which the genrated files are stored.
 */
async function generateMockFiles(protorcConfig, outputDir) {
  protorc = protorcConfig;
  const protoPaths = Array.isArray(protorc.protoPaths) ? protorc.protoPaths : [];
  protoPaths.push(path.dirname(protorc.protoEntry)); // To avoid include paths warnings.

  const protoService = await getProtoService(protorc.protoEntry, protoPaths).catch(err => {throw err;});

  const { includeMethods, excludeMethods, overwrite } = protorc;

  for(const [method, {request, requestType, response}] of Object.entries(protoService)) {
    const isIgnored = (Array.isArray(includeMethods) && includeMethods.length && !includeMethods.includes(method))
      || (Array.isArray(excludeMethods) && excludeMethods.length && excludeMethods.includes(method));

    if (isIgnored) {
      console.log(`Method [${method}] was ignored.`);
      continue;
    }

    const file = path.resolve(outputDir, `${method}.js`);
    if (!overwrite && fs.existsSync(file)) {
      console.log(`Skipped mock file: ${file}`);
      continue;
    }

    const req = generateRequestFields(request);
    const res = generateResponseFields(response).join('\n');
    const content = getMockFileTemplate(method, requestType, req, res);
    fs.writeFileSync(file, content);
    console.log(`Generated mock file: ${file}`);
  }
}


/**
 * Generate request fields that will be used in a mock file from the formated fields.
 * @param {object} formatedFields
 */
function generateRequestFields(formatedFields) {
  const res = {};
  for(const [key, type] of Object.entries(formatedFields)) {
    // eslint-disable-next-line
    const [rule, _, field, defaultVal, mapKeyVal] = key.split(':');
    const isEnum = Array.isArray(type);
    const isMap = mapKeyVal;
    const defaultStr = defaultVal ? ` // default=${defaultVal}` : '';
    if (isEnum) {
      res[`enum:${field}`] = `[${type.join(', ')}]${defaultStr}`;
      continue;
    }
    if (isMap) {
      res[`${field}`] = `map${mapKeyVal}${defaultStr}`;
      continue;
    }
    const name = rule === 'repeated' ? `repeated:${field}` : field;
    res[name] = isObject(type) ? generateRequestFields(type) : `${type}${defaultStr}`;
  }
  return res;
}

/**
 * Generate response fields that will be used in a mock file from the formated fields.
 * @param {object} formatedFields
 */
function generateResponseFields(formatedFields, indent = '  ') {
  const res = ['{'];
  for(const [key, type] of Object.entries(formatedFields)) {
    const [rule, messageType, field, defaultVal, mapKeyVal] = key.split(':');
    const isEnum = Array.isArray(type);
    const isMap = mapKeyVal;
    const repeat = typeof protorc.repeatedLength === 'function' ? protorc.repeatedLength() : protorc.repeatedLength;
    const isRepeated = rule === 'repeated';
    const prefix = `${indent}${/^\w+$/.test(field) ? field : ('\''+field+'\'')}`;

    const globalField = getProtorcType('', field, messageType);
    if (globalField) {
      res.push(`${prefix}: ${globalField},`);
      continue;
    }

    // for map types
    if (isMap) {
      res.push(`${indent}// map: ${mapKeyVal}, set map values like below.`);
      const mapKey = mapKeyVal.includes('<string') ? 'string1' : '\'123\'';
      if (isObject(type)) {
        const sub = generateResponseFields(type);
        res.push(`${indent}${mapKey}: ${sub.join('\n'+indent)},`);
      } else {
        res.push(`${indent}${mapKey}: ${getProtorcType(type)},`);
      }
      continue;
    }
    // for enum types
    if (isEnum) {
      const defaultIndex = defaultVal ? type.findIndex(v => v === defaultVal) : -1;
      const defaultStr = defaultIndex !== -1 ? `, default: ${defaultVal}` : '';
      const value = defaultIndex !== -1 ? defaultIndex : faker.pick(Object.keys(type));
      res.push(`${prefix}: ${value}, // enum: [${type.join(', ')}]${defaultStr}`);
      continue;
    }
    if (isObject(type)) {
      const sub = generateResponseFields(type, indent + '  ');
      const [leftBracket, rightBracket] = [sub.shift(), sub.pop()];
      if (sub.length === 0) {
        // for empty complex fields
        res.push(`${prefix}: ${isRepeated ? '[]' : '{}'},`);
      } else if (isRepeated) {
        // for repeated complex fields
        res.push(`${prefix}: [...Array(${repeat})].map(() => (${leftBracket}`, ...sub, `${indent}${rightBracket})),`);
      } else {
        // for complex fields
        res.push(`${prefix}: ${leftBracket}`, ...sub, `${indent}${rightBracket},`);
      }
      continue;
    }

    if (isRepeated) {
      // for repeated primitive fields
      res.push(`${prefix}: [...Array(${repeat})].map(() => ${getProtorcType(type, field, messageType)}),`);
    } else {
      // for primitive fields
      res.push(`${prefix}: ${getProtorcType(type, field, messageType)},`);
    }
  }
  res.push('}');
  return res;
}

/**
 * Get a default value for the specified type(such as: int32, string, ...).
 * @param {string} type
 * @param {string} field
 * @param {string} responseType
 * @returns
 */
function getProtorcType(type, field = '', typeName = '') {
  let res = type;

  if (type && isObject(protorc.globalTypes) && (type in protorc.globalTypes)) {
    const typeInfo = protorc.globalTypes[type];
    res = typeof typeInfo === 'function' ? typeInfo(typeName) : typeInfo;
    res = /^faker.\w+\(/.test(res) ? res : JSON.stringify(res);
    if (String(res).indexOf('\n') !== -1) {
      throw new Error('type:['+type + '] should not contain a `\n` character.');
    }
  }

  if (field && isObject(protorc.globalFields) && (field in protorc.globalFields)) {
    const fieldInfo = protorc.globalFields[field];
    res = typeof fieldInfo === 'function' ? fieldInfo(typeName) : fieldInfo;
    res = /^faker.\w+\(/.test(res) ? res : JSON.stringify(res);
    if (String(res).indexOf('\n') !== -1) {
      throw new Error('field:['+field + '] should not contain a `\n` character.');
    }
  }
  return res;
}

/**
 * Load and get service definition from the specified proto file.
 * @param {string} protoFileEntry A proto entry file
 * @param {string[]} protoPaths A list of search paths for imported .proto files.
 */
function getProtoService(protoFileEntry, protoPaths = []) {
  const paths = protoPaths.concat(path.dirname(protoFileEntry)).map(dir => {
    return ['--path', dir];
  });
  return new Promise((resolve, reject) => {
    pbjs.main(['--target', 'json', protoFileEntry, ...paths.flat()], function(err, output) {
      if (err) return reject(err);

      const formatedTree = formatTree(JSON.parse(output));
      // console.log('formatedTree:', JSON.stringify(formatedTree, null, 2));

      const { methods, packagePath } = getService(formatedTree) || {};
      if (!methods || !Object.keys(methods).length) {
        return reject(new Error('No service methods were found.'));
      }

      for(const key in methods) {
        const item = methods[key];
        const { requestType, responseType } = item;
        item.request = getTypes(formatedTree, packagePath, requestType);
        item.response = getTypes(formatedTree, packagePath, responseType);
      }
      // console.log('methods:', JSON.stringify(methods, null, 2));
      resolve(methods);
    });
  });
}

/**
 * Get all scalar types from the specified typeTree.
 * @param {object} formatedTree
 * @param {string | string[]} packagePath
 * @param {string | object} typeTree
 * @returns
 */
function getTypes(formatedTree, packagePath, typeTree) {
  if (isScalarType(typeTree)) return typeTree;

  if (!isObject(typeTree)) {
    // It's an absolute namespace searching if [typeTree] contains a dot.
    const path = String(typeTree).includes('.') ? typeTree : packagePath.concat(typeTree);
    const subType = pick(formatedTree, path);
    if (!subType) return typeTree;
    return isScalarType(subType) ? subType : getTypes(formatedTree, packagePath, subType);
  }
  if (typeTree['.enum']) {
    return Object.keys(typeTree).filter(i => i !== '.enum');
  }
  const res = {};
  for(const [field, type] of Object.entries(typeTree['.fields'] || typeTree)) {
    if (/^\./.test(field)) continue;

    if (isScalarType(type) || isObject(type)) {
      res[field] = isScalarType(type) ? type : getTypes(formatedTree, packagePath, type);
      continue;
    }

    const typeInNested = pick(typeTree, type);
    if (typeTree['.fields'] && typeInNested) {
      if (isObject(typeInNested) && typeInNested['.enum']) {
        res[field] = Object.keys(typeInNested).filter(i => i !== '.enum');
      } else if (isScalarType(typeInNested)) {
        res[field] = typeInNested;
      } else if (isObject(typeInNested)) {
        res[field] = getTypes(formatedTree, packagePath, typeInNested);
      }
      continue;
    }
    res[field] = getTypes(formatedTree, packagePath, type);
  }
  return res;
}

/**
 * Parse & format fields from a raw tree which is generated from pbjs.
 * @param {object} tree
 */
function formatTree(tree) {
  if (!isObject(tree) || !isObject(tree.nested)) return {};

  const res = {};
  for(const key in tree.nested) {
    res[key] = {};
    const item = tree.nested[key];
    if (isService(item)) {
      res[key] = item.methods;
      res[key]['.service'] = true;
    } else if (isEnumNode(item)) {
      res[key] = item.values;
      res[key]['.enum'] = true;
    } else if (isLeafNode(item)) {
      res[key] = formatFields(item.fields, key);
      res[key]['.leaf'] = true;
    } else {
      res[key] = formatTree(item);
      if (isObject(item.fields)) {
        res[key]['.fields'] = formatFields(item.fields, key);
      }
    }
  }
  return res;
}

/**
 * Format fields.
 * @param {object} fields
 */
function formatFields(fields, messageType) {
  const res = {};
  for(const key in fields) {
    const {rule = 'optional', keyType, type, options} = fields[key];
    const defaultVal = isObject(options) && ('default' in options) ? options.default : '';
    const field = keyType
      ? `${rule}:${messageType}:${key}:${defaultVal}:<${keyType},${type}>`
      : `${rule}:${messageType}:${key}:${defaultVal}`;
    res[field] = type;
  }
  return res;
}

/**
 * Get service node from the specified tree.
 * @param {object} formatedTree
 * @param {string[]} path
 */
function getService(formatedTree, path = []) {
  for(const key in formatedTree) {
    const node = formatedTree[key];
    if (!isObject(node)) continue;

    if (node['.service'] === true) {
      const methods = { ...node };
      delete methods['.service'];
      return { methods, packagePath: path };
    }
    const res = getService(node, [...path, key]);
    if (res) return res;
  }
  return false;
}

/**
 * Check whether the specifed `obj` is an object.
 * @param {unknown} obj
 */
function isObject(obj) {
  return {}.toString.call(obj) === '[object Object]';
}

/**
 * Check whether the specifed `node` is a leaf node.
 * @param {object} node
 */
function isLeafNode(node) {
  return isObject(node) && isObject(node.fields) && !isObject(node.nested);
}

/**
 * Check whether the specifed `node` is a enum node.
 * @param {object} node
 */
function isEnumNode(node) {
  return isObject(node) && (Object.keys(node).length === 1) && isObject(node.values);
}

/**
 * Check whether the specifed `node` is a service node.
 * @param {object} node
 */
function isService(node) {
  const isOnly = isObject(node) && Object.values(node).length === 1;
  const hasMethods = isObject(node.methods);
  if (!isOnly || !hasMethods) {
    return false;
  }
  const isEmpty = Object.values(node.methods).length === 0;
  const hasRequestType = !isEmpty && Object.values(node.methods).every(i => i.requestType);
  const hasResponseType = !isEmpty && Object.values(node.methods).every(i => i.responseType);

  return isEmpty || (hasRequestType && hasResponseType);
}

/**
 * Check whether the specifed `type` is a scalar type.
 * @param {object} node
 */
function isScalarType(type) {
  return isObject(type) ? false : [
    'int32', 'int64', 'string', 'bool', 'double', 'float', 'uint32', 'bytes',
    'uint64', 'sint32', 'sint64', 'fixed32', 'fixed64', 'sfixed32', 'sfixed64',
  ].includes(type);
}

/**
 * Gets the value at path of object. If the resolved value is undefined,
 * the defaultValue is returned in its place.
 * @param {object} object
 * @param {string|string[]} path
 * @param {any} defaultValue
 */
function pick(object, path, defaultValue) {
  if (!isObject(object)) return defaultValue;
  const arr = Array.isArray(path) ? path : String(path).split('.').filter(key => key);
  const keys = arr.map(val => `${val}`); // to string

  const result = keys.reduce((obj, key) => obj && obj[key], object);

  return result === undefined ? defaultValue : result;
}

/**
 * Get template of a mock file.
 * @param {string} method
 * @param {string} requestTypeName
 * @param {object} request
 * @param {string[]} response
 */
function getMockFileTemplate(method, requestTypeName, request, response) {
  const apiPrefix = String(protorc.apiPrefix).trim().replace(/\/+$/g, '');
  const requestField = requestTypeName ? `message ${requestTypeName}` : '';
  const requestStr = JSON.stringify(request, null, 2).replace(/\n/g, '\n * ').replace(/(?<=": )"(.*)"(,?)/g, '$1$2');
  const protoRequestFields = protorc.generateProtoRequestFields ? [
    '\n',
    '/**',
    ` * ${requestField || 'Proto Request Fields'}: ${requestStr}`,
    ' */'
  ].join('\n') : '';
  /* eslint-disable */
  return `
/**
 * @url ${apiPrefix}/${method}
 * @delay 10
 * @method any
 */
/* eslint-disable */${protoRequestFields}
const faker = require('http-request-mock/plugin/faker.js');
module.exports = (request) => {
  return ${response.replace(/\n/g, '\n  ')}
};
`.trim();
  /* eslint-enable */
}

