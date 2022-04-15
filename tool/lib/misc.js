module.exports = { log };

/**
 * Common log
 * @param  {...any} args
 */
function log(...args) {
  console.log('\x1b[32m[http-request-mock]\x1b[0m', ...args);
}
