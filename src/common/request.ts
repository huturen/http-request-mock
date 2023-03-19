import { http, https } from 'follow-redirects';
import { IncomingMessage } from 'http';
import Stream from 'stream';
import { URL } from 'url';
import * as zlib from 'zlib';
import { AnyObject, OriginalResponse } from './../types';
import { str2arrayBuffer, tryToParseJson } from './utils';

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

async function getResponseBody(response: IncomingMessage): Promise<{ body: string, json: AnyObject }> {
  try {
    const data = await parseResponseBody(response);
    if (data.error) {
      throw data.error;
    }

    return { body: data.responseText as string, json: data.responseJson as AnyObject };
  } catch(err) {
    throw new Error(`getResponseBody error: ${(err as Error).message}`);
  }
}

export function parseResponseBody(response: IncomingMessage): Promise<OriginalResponse> {
  let stream: Stream;
  if (['gzip', 'compress', 'deflate'].includes(response.headers['content-encoding'] || '')) {
    stream = response.pipe(zlib.createGunzip());
  } else if ('br' === response.headers['content-encoding']) {
    stream = response.pipe(zlib.createBrotliDecompress());
  } else {
    stream = response;
  }

  return new Promise((resolve) => {
    stream.once('error', (error) => {
      stream.removeAllListeners();
      resolve({
        status: null,
        headers: {},
        responseText: null,
        responseJson: null,
        responseBuffer: null,
        responseBlob: null,
        error,
      });
    });

    const buf: Buffer[] = [];
    stream.on('data', chunk => buf.push(chunk));

    stream.once('end', () => {
      const type = (response.headers['content-type'] || '').replace(/^application\//, '').replace(/;.*/, '');
      const responseText = Buffer.concat(buf).toString();
      const responseJson = tryToParseJson(responseText, null);
      const responseBuffer = str2arrayBuffer(responseText);
      const responseBlob = typeof Blob === 'function' ? new Blob([responseText], { type }) : null;
      resolve({
        status: response.statusCode || null,
        headers: response.headers,
        responseText,
        responseJson,
        responseBuffer,
        responseBlob,
        error: null,
      } as OriginalResponse);
      stream.removeAllListeners();
    });
  });
}
