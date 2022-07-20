/* eslint-env node */
const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');
const {
  log,
  tryToParseJson,
  setLocalStorage,
  reloadRuntime,
  doProxy,
  getRequestBody,
  parseQuery,
  defaultHeadersForProxyServer
} = require('../lib/misc.js');

const proxy = httpProxy.createProxyServer({});
const defaultHeaders = defaultHeadersForProxyServer;

const listeningAddress = [];

class Server {
  constructor() {
    this.mockDirectory = null;
    this.listeningAddress = [];
    this.host = 'localhost';
    this.type = 'cjs';
    this.minPort = 9001;
    this.maxPort = 9101;
    setLocalStorage();

    process.on('unhandledRejection', (reason, p) => {
      console.error(reason, 'Unhandled Rejection at Promise', p);
    }).on('uncaughtException', err => {
      console.error(err, 'Uncaught Exception thrown');
      process.exit(1);
    });
    process.setMaxListeners(0);
  }

  /**
   * Start a proxy server. Default port: 9091.
   *
   * @param {string} type
   * @param {string} mockDir
   * @param {string} environment
   * @param {string} proxyMode
   */
  async init({ type, mockDir, environment, proxyMode }) {
    this.type = type === 'es6' || type === 'esm' ? 'esm' : 'cjs';

    if (/^\w+=\w+$/.test(environment)) {
      const [key, val] = environment.split('=');
      process.env[key] = val;
    }

    this.mockDirectory = mockDir;
    let port = 9001;
    while(port <= this.maxPort) {
      const server = http.createServer(this.requestListener.bind(this));
      const res = await new Promise((resolve) => {
        server.once('error', (err) => {
          log(`${err.message}, retrying ${++port}.`);
          resolve(false);
        });
        server.listen(port, () => {
          resolve(true);
        });
      });
      if (res) break;
    }
    if (port <= this.maxPort) {
      if (proxyMode === 'matched') {
        log('Proxy mode is enabled, all requests that are matched by @url will be proxied to the server below.');
      }
      log(`A proxy server is listening at: \x1b[32mhttp://${this.host}:${port}\x1b[0m`, '\n');
      listeningAddress.push(this.host, port);
      return `${this.host}:${port}`;
    }
    throw new Error('start a proxy server error: no enough ports to use.');
  }

  /**
   * Reload .runtime.js and the specified mock files.
   * @param {string[]} files
   */
  reload(files = []) {
    this.mockDirectory && reloadRuntime(this.mockDirectory, files);
  }

  /**
 * Server listener.
 * @param {object} req
 * @param {object} res
 */
  async requestListener(req, res) {
    let mocker = null;
    try {
      mocker = require(path.resolve(this.mockDirectory, '.runtime.js'));
    } catch(err) {
      log('.runtime.js error: ', err);
      return this.serverError(res);
    }

    if (this.checkHttpRequestMockInnerMsg(mocker, req, res)) return;
    if (this.checkServerIndex(req, res)) return;

    const request = await this.parseRequest(req).catch(err => err);
    if (request instanceof Error) {
      return this.serverError(res, `server error: ${request.message}`);
    }

    const mockItem = mocker.matchMockItem(request.url, request.method);
    if (!mockItem) {
      return this.doProxy(req, res, request.url);
    }

    if (mockItem.times-- <= 0) {
      return this.doProxy(req, res, request.url);
    }

    if (mockItem.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockItem.delay));
    }

    const remoteInfo = mockItem.getRemoteInfo(request.url);
    if (!remoteInfo) {
      return this.doMockResponse(req, res, request, mockItem);
    }

    if (remoteInfo.method) {
      req.method = remoteInfo.method;
    }
    return this.doProxy(req, res, remoteInfo.url, async (proxyRes, responseBody) => {
      const responseJson = tryToParseJson(responseBody);

      return this.doRemoteMockResponse(res, request, mockItem, {
        status: proxyRes.statusCode,
        headers: proxyRes.headers,
        response: responseJson || responseBody,
        responseText: responseBody,
        responseJson,
      });
    });
  }

  async doMockResponse(req, res, request, mockItem) {
    const mockData = mockItem.response || mockItem.body;
    const mockResponse = typeof mockData === 'function' ? mockData : () => mockData;

    let result = '';
    try {
      result = await mockResponse.bind(mockItem)(request, mockItem);
    } catch(err) {
      return this.serverError(res, `Server Error: ${err.message}`);
    }

    if (result instanceof mockItem.bypass().constructor) {
      log('bypass mock for: ', request.url);
      return this.doProxy(req, res, request.url);
    }
    res.writeHead(mockItem.status, { ...defaultHeaders, ...mockItem.headers });
    if (result && typeof result === 'object' && !res.headersSent) {
      res.setHeader('content-type', 'application/json');
    }
    return res.end(typeof result === 'string' ? result : JSON.stringify(result), 'utf8');
  }

  async doRemoteMockResponse(res, request, mockItem, remoteResponse) {
    const mockData = mockItem.response || mockItem.body;
    const mockResponse = typeof mockData === 'function' ? mockData : () => mockData;

    let result = '';
    try {
      result = await mockResponse.bind(mockItem)(remoteResponse, request, mockItem);
    } catch(err) {
      this.serverError(res, `Server Error: ${err.message}`);
      return '';
    }

    if (result instanceof mockItem.bypass().constructor) {
      throw new Error('[http-request-mock] A request which is marked by @remote tag cannot be bypassed.');
    }
    res.writeHead(mockItem.status, { ...defaultHeaders, ...mockItem.headers });
    if (result && typeof result === 'object' && !res.headersSent) {
      res.setHeader('content-type', 'application/json');
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
    if (!req.url.startsWith('/__hrm_msg__/')) {
      return false;
    }

    const msg = req.url.replace('/__hrm_msg__/', '');
    if (['reset', 'enable', 'disable', 'enableLog', 'disableLog'].includes(msg)) {
      mocker[msg]();
      log(`triggered mocker.${msg}().`);
    }

    res.writeHead(200, defaultHeaders);
    res.end('ok', 'utf8');
    return true;
  }

  /**
   * Display all mock list for server index.
   * @param {object} mocker
   * @param {object} req
   * @param {object} res
   */
  checkServerIndex(req, res) {
    if (req.url !== '/') {
      return false;
    }
    const address = `http://${listeningAddress.join(':')}`;
    const from = `${address}/https/jsonplaceholder.typicode.com/todos/1`;
    const to = 'https://jsonplaceholder.typicode.com/todos/1';

    const str = ['<html><body style="font-size: 12px;">'];
    str.push('<div><h3>Proxy Brief Introduction</h3></div>');
    str.push('<div><p>This proxy works like below:</p></div>');
    str.push(`<div><p>${from} -> ${to}</div></p>`);
    str.push('</body></html>');

    res.writeHead(200, { ...defaultHeaders });
    res.end(str.join('\n'), 'utf8');
    return true;
  }

  /**
   * Parse received raw request information and return the proxied information.
   * @param {object} request
   */
  async parseRequest(request) {
    const { headers, method, url } = request;
    let urlObject;
    let query;
    try {
      // http/localhost:9091/https/api.com/ -> https://api.com/
      urlObject = new URL(url.replace(/^\/(https?)\//i, '$1://'));
      query = parseQuery(urlObject.search);
    } catch(err) {
      return err;
    }

    if (/^get$/i.test(method)) {
      return { url: urlObject.href, method, query, headers };
    }
    const body = await getRequestBody(request);
    return { url: urlObject.href, method, query, headers, body };
  }



  /**
   * Proxy the received request to the specified url.
   * The specified url is with protocol such as: http://jsonplaceholder.typicode.com/todos/1
   * @param {object} req
   * @param {object} res
   * @param {string} url
   * @returns
   */
  async doProxy(req, res, url, handler) {
    if (typeof handler !== 'function' && !res.headersSent) {
      Object.entries(defaultHeaders).forEach(([key, val]) => {
        res.setHeader(key, val);
      });
    }
    return doProxy({proxyInstance: proxy, req, res, url, handler}).catch(err => {
      this.serverError(res, 'proxy error: ' + err.message);
    });
  }

  /**
   * Send an internal server error.
   * @param {object} res
   * @param {string} body
   */
  serverError(res, body = 'Internal Server Error.') {
    res.writeHead(500, defaultHeaders);
    res.end(body, 'utf8');
  }
}

module.exports = new Server();
