import http, { IncomingMessage } from 'http';
import https from 'https';
import { URL } from 'url';
import * as zlib from 'zlib';
import { AnyObject } from './../types';
import { tryToParseJson } from './utils';

/**
 * In nodejs environment, by default for XMLHttpRequest, fetch and wx.request, http-request-mock
 * does a fallback request by simply using http/https native request module, which encodes the
 * response body with utf8. It may not meet your requirement in some complex applications.
 * So, you can use another third fake (XMLHttpRequest, fetch, wx.request)request library
 * instead before calling setupForUnitTest method if you had some problems with the fallback request.
 *
 * @param {string} url
 * @param {string} method
 * @param {object} headers
 * @param {any} body
 * @param {object} opts
 */
export default function request(requestConfig: {
  url: string | URL,
  method: string,
  headers?: Record<string, string>,
  body?: unknown,
  opts?: Record<string, string>
}): Promise<{body: string, json: AnyObject, response: IncomingMessage}> {
  const {url, method, headers = {}, body, opts = {} } = requestConfig;

  return new Promise((resolve, reject) => {
    const isHttps = isHttpsUrl(url);
    const reqOpts = {
      useNativeModule: true,
      method: (method || 'GET').toUpperCase(),
      headers: headers || {},
      ...opts
    };
    const { request: requestMethod } = isHttps ? https : http;
    const req = requestMethod(url, reqOpts, (response: IncomingMessage) => {
      getResponseBody(response).then(({ body, json }) => {
        resolve({ body, json, response });
      }).catch(err => {
        req.emit('error', err);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
    if (body) {
      if (typeof body === 'string'
        || (body instanceof Buffer)
        || (body instanceof ArrayBuffer)
        || (body instanceof SharedArrayBuffer)
        || (body instanceof Uint8Array)
      ) {
        req.write(Buffer.from(body as string));
      } else {
        req.write(Buffer.from(JSON.stringify(body)));
      }
    }
    req.end();
  });
}

function isHttpsUrl(url: string | URL) {
  if (typeof url === 'string') {
    return /^https:/i.test(url);
  }
  if (url && (url.href || url.protocol)) {
    return /^https:/i.test(url.href) || String(url.protocol).toLowerCase() === 'https:';
  }
  return false;
}

function getResponseBody(response: IncomingMessage): Promise<{ body: string, json: AnyObject }> {
  const stream = response.headers['content-encoding'] === 'gzip'
    ? response.pipe(zlib.createGunzip())
    : response;

  return new Promise((resolve, reject) => {
    stream.once('error', (error) => {
      stream.removeAllListeners();
      reject(error);
    });

    let body = '';
    stream.on('data', chunk => (body += chunk));

    stream.once('end', () => {
      resolve({ body, json: tryToParseJson(body, null) });
      stream.removeAllListeners();
    });
  });
}
