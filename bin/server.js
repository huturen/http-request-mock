/* eslint-env node */
const fs = require('fs');
const path = require('path');
const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer({});

const defaultHeaders = {
  'x-powered-by': 'http-request-mock',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-credentials': 'true',
  // 'content-type': 'text/plain;charset=utf-8',
};
let mockDirectory = null;
const listeningAddress = [];

module.exports = { init, reload };

/**
 * Start a proxy server. Default port: 9091.
 *
 * @param {string} mockDir
 * @param {string} enviroment
 */
async function init({ mockDir, enviroment }) {
  if (/^\w+=\w+$/.test(enviroment)) {
    const [key, val] = enviroment.split('=');
    process.env[key] = val;
  }

  mockDirectory = mockDir;
  const host = 'localhost';
  const max = 9091 + 50;
  let port = 9091;
  while(port <= max) {
    const server = http.createServer(requestListener);
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
  if (port <= max) {
    log(`proxy server is listening at: \x1b[32mhttp://${host}:${port}\x1b[0m`);
    listeningAddress.push(host, port);
    return `${host}:${port}`;
  }
  throw new Error('start a proxy server error: no enough ports to use.');
}

/**
 * Reload .runtime.js and the specified mock files.
 * @param {string[]} files
 */
function reload(files = []) {
  if (mockDirectory) {
    try {
      const runtime = require.resolve(path.resolve(mockDirectory, '.runtime.js'));
      require(runtime).reset();
      delete require.cache[runtime];
      require(runtime);
    } catch(e) {
      log('reload .runtime.js error: ', e.message);
    }
    files.forEach(file => {
      try {
        delete require.cache[require.resolve(path.resolve(file))];
        log('reload mock file:', path.basename(file));
      } catch(e) {
        log(`reload mock file ${path.basename(file)} error: `, e.message);
      }
    });
  }
}

/**
 * Server listener.
 * @param {object} req
 * @param {object} res
 */
async function requestListener(req, res) {
  let mocker = null;
  try {
    mocker = require(path.resolve(mockDirectory, '.runtime.js'));
  } catch(err) {
    log('.runtime.js error: ', err.message);
    return serverError(res);
  }

  if (checkHttpRequestMockMsg(mocker, req, res)) return;
  if (checkServerIndex(req, res)) return;

  const request = await parseRequest(req).catch(err => err);
  if (request instanceof Error) {
    return serverError(res, `server error: ${request.message}`);
  }

  const mockItem = mocker.matchMockItem(request.url, request.method);
  if (!mockItem) {
    return doProxy(req, res, request.url);
  }

  const mockFile = path.resolve(mockDirectory, mockItem.file);
  let mockData = null;
  try {
    const mockModule = require(mockFile);
    mockData = typeof mockModule === 'function' ? mockModule : () => mockModule;
  } catch(err) {
    return serverError(res, `${mockItem.file} error: `+err.message);
  }

  mockItem.times--;
  if (mockItem.times <= 0) {
    return doProxy(req, res, request.url);
  }

  if (mockItem.delay > 0) {
    await new Promise(resolve => setTimeout(resolve, mockItem.delay));
  }

  let result = '';
  try {
    result = await mockData.bind(mockItem)(request, mockItem);
  } catch(err) {
    return serverError(res, `${mockItem.file} error: `+err.message);
  }

  if (result instanceof mockItem.bypass().constructor) {
    log('bypass mock for: ', request.url);
    return doProxy(req, res, request.url);
  }
  res.writeHead(mockItem.status, { ...mockItem.header, ...defaultHeaders});
  return res.end(typeof result === 'string' ? result : JSON.stringify(result), 'utf8');
}

/**
 * Check http-request-mock inner message from browser.
 * @param {object} mocker
 * @param {object} req
 * @param {object} res
 */
function checkHttpRequestMockMsg(mocker, req, res) {
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
function checkServerIndex(req, res) {
  if (req.url !== '/') {
    return false;
  }
  const address = `http://${listeningAddress.join(':')}`;
  const from = `${address}/https/jsonplaceholder.typicode.com/todos/1`;
  const to = 'https://jsonplaceholder.typicode.com/todos/1';

  const str = ['<html><body style="font-size: 12px;">'];
  str.push('<div><h3>Proxy Brief Introduction</h3></div>');
  str.push('<div><p>Use this proxy like below:</p></div>');
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
async function parseRequest(request) {
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
            body = /^[.-\w+]=.*/.test(body) ? parseQuery(body) : body;
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
function parseQuery(search) {
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
function doProxy(req, res, url) {
  const { protocol, host, pathname, search } = new URL(url);
  req.url = `${pathname}${search}`;
  req.headers.host = host;
  return proxy.web(req, res, { target: `${protocol}//${host}` }, function(err) {
    log(`proxy error[${url}]: `, err.message);
    serverError(res, 'proxy error: ' + err.message);
  });
}

/**
 * Send an internal server error.
 * @param {object} res
 * @param {string} body
 */
function serverError(res, body = 'Internal Server Error.') {
  res.writeHead(500, defaultHeaders);
  res.end(body, 'utf8');
}

process.on('unhandledRejection', (reason, p) => {
  console.error(reason, 'Unhandled Rejection at Promise', p);
}).on('uncaughtException', err => {
  console.error(err, 'Uncaught Exception thrown');
  process.exit(1);
});

function log(...args) {
  console.log('\x1b[32m[http-request-mock:proxy mode]\x1b[0m', ...args);
}
