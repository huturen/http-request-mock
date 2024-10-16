/* eslint-disable @typescript-eslint/ban-types */
import Bypass from '../common/bypass';
import { sleep, tryToParseJson } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { FetchRequest, FetchResponse, HttpVerb, OriginalResponse, RemoteResponse, RequestInfo } from '../types';
import type { AnyObject } from './../types';
import Base from './base';

export default class FetchInterceptor extends Base{
  private static instance: FetchInterceptor;
  private fetch;

  constructor(mocker: Mocker, proxyServer = '') {
    super(mocker, proxyServer);

    if (FetchInterceptor.instance) {
      return FetchInterceptor.instance;
    }

    FetchInterceptor.instance = this;
    this.fetch = this.global.fetch.bind(this.global);
    this.intercept();

    return this;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * Intercept fetch object.
   */
  private intercept() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;
    this.global.fetch = function (
      input: string | FetchRequest | URL,
      init: AnyObject
    ) {
      let url: string;
      let params: FetchRequest | AnyObject;
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
      // Note: the first argument of fetch maybe a Request or URL object.
      if (input instanceof URL) {
        url = input.toString();
        params = init || {};
      } else if (typeof input === 'object') {
        url = input.url;
        params = input;
      } else {
        url = input;
        params = init || {};
      }
      const method = (params && params.method ? params.method : 'GET') as unknown as HttpVerb;
      const requestUrl = me.getFullRequestUrl(url, method);

      return new Promise((resolve, reject) => {
        const mockItem: MockItem | null = me.matchMockRequest(requestUrl, method);

        if (!mockItem) {
          me.fetch(input, init).then(resolve).catch(reject);
          return;
        }

        me.setTimeoutForSingal(params as FetchRequest, reject);

        const requestInfo = me.getRequestInfo({
          ...params,
          url: requestUrl,
          method: method as HttpVerb,
        });
        requestInfo.doOriginalCall = async (): Promise<OriginalResponse> => {
          const res = await me.getOriginalResponse(requestUrl, params);
          requestInfo.doOriginalCall = undefined;
          return res;
        };

        const remoteInfo = mockItem?.getRemoteInfo(requestUrl);
        if (remoteInfo) {
          params.method = remoteInfo.method || method;
          me.setRemoteRequestHeaders(mockItem, params as AnyObject);
          me.fetch(remoteInfo.url, params)
            .then((fetchResponse: FetchResponse) => {
              me.sendRemoteResult(
                fetchResponse,
                mockItem,
                requestInfo,
                resolve
              );
            })
            .catch(reject);
          return;
        }

        me.doMockRequest(mockItem, requestInfo, resolve).then((isBypassed) => {
          if (isBypassed) {
            me.fetch(requestUrl, params).then(resolve).catch(reject);
          }
        });
      });
    };
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setTimeoutForSingal(params: FetchRequest, reject: (reason?: any) => void) {
    if (!params.signal) {
      return;
    }
    const defaultTimeoutMsg = 'request timed out';
    // If the signal is already aborted, immediately throw in order to reject the promise.
    if (params.signal.aborted) {
      reject(params.signal.reason || new Error(defaultTimeoutMsg));
    }

    // Perform the main purpose of the API
    // Call resolve(result) when done.

    // Watch for 'abort' signals
    params.signal?.addEventListener('abort', () => {
      // Stop the main operation, reject the promise with the abort reason.
      reject(params.signal?.reason || new Error(defaultTimeoutMsg));
    });
  }

  /**
   * Set request headers for requests marked by remote config.
   * @param {AnyObject} fetchParams
   */
  private setRemoteRequestHeaders(mockItem: MockItem , fetchParams: AnyObject) {
    if (Object.keys(mockItem.remoteRequestHeaders).length <= 0) return;

    // https://developer.mozilla.org/en-US/docs/Web/API/Headers
    if (typeof (fetchParams.headers as {set: Function}).set === 'function') {
      Object.entries(mockItem.remoteRequestHeaders).forEach(([key, val]) => {
        (fetchParams.headers as {set: Function})?.set(key, val);
      });
    } else {
      fetchParams.headers = {
        ...((fetchParams.headers as object) || {}),
        ...mockItem.remoteRequestHeaders
      };
    }
  }

  /**
   * Set remote result.
   * @param {FetchResponse} fetchResponse
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {Function} resolve
   */
  private sendRemoteResult(
    fetchResponse: FetchResponse,
    mockItem: MockItem,
    requestInfo: RequestInfo,
    resolve: Function
  ) {
    const headers: Record<string, string> = {};
    if (typeof Headers === 'function' && fetchResponse.headers instanceof Headers) {
      fetchResponse.headers.forEach((val: string, key: string) => {
        headers[key.toLocaleLowerCase()] = val;
      });
    }
    fetchResponse.text().then((text) => {
      const json = tryToParseJson(text);
      const remoteResponse: RemoteResponse = {
        status: fetchResponse.status,
        headers,
        response: json || text,
        responseText: text,
        responseJson: json,
      };
      this.doMockRequest(mockItem, requestInfo, resolve, remoteResponse);
    });
  }

  /**
   * Get original response
   * @param {string} requestUrl
   * @param {FetchRequest | AnyObject} params
   */
  private async getOriginalResponse(requestUrl: string, params: FetchRequest | AnyObject): Promise<OriginalResponse> {
    let status = null;
    const headers: Record<string, string> = {};
    let responseText = null;
    let responseJson = null;
    let responseBuffer = null;
    let responseBlob = null;
    try {
      const res = await this.fetch(requestUrl, params);
      status = res.status;
      if (typeof Headers === 'function' && res.headers instanceof Headers) {
        res.headers.forEach((val: string, key: string) => (headers[key.toLocaleLowerCase()] = val));
      }
      const isBlobAvailable = typeof Blob === 'function'
        && typeof Blob.prototype.text === 'function'
        && typeof Blob.prototype.arrayBuffer === 'function'
        && typeof Blob.prototype.slice === 'function'
        && typeof Blob.prototype.stream === 'function';

      responseBlob = isBlobAvailable ? await res.blob() : null;
      responseText = isBlobAvailable ? await responseBlob.text() : await res.text();
      responseBuffer = isBlobAvailable ? await responseBlob.arrayBuffer() : null;
      responseJson = responseText === null ? null : tryToParseJson(responseText);
      return { status, headers, responseText, responseJson, responseBuffer, responseBlob, error: null };
    } catch(err) {
      return { status, headers, responseText, responseJson, responseBuffer, responseBlob, error: err as Error };
    }
  }

  /**
   * Make mock request.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {Function} resolve
   */
  private async doMockRequest(
    mockItem: MockItem,
    requestInfo: RequestInfo,
    resolve: Function,
    remoteResponse: RemoteResponse | null = null
  ) {
    let isBypassed = false;
    if (mockItem.delay && mockItem.delay > 0) {
      await sleep(+mockItem.delay);
      isBypassed = await this.doMockResponse(mockItem, requestInfo, resolve, remoteResponse);
    } else {
      isBypassed = await this.doMockResponse(mockItem, requestInfo, resolve, remoteResponse);
    }
    return isBypassed;
  }

  /**
   * Make mock request.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {Function} resolve
   */
  private async doMockResponse(
    mockItem: MockItem,
    requestInfo: RequestInfo,
    resolve: Function,
    remoteResponse: RemoteResponse | null = null
  ) {
    const now = Date.now();
    let body;
    try {
      body = await mockItem.sendBody(requestInfo, remoteResponse);
      if (body instanceof Bypass) {
        if (remoteResponse) {
          throw new Error('A request which is marked by @remote tag cannot be bypassed.');
        }
        return true;
      }
    } catch(err) {
      console.warn('[http-request-mock] mock response error, ' + (err as Error).message);
      body = '';
    }

    const spent = (Date.now() - now) + (mockItem.delay || 0);

    this.mocker.sendResponseLog(spent, body, requestInfo, mockItem);
    resolve(this.getFetchResponse(body, mockItem, requestInfo));
    return false;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Response
   * Format mock data.
   * @param {unknown} responseBody
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   */
  getFetchResponse(responseBody: unknown, mockItem: MockItem, requestInfo: RequestInfo) {
    const data = responseBody;
    const status = mockItem.status;
    const statusText = HTTPStatusCodes[status] || '';

    const headers = typeof Headers === 'function'
      ? new Headers({ ...mockItem.headers, 'x-powered-by': 'http-request-mock' })
      : Object.entries({ ...mockItem.headers, 'x-powered-by': 'http-request-mock' });

    const body = typeof Blob === 'function'
      ? new Blob([typeof data === 'string' ? data : JSON.stringify(data)])
      : data;

    if (typeof Response === 'function') {
      const response = new Response(body as BodyInit,{ status, statusText, headers });
      Object.defineProperty(response, 'url', { value: requestInfo.url });
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
      url: requestInfo.url,
      type: 'basic', // cors
      // response data depends on prepared data
      json: () => {
        if (typeof data === 'object') {
          return Promise.resolve(data);
        }
        if (typeof data === 'string') {
          try {
            return Promise.resolve(JSON.parse(data));
          } catch(err) { // eslint-disable-line
            return Promise.resolve(null);
          }
        }
        return Promise.resolve(null);
      },
      arrayBuffer: () => {
        if (typeof ArrayBuffer === 'function' && (data instanceof ArrayBuffer)) {
          return Promise.resolve(data);
        }
        if (typeof data === 'string' && typeof TextEncoder === 'function') {
          const encoder = new TextEncoder();
          return Promise.resolve(encoder.encode(data).buffer);
        }
        return Promise.resolve(null);
      },
      blob: () => {
        if (typeof Blob === 'function' && (data instanceof Blob)) {
          return Promise.resolve(data);
        }
        if (typeof data === 'string' && typeof Blob === 'function') {
          return Promise.resolve(new Blob([data], { type: 'text/plain' }));
        }
        return Promise.resolve(null);
      },
      bytes: () => {
        if (typeof Uint8Array === 'function' && (data instanceof Uint8Array)) {
          return Promise.resolve(data);
        }
        if (typeof data === 'string' && typeof TextEncoder === 'function') {
          const encoder = new TextEncoder();
          return Promise.resolve(encoder.encode(data));
        }
        return Promise.resolve(null);
      },
      formData: () => {
        if (typeof FormData === 'function') {
          return Promise.resolve((data instanceof FormData) ? data : null);
        }
        return Promise.resolve(null);
      },
      text: () => {
        return Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data));
      },
      // other methods that may be used
      clone: () => response,
      error: () => response,
      redirect: () => response,
    };
    return response;
  }
}
