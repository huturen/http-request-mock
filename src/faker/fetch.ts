import { isArrayBuffer, str2arrayBuffer } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import fallback from './fallback';

export default function fakeFetch() {
  const args = [ ...(arguments as any) ];

  let url: any;
  let params: any;
  // https://developer.mozilla.org/en-US/docs/Web/API/Request
  // Note: the first argument of fetch maybe a Request object.
  if (typeof args[0] === 'object') {
    url = args[0].url;
    params = args[0];
  } else {
    url = args[0];
    params = args[1] || {};
  }

  return fallback(url, params.method, params.headers, params.body)
    .then((res: any) => {
      return getResponse(url, res.body, res.response);
    });
}

function getResponse(url: string, responseBody: any, res: any) {
  const data = responseBody;
  const status = res.statusCode || 200;
  const statusText = HTTPStatusCodes[status] || '';

  const headers = typeof Headers === 'function'
    ? new Headers({ ...res.headers, 'x-powered-by': 'http-request-mock' })
    : { ...res.headers, 'x-powered-by': 'http-request-mock' };

  const body = typeof Blob === 'function'
    ? new Blob([typeof data === 'string' ? data : JSON.stringify(data)])
    : data;

  if (typeof Response === 'function') {
    const response = new Response(body,{ status, statusText, headers });
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
        return Promise.resolve(data)
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
