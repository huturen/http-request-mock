/* eslint-env node */
const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');
const { log } = require('../lib/misc.js');

const proxy = httpProxy.createProxyServer({});

const defaultHeaders = {
  'x-powered-by': 'http-request-mock',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': '*',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': '*',
  'access-control-allow-credentials': 'true',
};
let mockDirectory = null;
const listeningAddress = [];

class Server {
  constructor() {
    this.mockDirectory = null;
    this.listeningAddress = [];
    this.host = 'localhost';
    this.type = 'cjs';
    this.minPort = 9001;
    this.maxPort = 9101;
    this.setLocalStorage();

    process.on('unhandledRejection', (reason, p) => {
      console.error(reason, 'Unhandled Rejection at Promise', p);
    }).on('uncaughtException', err => {
      console.error(err, 'Uncaught Exception thrown');
      process.exit(1);
    });
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

    mockDirectory = mockDir;
    let port = 9001;
    while(port <= this.maxPort) {
      const server = http.createServer(this.requestListener.bind(this));
      const res = await new Promise((resolve) => {
        server.once('error', (err) => {
          log(`${err.message}, retring ${++port}.`);
          resolve(false);
        });
        server.listen(port, () => {
          resolve(true);
        });
      });
      if (res) break;
    }
    if (port <= this.maxPort) {
      if (proxyMode === 'marked') {
        log('Proxy mode is enabled, all requests that are marked by @proxy will be proxied to the server below.');
      } else if (proxyMode === 'matched') {
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
    if (!this.mockDirectory) return;
    files.forEach(file => {
      try {
        delete require.cache[require.resolve(path.resolve(file))];
        log('reload mock file:', path.basename(file));
      } catch(e) {
        log(`reload mock file ${path.basename(file)} error: `, e.message);
      }
    });
    try {
      const runtime = require.resolve(path.resolve(mockDirectory, '.runtime.js'));
      require(runtime).reset();
      delete require.cache[runtime];
      require(runtime);
    } catch(e) {
      log('reload .runtime.js error: ', e.message);
    }
  }

  /**
 * Server listener.
 * @param {object} req
 * @param {object} res
 */
  async requestListener(req, res) {
    let mocker = null;
    try {
      mocker = require(path.resolve(mockDirectory, '.runtime.js'));
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
    const remoteInfo = mockItem.getRemoteInfo(request.url);
    if (remoteInfo) {
      req.method = remoteInfo.method || request.method;
      return this.doProxy(req, res, remoteInfo.url);
    }

    const mockData = mockItem.response || mockItem.body;
    const response = typeof mockData === 'function' ? mockData : () => mockData;

    mockItem.times--;
    if (mockItem.times <= 0) {
      res.setHeader('http-request-mock-times-out', 1);
      return this.doProxy(req, res, request.url);
    }

    if (mockItem.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockItem.delay));
    }

    let result = '';
    try {
      result = await response.bind(mockItem)(request, mockItem);
    } catch(err) {
      return this.serverError(res, `Server Error: ${err.message}`);
    }

    if (result instanceof mockItem.bypass().constructor) {
      log('bypass mock for: ', request.url);
      return this.doProxy(req, res, request.url);
    }
    res.writeHead(mockItem.status, { ...mockItem.header, ...defaultHeaders });
    return res.end(typeof result === 'string' ? result : JSON.stringify(result), 'utf8');
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

    res.writeHead(200, {
      ...defaultHeaders,
      'content-type': 'text/html;charset=utf-8',
    });
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
      query = this.parseQuery(urlObject.search);
    } catch(err) {
      return err;
    }

    if (/^get$/i.test(method)) {
      return { url: urlObject.href, method, query, headers };
    }
    let body = [];
    return new Promise((resolve, reject) => {
      request
        .on('error', err => reject(err))
        .on('data', chunk => body.push(chunk))
        .on('end', () => {
          body = Buffer.concat(body).toString();
          if (body) {
            try {
              body = JSON.parse(body);
            } catch (err) {
              body = /^[.-\w+]=.*/.test(body) ? this.parseQuery(body) : body;
            }
          }
          resolve({ url: urlObject.href, method, query, headers, body });
        });
    });
  }

  /**
   * Parse search query.
   * @param {object|string} search
   */
  parseQuery(search) {
    return [...new URLSearchParams(search).entries()].reduce((res, [k, v]) => {
      res[k] = v;
      return res;
    }, {});
  }

  /**
   * Proxy the received request to the specified url.
   * The specified url is with protocol such as: http://jsonplaceholder.typicode.com/todos/1
   * @param {object} req
   * @param {object} res
   * @param {string} url
   * @returns
   */
  doProxy(req, res, url) {
    const { protocol, host, pathname, search } = new URL(url);
    req.url = `${pathname}${search}`;
    return proxy.web(req, res, {
      changeOrigin: true,
      target: `${protocol}//${host}`,
      headers: { ...defaultHeaders },
      cookieDomainRewrite: '',
      followRedirects: true,
    }, function(err) {
      log(`proxy error[${url}]: `, err.message);
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

  /**
   * Set a global localStorage object for the compatibility of cache plugin.
   */
  setLocalStorage() {
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
}

module.exports = new Server();
