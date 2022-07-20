/* eslint-env node */
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');
const WebpackPlugin = require('./webpack.js');
const Mocker = require('../../src/mocker/mocker-for-node').default;

const mocker = new Mocker();

const {
  log,
  tryToParseJson,
  setLocalStorage,
  reloadRuntime,
  getAppRoot,
  watchDir,
  doProxy,
  getRequestBody,
  defaultHeadersForProxyServer,
} = require('../lib/misc.js');

const proxy = httpProxy.createProxyServer({});
const defaultHeaders = defaultHeadersForProxyServer;
const cache = {};

/**
 * A middleware for webpack dev server
 */
class Middleware {
  /**
   * Initialization.
   *
   * @param {string} mockDir
   * @param {string} index
   * @param {string} environment
   * @param {boolean} matchRequestsByDirectoryStructure
   */
  constructor({
    mockDir,
    index,
    headers = {},
    environment = 'NODE_ENV=development',
    matchRequestsByDirectoryStructure = false
  }) {
    if (cache.middlewareInstance) return cache.middlewareInstance;
    cache.middlewareInstance = this;

    this.mockDirectory = mockDir;
    this.runtime = path.resolve(this.mockDirectory, '.runtime.js');
    this.index = index;
    this.headers = headers;
    this.environment = /^\w+=\w+$/.test(environment) ? environment.split('=') : '';
    this.matchRequestsByDirectoryStructure = matchRequestsByDirectoryStructure;

    setLocalStorage();

    process.on('unhandledRejection', (reason, p) => {
      console.error(reason, 'Unhandled Rejection at Promise', p);
    }).on('uncaughtException', err => {
      console.error(err, 'Uncaught Exception thrown');
      process.exit(1);
    });
  }

  /**
   * Reload .runtime.js and the specified mock files.
   * @param {string[]} files
   */
  reload(files = []) {
    this.mockDirectory && reloadRuntime(this.mockDirectory, files);
  }

  /**
   * Set middleware listener
   * @param {object} req
   * @param {object} res
   * @param {function} next
   */
  async setMiddlewareListener(req, res, next) {
    return this.matchRequestsByDirectoryStructure
      ? await this.matchRequestsByDirectory(req, res, next)
      : await this.matchRequestsByRuntime(req, res, next);
  }

  /**
   * Match requests by directory conventions
   * @param {object} req
   * @param {object} res
   * @param {function} next
   */
  async matchRequestsByDirectory(req, res, next) {
    const requestUrl = req.url;
    const requestMethod = req.method.toLocaleUpperCase();
    const requestPath = String(req.path || '').replace(/\.\./g, '.');

    const mockFile = path.resolve(this.mockDirectory, `.${requestPath}.js`);
    if (!fs.existsSync(mockFile)) return next();

    try {
      // "@deProxy" does not compatibility with "matchRequestsByDirectoryStructure" option.
      mocker.mock({ ...mocker.use(mockFile, true), url: requestPath, deProxy: false });
    } catch(err) {
      return next(err);
    }

    const mockItem = mocker.matchMockItem(requestUrl, requestMethod);
    if (!mockItem) return next();
    if (mockItem.times-- <= 0) return next();

    const request = {
      url: requestUrl,
      method: requestMethod,
      headers: req.headers,
      query: req.query,
      body: await getRequestBody(req),
    };

    if (mockItem.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockItem.delay));
    }

    const remoteInfo = mockItem.getRemoteInfo(request.url);
    if (!remoteInfo) {
      return this.doMockResponse(req, res, next, request, mockItem);
    }

    if (remoteInfo.method) {
      req.method = remoteInfo.method;
    }

    return this.doProxy(req, res, next, remoteInfo.url, async (proxyRes, responseBody) => {
      const responseJson = tryToParseJson(responseBody);

      return this.doRemoteMockResponse(res, next, request, mockItem, {
        status: proxyRes.statusCode,
        headers: proxyRes.headers,
        response: responseJson || responseBody,
        responseText: responseBody,
        responseJson,
      });
    });
  }

  /**
   * Match requests by .runtime.js
   * @param {object} req
   * @param {object} res
   * @param {function} next
   */
  async matchRequestsByRuntime(req, res, next) {
    let mocker = null;
    try {
      mocker = require(this.runtime);
    } catch(err) {
      log('.runtime.js error: ', err);
      return next(err);
    }

    if (this.checkHttpRequestMockInnerMsg(mocker, req, res)) return;

    // http/localhost:9091/https/api.com/ -> https://api.com/
    const url = req.url.replace(/^\/(https?)\//i, '$1://');
    const method = req.method.toLocaleUpperCase();

    const mockItem = mocker.matchMockItem(url, method);
    if (!mockItem) return next();
    if (mockItem.times-- <= 0) return next();

    const request = {
      url,
      method,
      headers: req.headers,
      query: req.query,
      body: await getRequestBody(req),
    };

    if (mockItem.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockItem.delay));
    }

    const remoteInfo = mockItem.getRemoteInfo(request.url);
    if (!remoteInfo) {
      return this.doMockResponse(req, res, next, request, mockItem);
    }

    if (remoteInfo.method) {
      req.method = remoteInfo.method;
    }
    return this.doProxy(req, res, next, remoteInfo.url, async (proxyRes, responseBody) => {
      const responseJson = tryToParseJson(responseBody);

      return this.doRemoteMockResponse(res, next, request, mockItem, {
        status: proxyRes.statusCode,
        headers: proxyRes.headers,
        response: responseJson || responseBody,
        responseText: responseBody,
        responseJson,
      });
    });
  }

  async doMockResponse(req, res, next, request, mockItem) {
    const mockData = mockItem.response || mockItem.body;
    const mockResponse = typeof mockData === 'function' ? mockData : () => mockData;

    let result = '';
    try {
      result = await mockResponse.bind(mockItem)(request, mockItem);
    } catch(err) {
      return next(err);
    }

    if (result instanceof mockItem.bypass().constructor) {
      log('bypass mock for: ', request.url);
      return this.doProxy(req, res, next, request.url);
    }
    res.status(mockItem.status).set({ ...defaultHeaders, ...mockItem.headers });
    if (result && typeof result === 'object' && !res.headersSent) {
      res.set('content-type', 'application/json');
    }
    return res.end(typeof result === 'string' ? result : JSON.stringify(result), 'utf8');
  }

  async doRemoteMockResponse(res, next, request, mockItem, remoteResponse) {
    const mockData = mockItem.response || mockItem.body;
    const mockResponse = typeof mockData === 'function' ? mockData : () => mockData;

    let result = '';
    try {
      result = await mockResponse.bind(mockItem)(remoteResponse, request, mockItem);
    } catch(err) {
      next(err);
      return '';
    }

    if (result instanceof mockItem.bypass().constructor) {
      throw new Error('[http-request-mock] A request which is marked by @remote tag cannot be bypassed.');
    }
    res.status(mockItem.status).set({ ...defaultHeaders, ...mockItem.headers });
    if (result && typeof result === 'object' && !res.headersSent) {
      res.set('content-type', 'application/json');
    }
    return result;
  }

  /**
   * Check http-request-mock inner message from browser.
   * @param {object} mocker
   * @param {object} req
   * @param {object} res
   */
  checkHttpRequestMockInnerMsg(mocker, req, res) {
    if (!req.path.startsWith('/__hrm_msg__/')) {
      return false;
    }

    const msg = req.path.replace('/__hrm_msg__/', '');
    if (['reset', 'enable', 'disable', 'enableLog', 'disableLog'].includes(msg)) {
      mocker[msg]();
      log(`triggered mocker.${msg}().`);
    }

    res.status(200);
    res.set(defaultHeaders);
    res.end('ok', 'utf8');
    return true;
  }

  /**
   * Proxy the received request to the specified url.
   * The specified url is with protocol such as: http://jsonplaceholder.typicode.com/todos/1
   * @param {object} req
   * @param {object} res
   * @param {object} next
   * @param {string} url
   * @param {function | undefined} handler
   * @returns
   */
  async doProxy(req, res, next, url, handler) {
    if (typeof handler !== 'function' && !res.headersSent) {
      res.set({ ...defaultHeaders });
    }
    return doProxy({ proxyInstance: proxy, headers: this.headers, req, res, url, handler }).catch(err => {
      next(err);
    });
  }

  /**
   * Watch mock directory & update .runtime.js.
   */
  async watch() {
    const runtime = path.resolve(this.mockDirectory, '.runtime.js');
    if (!fs.existsSync(runtime)) {
      log(`There is no a .runtime.js file in the mock directory: ${this.mockDirectory}.`);
      log(`Generating [${runtime}]...`);
    }

    log(`Watching: ${this.mockDirectory}`);
    const webpack = new WebpackPlugin({
      dir: this.mockDirectory,
      index: this.index,
      entry: /1/,
      type: 'cjs',
      proxyMode: 'middleware'
    });
    webpack.proxyServer = 'middleware@/';
    webpack.environment = this.environment;

    watchDir(webpack, this.mockDirectory, this.reload.bind(this));
  }
}


/**
 * Initialization.
 *
 * @param {object} app required, webpack-dev-server app object
 * @param {string} mockDir required
 * @param {string} index optional Index entry, automatic detection by default.
 *           Valid values are: src/index.js, http-request-mock.js and http-request-mock.esm.mjs.
 *           [http-request-mock.js] for UMD
 *           [http-request-mock.pure.js] An alternative version without faker and cache plugins for UMD.
 * @param {string} environment optional
 * @param {boolean} matchRequestsByDirectoryStructure optional, for some edge cases, it is used to
 *                                                    mock the API under the same domain.
 */
module.exports = function ({
  app,
  mockDir,
  index,
  headers = {}, // headers: object with extra headers to be added to target requests.
  environment = 'NODE_ENV=development',
  matchRequestsByDirectoryStructure = false,
}) {
  const absoluteDir = path.isAbsolute(mockDir) ? mockDir : path.resolve(getAppRoot(), mockDir);

  if (!mockDir || !fs.existsSync(absoluteDir)) {
    throw new Error('The HttpRequestMockMiddlewarePlugin expects [mockDir] to be a valid directory.');
  }
  if (!app || typeof app !== 'function') {
    throw new Error('The HttpRequestMockMiddlewarePlugin expects [app] to be an object of webpack-dev-server.');
  }
  const entries = ['http-request-mock.js', 'http-request-mock.pure.js'];
  if (index && !entries.includes(index)) {
    const msg = [
      'The HttpRequestMockMiddlewarePlugin expects [index] to be a valid http-request-mock entry index.',
      'Valid values are: ' + entries.join(', ')
    ];
    throw new Error(msg.join('\n'));
  }

  const middleware = new Middleware({
    mockDir: absoluteDir, index, headers, environment, matchRequestsByDirectoryStructure
  });
  middleware.watch();

  if (!matchRequestsByDirectoryStructure) {
    log(`"${'.runtime.js'}" should be required/imported/injected at the top of your application entry point.`);
  }
  console.log(' '); // To avoid empty log

  app.all('*', (req, res, next) => {
    middleware.setMiddlewareListener(req, res, next);
  });
};
