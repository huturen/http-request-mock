import { IncomingMessage } from 'http';
import simpleRequest from '../common/request';
import { isArrayBuffer, str2arrayBuffer, tryToParseJson } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import { AnyObject, FetchRequest } from '../types';

export default function dummyFetch(input: string | FetchRequest, init: AnyObject) {
  let url: string | FetchRequest;
  let params: FetchRequest | AnyObject;
  // https://developer.mozilla.org/en-US/docs/Web/API/Request
  // Note: the first argument of fetch maybe a Request object.
  if (typeof input === 'object') {
    url = input.url;
    params = input as FetchRequest;
  } else {
    url = input;
    params = init || {};
  }

  return simpleRequest({
    url, method:
    params.method as string,
    headers: params.headers as Record<string, string>,
    body: params.body
  }).then((res: {body: string, response: IncomingMessage}) => {
    return getResponse(url as string, res.body, res.response);
  });
}

function getResponse(url: string, responseBody: string, responseObject: IncomingMessage) {
  const data = responseBody;
  const status = responseObject.statusCode || 200;
  const statusText = HTTPStatusCodes[status] || '';

  const responseObjectHeaders = responseObject.headers as HeadersInit;
  const headers = typeof Headers === 'function'
    ? new Headers({ ...responseObjectHeaders, 'x-powered-by': 'http-request-mock' })
    : { ...responseObjectHeaders, 'x-powered-by': 'http-request-mock' };

  const isBlobAvailable = typeof Blob === 'function'
    && typeof Blob.prototype.text === 'function'
    && typeof Blob.prototype.arrayBuffer === 'function'
    && typeof Blob.prototype.slice === 'function'
    && typeof Blob.prototype.stream === 'function';

  const body = isBlobAvailable
    ? new Blob([typeof data === 'string' ? data : JSON.stringify(data)])
    : data;

  if (typeof Response === 'function') {
    const response = new Response(body, { status, statusText, headers });
    Object.defineProperty(response, 'url', { value: url });
    return response;
  }


  const response = {
    body,
    bodyUsed: false,
    headers,
    ok: true,
    redirected: false,
    status,
    statusText,
    url,
    type: 'basic', // cors
    // response data depends on prepared data
    json: () => Promise.resolve(tryToParseJson(data)),
    arrayBuffer: () => {
      if (isArrayBuffer(data)) {
        return Promise.resolve(data);
      }
      return Promise.resolve(str2arrayBuffer(typeof data === 'string' ? data : JSON.stringify(data)));
    },
    blob: () => Promise.resolve(body),
    formData: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    // other methods that may be used
    clone: () => response,
    error: () => response,
    redirect: () => response,
  };
  return response;
}
