const fs = require('fs');

module.exports = {
  parseCommentTags,
  getFileCommentTags,
  isRegExp,
  str2RegExp
};

/**
 * Extract meta information from comments in the specified file.
 * Meta information includes: @url, @method, @disable, @delay, @status and so on.
 * @param {string} file
 */
function parseCommentTags(file) {
  const tags = getFileCommentTags(file);
  const keys = [
    'url', 'method', 'disable', 'delay', 'status', 'requestHeaders', 'headers', 'header', 'times', 'remote', 'deProxy'
  ];
  const res = {};
  const headers = {};
  const requestHeaders = {};

  for(const {tag, info} of tags) {
    if (!keys.includes(tag)) continue;

    if (tag === 'header' || tag === 'headers' || tag === 'requestHeaders') {
      if (!/^[\w.-]+\s*:\s*.+$/.test(info)) continue;

      const key = info.slice(0, info.indexOf(':')).trim().toLowerCase();
      const val = info.slice(info.indexOf(':')+1).trim();
      if (!key || !val) continue;
      if (tag !== 'requestHeaders') {
        headers[key] = headers[key] ? [].concat(headers[key], val) : val;
      } else {
        requestHeaders[key] = requestHeaders[key] ? [].concat(requestHeaders[key], val) : val;
      }
    }
    res[tag] = info;
  }

  // status: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
  res.headers = Object.keys(headers).length > 0 ? headers : undefined;
  res.requestHeaders = Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined;
  res.method = /^(get|post|put|patch|delete|head)$/i.test(res.method) ? res.method.toUpperCase() : undefined;
  res.delay = /^\d{0,15}$/.test(res.delay) ? +res.delay : undefined;
  res.times = /^-?\d{0,15}$/.test(res.times) ? +res.times : undefined;
  res.status = /^[1-5][0-9][0-9]$/.test(res.status) ? +res.status : undefined;
  res.disable = res.disable !== undefined && /^(yes|true|1|)$/i.test(res.disable) ? 'yes' : (res.disable || undefined);
  res.remote = /^((get|post|put|patch|delete|head)\s+)?https?:\/\/[^\s]+$/i.test(res.remote) ? res.remote : undefined;
  res.deProxy = res.deProxy !== undefined ? true : undefined;


  if (isRegExp(res.url)) {
    res.regexp = str2RegExp(res.url, true);
    res.url = str2RegExp(res.url);
  }
  return res;
}

/**
 * Parse the first comment block of specified file and return meta tags.
 * @param {string} file
 */
function getFileCommentTags(file) {
  if (!fs.existsSync(file)) return [];

  const str = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  // We only parse the first comment block, so no 'g' modifier here
  const match = str.match(/\/\*\*\r?\n.*?\r?\n ?\*\//su);
  if (!match) return [];
  const comment = match[0];

  const tags = [];
  const reg = /^[ \t]*\*[ \t]*@(\w+)(?:[ \t]+(.*))?$/mg;
  let tag = reg.exec(comment);
  while(tag) {
    tags.push({ tag: tag[1], info: (tag[2] || '').trim() });
    tag = reg.exec(comment);
  }
  return tags;
}

/**
 * Whether or not 'str' is a RegExp object like string.
 * @param {string} str
 */
function isRegExp(str) {
  if (/^\/[^/]/.test(str) && /\/[gim]*$/.test(str)) {
    return '/';
  }
  if (/^#[^#]/.test(str) && /#[gim]*$/.test(str)) {
    return '#';
  }
  return false;
}

/**
 * Whether or not 'str' is a RegExp object like string.
 * @param {string} str
 * @param {boolean} returnRegStrWithOpts
 */
function str2RegExp(str, returnRegStrWithOpts = false) {
  let opts = '';
  str = str.replace(/^(#|\/)/g, '').replace(/(#|\/)([gim]*)$/, (match) => {
    opts = match.slice(1);
    return '';
  });

  if (returnRegStrWithOpts) {
    return [new RegExp(str, opts).toString().replace(/^\/|\/\w*$/g, ''), opts];
  }
  return new RegExp(str, opts);
}
