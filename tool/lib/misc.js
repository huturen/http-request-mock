module.exports = { log, tryToParseJson };

/**
 * Common log
 * @param  {...any} args
 */
function log(...args) {
  console.log('\x1b[32m[http-request-mock]\x1b[0m', ...args);
}


/**
 * Try to parse a JSON string
 * @param {unknown} body
 */
function tryToParseJson(str, defaultVal = null) {
  try {
    return JSON.parse(String(str));
  } catch(e) {
    return defaultVal;
  }
}
