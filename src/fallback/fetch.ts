import { IncomingMessage } from 'http';
import { isArrayBuffer, str2arrayBuffer } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import { FetchRequest } from '../types';
import fallback from './fallback';



export default function fakeFetch(input: string | FetchRequest, init: Record<string, unknown>) {
  let url: string | FetchRequest;
  let params: Record<string, unknown>;
  // https://developer.mozilla.org/en-US/docs/Web/API/Request
  // Note: the first argument of fetch maybe a Request object.
  if (typeof input === 'object') {
    url = input.url;
    params = input;
  } else {
    url = input;
    params = init || {};
  }

  return fallback(url, params.method as string, params.headers as Record<string, string>, params.body)
    .then((res: {body: string, response: IncomingMessage}) => {
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

  const body = typeof Blob === 'function'
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
    json: () => Promise.resolve(data),
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
