/* eslint-disable @typescript-eslint/ban-types */
import Bypass from '../common/bypass';
import { sleep, tryToParseJson } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { FetchRequest, FetchResponse, HttpVerb, RemoteResponse, RequestInfo } from '../types';
import { AnyObject } from './../types';
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
    this.global.fetch = function(input: string | FetchRequest, init: AnyObject) {
      let url: string;
      let params: FetchRequest | AnyObject;
      // https://developer.mozilla.org/en-US/docs/Web/API/Request
      // Note: the first argument of fetch maybe a Request object.
      if (typeof input === 'object') {
        url = input.url;
        params = input;
      } else {
        url = input;
        params = init || {};
      }
      const method = (params && params.method ? params.method : 'GET') as unknown as HttpVerb;
      const requestUrl = me.getFullRequestUrl(url, method);
      console.log('url:', url, requestUrl);

      return new Promise((resolve, reject) => {
        const mockItem:MockItem | null  = me.matchMockRequest(requestUrl, method);
        if (!mockItem) {
          me.fetch(requestUrl, params).then(resolve).catch(reject);
          return;
        }

        const requestInfo = me.getRequestInfo({ ...params, url: requestUrl, method: method as HttpVerb });
        const remoteInfo = mockItem?.getRemoteInfo(requestUrl);
        if (remoteInfo) {
          params.method = remoteInfo.method || method;
          me.fetch(remoteInfo.url, params).then((fetchResponse: FetchResponse) => {
            me.sendRemoteResult(fetchResponse, mockItem, requestInfo, resolve);
          }).catch(reject);
          return;
        }

        me.doMockRequest(mockItem, requestInfo, resolve).then(isBypassed => {
          if (isBypassed) {
            me.fetch(requestUrl, params).then(resolve).catch(reject);
          }
        });
      });
    };
    return this;
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
    const body = await mockItem.sendBody(requestInfo, remoteResponse);
    const now = Date.now();
    if (body instanceof Bypass) {
      if (remoteResponse) {
        throw new Error('[http-request-mock] A request which is marked by @remote tag cannot be bypassed.');
      }
      return true;
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
      ? new Headers({ ...mockItem.header, 'x-powered-by': 'http-request-mock' })
      : Object.entries({ ...mockItem.header, 'x-powered-by': 'http-request-mock' });

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
      json: () => Promise.resolve(data),
      arrayBuffer: () => Promise.resolve(data),
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
}
