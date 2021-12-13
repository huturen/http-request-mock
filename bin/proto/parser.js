const fs = require('fs');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js');
const defaultProtorc = require('./.protorc.js');
const faker = require('../../plugin/faker');

module.exports = {
  getProtoService,
  generateMockFiles
};

let protorc = defaultProtorc;

/**
 * Generate mock files for the specified proto file.
 * @param {string} protorcConfig Configs defined in .protorc
 * @param {string} outputDir A directory in which the genrated files are stored.
 */
function generateMockFiles({ protorcConfig, outputDir }) {
  protorc = protorcConfig;

  const protoPaths = Array.isArray(protorc.protoPaths) && protorc.protoPaths.length
    ? protorc.protoPaths
    : path.dirname(protorc.protoEntry); // To avoid include paths warnings.

  const protoService = getProtoService(protorc.protoEntry, protoPaths);
  if (Object.keys(protoService).length === 0) {
    return console.log('No service methods were found.');
  }

  for(const [method, {request, requestTypeName, response}] of Object.entries(protoService)) {
    const req = generateRequestFields(request);
    const res = generateResponseFields(response).join('\n');

    const isIgnored = (
      protorc.includeMethods && protorc.includeMethods.length && !protorc.includeMethods.includes(method)
    ) || (
      protorc.excludeMethods && protorc.excludeMethods.length && protorc.excludeMethods.includes(method)
    );
    if (isIgnored) {
      console.log(`Method [${method}] was ignored.`);
      continue;
    }

    const file = path.resolve(outputDir, `${method}.js`);
    if (!protorc.overwrite && fs.existsSync(file)) {
      console.log(`Skipped mock file: ${file}`);
      continue;
    }

    const content = getMockFileTemplate(method, requestTypeName, req, res);
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
  for(const [key, info] of Object.entries(formatedFields)) {
    const [label, type, field, isComplex, isEnum] = key.split(':');
    if (isEnum) {
      res[`enum:${field}`] = `[${info.values}]`;
      continue;
    }
    const name = label === 'repeated' ? ('repeated:'+field) : field;
    res[name] = isComplex ? generateRequestFields(info) : type;
  }
  return res;
}

/**
 * Generate response fields that will be used in a mock file from the formated fields.
 * @param {object} formatedFields
 */
function generateResponseFields(formatedFields, indent = '  ') {
  const res = ['{'];
  for(const [key, info] of Object.entries(formatedFields)) {
    const [label, type, field, isComplex, isEnum, isMap] = key.split(':');
    const repeat = typeof protorc.repeatedLength === 'function' ? protorc.repeatedLength() : protorc.repeatedLength;
    const isRepeated = label === 'repeated';
    const prefix = `${indent}${/^\w+$/.test(field) ? field : ('\''+field+'\'')}`;
    // for map types
    if (isMap) {
      res.push(`${indent}// map: <${field}, ${info.type}>`);
      const mapKey = getProtorcType(field).includes('string') ? 'string' : '123';
      if (isObject(info.value)) {
        const sub = generateResponseFields(info.value);
        res.push(`${indent}${mapKey}: ${sub.join('\n'+indent)},`);
      } else {
        res.push(`${indent}${mapKey}: ${getProtorcType(info.type)},`);
      }
      continue;
    }
    // for enum types
    if (isEnum) {
      const defaultIndex = info.defaultValue ? info.values.findIndex(v => v === info.defaultValue) : -1;
      const defaultVal = defaultIndex !== -1 ? `, default: ${info.defaultValue}` : '';
      const value = defaultIndex !== -1 ? defaultIndex : faker.pick(Object.keys(info.values));
      res.push(`${prefix}: ${value}, // enum: [${info.values}]${defaultVal}`);
      continue;
    }
    if (isComplex) {
      const sub = generateResponseFields(info, indent + '  ');
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
      res.push(`${prefix}: [...Array(${repeat})].map(() => ${getProtorcType(type, field)}),`);
    } else {
      // for primitive fields
      res.push(`${prefix}: ${getProtorcType(type, field)},`);
    }
  }
  res.push('}');
  return res;
}

/**
 * Get a default value for the specified type(such as: int32, string, ...).
 * @param {string} type
 * @param {string} field
 * @returns
 */
function getProtorcType(type, field = '') {
  if (protorc.globalTypes[type] === undefined) {
    return type;
  }
  let res = undefined;

  if (type && isObject(protorc.globalTypes) && (type in protorc.globalTypes)) {
    const typeInfo = protorc.globalTypes[type];
    res = typeof typeInfo === 'function' ? typeInfo() : typeInfo;
    if (String(res).indexOf('\n') !== -1) {
      throw new Error('type:['+type + '] should not contain a `\n` character.');
    }
  }

  if (field && isObject(protorc.globalFields) && (field in protorc.globalFields)) {
    const fieldInfo = protorc.globalFields[field];
    res = JSON.stringify(typeof fieldInfo === 'function' ? fieldInfo() : fieldInfo);
    if (String(res).indexOf('\n') !== -1) {
      throw new Error('field:['+field + '] should not contain a `\n` character.');
    }
  }
  return res;
}

/**
 * Load and get service definition from the specified proto file.
 * @param {string} protoFileEntry A proto entry file
 * @param {string|string[]} protoPaths A list of search paths for imported .proto files.
 */
function getProtoService(protoFileEntry, protoPaths) {
  const args = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [],
  };
  if (protoPaths) {
    args.includeDirs = Array.isArray(protoPaths) ? protoPaths : [protoPaths];
  }
  const packageDefinition = protoLoader.loadSync(protoFileEntry, args);
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

  const methods = getServiceMethods(protoDescriptor);
  if (!methods || Object.keys(methods).length === 0) {
    return {};
  }

  const messages = getMessages(protoDescriptor);
  const res = {};
  for(let method in methods) {
    const { request, response } = methods[method];
    res[method] = {
      request: getFormatedFields(request, messages),
      response: getFormatedFields(response, messages),
      requestTypeName: request.name,
    };
  }

  return res;
}

/**
 * Parse & format fields from a formated type node.
 * @param {object} formatedTypeNode
 * @param {object} messages
 */
function getFormatedFields(formatedTypeNode, messages) {
  const res = {};
  const { fields, nested } = formatedTypeNode;
  const types = {...messages, ...nested};

  for(const [field, info] of Object.entries(fields)) {
    const {type, label, typeName, number, defaultValue, isMapEntry} = info;
    const isComplex = typeName ? '1' : '';
    const isEnum = type === 'enum' ? '1' : '';
    const isMap = isMapEntry ? '1' : '';
    const key = `${label}:${typeName || type}:${field}:${isComplex}:${isEnum}:${isMap}`;
    if (isMap) {
      res[key] = typeName
        ? { type: typeName, value: getFormatedFields(types[typeName], messages) }
        : { type, value: type };
      continue;
    }
    if (type === 'message' && types[typeName]) {
      res[key] = getFormatedFields(types[typeName], messages);
      continue;
    }
    if (type === 'enum' && types[typeName]) {
      res[key] = { type, values: types[typeName], defaultValue };
      continue;
    }

    res[key] = { number, defaultValue };
  }
  return res;
}

/**
 * Get all methods from proto descriptor.
 * @param {object} descriptor
 */
function getServiceMethods(descriptor) {
  if (!isObject(descriptor)) {
    return false;
  }

  for(const item of Object.values(descriptor)) {
    if (isService(item)) {
      return Object.entries(item.service).reduce((methods, [key, info]) => {
        methods[key] = {
          request: formatTypeNode(info.requestType.type),
          response: formatTypeNode(info.responseType.type),
        };
        return methods;
      }, {});
    }

    const res = getServiceMethods(item);
    if (res) {
      return res;
    }
  }
  return false;
}

/**
 * Get all messages from proto descriptor.
 * @param {object} descriptor
 * @param {number} level
 */
function getMessages(descriptor, level = 0) {
  if (!isObject(descriptor) || level > 30) {
    return {};
  }

  let messages = {};
  for(const key in descriptor) {
    if (isMessage(descriptor[key])) {
      messages[key] = formatTypeNode(descriptor[key].type);
      continue;
    }
    if (isObject(descriptor[key])) {
      messages = {...getMessages(descriptor[key], level + 1), ...messages};
    }
  }
  return messages;
}

/**
 * Parse and format a type node from `@grpc/grpc-js`
 * @param {object} typeNode
 */
function formatTypeNode(typeNode) {
  const fields = {};
  // type of enum
  if (typeof typeNode.name === 'string' && Array.isArray(typeNode.value) && ('options' in typeNode)) {
    return typeNode.value.map(i => i.name);
  }
  // type of map
  if (isObject(typeNode.options) && typeNode.options.mapEntry) {
    const [keyItem, valueItem] = [typeNode.field[0], typeNode.field[1]];
    const key = keyItem.type.replace(/^TYPE_/i, '').toLowerCase();

    valueItem.label = valueItem.label.replace(/^LABEL_/i, '').toLowerCase();
    valueItem.type = valueItem.type.replace(/^TYPE_/i, '').toLowerCase();
    valueItem.isMapEntry = true;

    fields[key] = valueItem;
    return { fields, nested: {}, name: '' };
  }
  for(const item of typeNode.field) {
    // ignore extended fields
    if (/^\./.test(item.name) || item.extendee) continue;

    item.label = item.label.replace(/^LABEL_/i, '').toLowerCase();
    item.type = item.type.replace(/^TYPE_/i, '').toLowerCase();
    fields[item.name] = item;
  }

  const nested = {};
  for(const item of typeNode.nestedType) {
    nested[item.name] = formatTypeNode(item);
  }
  for(const item of typeNode.enumType) {
    nested[item.name] = item.value.map(i => i.name);
  }
  return { fields, nested, name: typeNode.name };
}

/**
 * Check whether a node is service.
 * @param {object} item
 */
function isService(item) {
  return typeof item === 'function' && (item.name === 'ServiceClientImpl') && item.service;
}

/**
 * Check whether a node is a message definition.
 * @param {object} item
 */
function isMessage(item) {
  if (isObject(item.fileDescriptorProtos)) {
    item.fileDescriptorProtos = 1;
  }
  return isObject(item) && item.format && item.type && item.fileDescriptorProtos && typeof item.type.name === 'string';
}

/**
 * Check whether the specifed `obj` is an object.
 * @param {any} obj
 */
function isObject(obj) {
  return {}.toString.call(obj) === '[object Object]';
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
  const protoRequestFields = protorc.generateProtoRequestFields ? [
    '\n',
    '/**',
    ` * ${requestField || 'Proto Request Fields'}: ${JSON.stringify(request, null, 2).replace(/\n/g, '\n * ')}`,
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
`;
  /* eslint-enable */
}
