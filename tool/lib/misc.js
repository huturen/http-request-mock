/* eslint-env node */
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const zlib = require('zlib');
const { Transform } = require('stream');

const entryPoints = [
  'src/index.js',
  'http-request-mock.js',
  'http-request-mock.pure.js',
  'http-request-mock.esm.mjs',
  'http-request-mock.pure.esm.mjs'
];
const defaultHeadersForProxyServer = {
  'x-powered-by': 'http-request-mock',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': '*',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': '*',
  'access-control-allow-credentials': 'true',
};

module.exports = {
  entryPoints,
  defaultHeadersForProxyServer,
  log,
  tryToParseJson,
  setLocalStorage,
  reloadRuntime,
  getAppRoot,
  resolve,
  formatPath,
  watchDir,
  responseTransform,
  getRequestBody,
  parseQuery,
  doProxy
};

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
  } catch (e) {
    return defaultVal;
  }
}

/**
 * Set a global localStorage object for the compatibility of cache plugin.
 */
function setLocalStorage() {
  let localStorageCache = {};
  global.localStorage = {
    get length() {
      return Object.keys(localStorageCache).length;
    },
    setItem(key, val) {
      localStorageCache[key] = val;
    },
    getItem(key) {
      return localStorageCache[key];
    },
    clear() {
      localStorageCache = {};
    },
    removeItem(key) {
      delete localStorageCache[key];
    },
    // https://developer.mozilla.org/en-US/docs/Web/API/Storage/key
    key(index) {
      return Object.keys(localStorageCache)[index];
    }
  };
}

/**
 * Reload .runtime.js and the specified mock files.
 * @param {string} mockDirectory
 * @param {string[]} files
 */
function reloadRuntime(mockDirectory, files = []) {
  files.forEach((file) => {
    const relativeFile = path.relative(mockDirectory, file);
    try {
      delete require.cache[require.resolve(path.resolve(file))];
      log('reload mock file:', relativeFile);
    } catch (e) {
      log(`reload mock file ${relativeFile} error: `, e.message);
    }
  });
  try {
    const runtime = require.resolve(path.resolve(mockDirectory, '.runtime.js'));
    const mocker = require(runtime);
    mocker && mocker.reset();

    delete require.cache[runtime];
    require(runtime);
  } catch (err) {
    log('reload .runtime.js error: ', err);
  }
}

/**
 * Get root directory of current application
 */
function getAppRoot() {
  if (!/\bnode_modules\b/.test(__dirname)) return process.cwd();

  const root = __dirname.split('node_modules')[0];
  const json = path.resolve(root, 'package.json');
  if (!fs.existsSync(json)) return process.cwd();

  return fs.readFileSync(json, 'utf8').includes('"http-request-mock"') ? root : process.cwd();
}

/**
 * Resolve path but treat '\' as '/' on windows
 * @param  {any} args
 */
function resolve(...args) {
  return formatPath(path.resolve(...args));
}

/**
 * Treat '\' as '/' on windows
 * @param  {string} path
 * @returns
 */
function formatPath(path) {
  return process.platform === 'win32' ? (path+'').replace(/\\/g, '/') : path;
}

/**
 * Watch mock directory & update .runtime.js.
 * @param {object} webpackInstance
 * @param {string} mockDirectory
 * @param {function} reloadFunction
 */
function watchDir(webpackInstance, mockDirectory, reloadFunction) {
  const pathsSet = new Set();
  let timer = null;
  webpackInstance.setRuntimeConfigFile(); // update .runtime.js before watching

  chokidar
    .watch(mockDirectory, { ignoreInitial: true })
    .on('all', (event, filePath) => {
      const filename = path.basename(filePath);
      // Only watch file that matches /^[\w][-\w]*\.js$/
      if (event === 'addDir' || event === 'error') return;
      if (filename && !/^[\w][-\w]*\.js$/.test(filename)) return;

      if (pathsSet.has(filePath)) return;
      pathsSet.add(filePath);

      clearTimeout(timer);
      timer = setTimeout(() => {
        webpackInstance.setRuntimeConfigFile();
        reloadFunction([...pathsSet]);
        console.log(' ');
        pathsSet.clear();
      }, 100);
    });
}

/**
 * Generate a stream transform for response.
 * @param {object} response
 * @param {function | undefined} handler
 */
function responseTransform(response, handler) {
  const buf = [];
  return new Transform({
    construct(callback) {
      callback();
    },
    transform(chunk, _, callback) { // _: encoding
      buf.push(chunk);
      callback();
    },
    async flush(callback) {
      if (typeof handler === 'function') {
        const body = await handler(response, Buffer.concat(buf).toString());
        this.push(Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
      } else {
        this.push(Buffer.concat(buf));
      }
      callback();
    }
  });
}

/**
 * Get body for the specified request.
 * @param {object} request
 */
function getRequestBody(request) {
  if (String(request.method) === 'GET') {
    return undefined;
  }

  const buf = [];
  return new Promise((resolve, reject) => {
    request
      .on('error', err => reject(err))
      .on('data', chunk => buf.push(chunk))
      .on('end', () => {
        let body = Buffer.concat(buf).toString();
        if (body) {
          try {
            body = JSON.parse(body);
          } catch (err) {
            if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
              body = parseQuery(body);
            }
          }
        }
        resolve(body);
      });
  });
}

/**
 * Parse search query.
 * @param {object|string} search
 */
function parseQuery(search) {
  return [...new URLSearchParams(search).entries()].reduce((res, [key, val]) => {
    // for keys which ends with square brackets, such as list[] or list[1]
    if (key.match(/\[(\d+)?\]$/)) {
      const field = key.replace(/\[(\d+)?\]/, '');
      res[field] = res[field] || [];
      if (key.match(/\[\d+\]$/)) {
        res[field][Number(/\[(\d+)\]/.exec(key)[1])] = val;
      } else {
        res[field].push(val);
      }
      return res;
    }
    if (key in res) {
      res[key] = [].concat(res[key] , val);
    } else {
      res[key] = val;
    }
    return res;
  }, {});
}

/**
 * Proxy the received request to the specified url.
 * The specified url is with protocol such as: http://jsonplaceholder.typicode.com/todos/1
 * @param {object} proxyInstance node-http-proxy instance
 * @param {object} req
 * @param {object} res
 * @param {string} url
 * @param {function | undefined} handler
 * @returns
 */
function doProxy({proxyInstance, req, res, url, handler, headers}) {
  const { protocol, host, pathname, search } = new URL(url);
  req.url = `${pathname}${search}`;

  return new Promise((resolve, reject) => {
    proxyInstance.once('proxyRes', (proxyRes, _, res) => {
      const transform = responseTransform(proxyRes, handler);
      proxyRes.once('end', () => resolve(true));

      // http://nodejs.cn/api/zlib/compressing_http_requests_and_responses.html
      // ignore pipe for 204(No Content)
      const zipHeaders = ['gzip', 'compress', 'deflate'];
      if (zipHeaders.includes(proxyRes.headers['content-encoding']) && proxyRes.statusCode !== 204) {
        proxyRes.pipe(zlib.createUnzip()).pipe(transform).pipe(res);
      } else if (proxyRes.headers['content-encoding'] === 'br' && proxyRes.statusCode !== 204) {
        proxyRes.pipe(zlib.createBrotliDecompress()).pipe(transform).pipe(res);
      } else {
        proxyRes.pipe(transform).pipe(res);
      }
    });

    const opts = {
      changeOrigin: true,
      target: `${protocol}//${host}`,
      cookieDomainRewrite: '',
      followRedirects: true,
      selfHandleResponse: true,
    };
    // headers: object with extra headers to be added to target requests.
    if (headers && typeof headers === 'object') {
      opts.headers = headers;
    }
    proxyInstance.web(req, res, opts, (err) => {
      log(`proxy error[${url}]: `, err.message);
      reject(err);
    });
  });
}
