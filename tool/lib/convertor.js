const fs = require('fs');

module.exports = {
  convertJsType,
  covertES62CJS,
  covertCJS2ES6
};

/**
 * Convert es6 to commonjs
 * @param {string} codes
 */
function covertES62CJS(codes) {
  return codes.replace(
    /^(\s*)import\s+(\w+)\s+from\s+('|")([.\w/-]+)\3\s*;?\s*$/gm,
    '$1const $2 = require(\'$4\');'
  ).replace(
    /^(\s*)export\s+default\s+(.*)$/gm,
    '$1module.exports = $2'
  );
}

/**
 * Convert commonjs to es6
 * @param {string} codes
 */
function covertCJS2ES6(codes) {
  return codes.replace(
    /^(\s*)(const|let)\s+([^=]*?)\s*?=\s*?require\s*\(\s*('|")(.*?)\4\s*?\)\s*;?\s*$/sgm,
    '$1import $3 from \'$5\';'
  ).replace(
    /^(\s*)module\.exports\s+=\s*(.*)$/gm,
    '$1export default $2'
  );
}

/**
 * Convert type of js file.
 * @param {string} type cjs or esm
 * @param {string[] | Record<string, string>} files
 */
function convertJsType(type, files) {
  const isCjs = type === 'commonjs' || type === 'cjs';
  const list = Array.isArray(files) ? files : Object.keys(files);
  for(const file of list) {
    const name = files[file] || file;
    const content = fs.readFileSync(file, {encoding: 'utf8'});
    if (isCjs && (/\s*export\s+default\s+/.test(content) || /import[^\n]+from\s+/.test(content))) {
      fs.writeFileSync(name, covertES62CJS(content));
      continue;
    }
    if (!isCjs && /\s*module\.exports\s*=/.test(content)) {
      fs.writeFileSync(name, covertCJS2ES6(content));
    }
  }
}


