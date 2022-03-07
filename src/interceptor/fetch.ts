/* eslint-disable @typescript-eslint/ban-types */
import Bypass from '../common/bypass';
import { sleep } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { FetchRequest, Method, RequestInfo } from '../types';
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
   * Setup request mocker for unit test.
   * @param {Mocker} mocker
   */
  static setupForUnitTest(mocker: Mocker) {
    const global = Base.getGlobal();
    if (!global.fetch) {
      // use require here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      global.fetch = require('../dummy/fetch').default;
    }
    return new FetchInterceptor(mocker);
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * Intercept fetch object.
   */
  private intercept() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;
    this.global.fetch = function(input: string | FetchRequest, init: Record<string, string>) {

      let url: string;
      let params: Record<string, string | Record<string, string> | unknown>;
      // https://developer.mozilla.org/en-US/docs/Web/API/Request
      // Note: the first argument of fetch maybe a Request object.
      if (typeof input === 'object') {
        url = input.url;
        params = input;
      } else {
        url = input;
        params = init || {};
      }
      const method = (params && params.method ? params.method : 'GET') as unknown as Method;
      const requestUrl = me.getFullRequestUrl(url, method);

      return new Promise((resolve, reject) => {
        const mockItem:MockItem | null  = me.matchMockRequest(requestUrl, method);
        if (mockItem) {
          const requestInfo = me.getRequestInfo({ url: requestUrl, method, ...params });
          me.doMockRequest(mockItem, requestInfo, resolve).then(isBypassed => {
            if (isBypassed) {
              me.fetch(requestUrl, params).then(resolve).catch(reject);
            }
          });
        } else {
          me.fetch(requestUrl, params).then(resolve).catch(reject);
        }
      });
    };
    return this;
  }

  /**
   * Make mock request.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {Function} resolve
   */
  private async doMockRequest(mockItem: MockItem, requestInfo: RequestInfo, resolve: Function) {
    let isBypassed = false;
    if (mockItem.delay && mockItem.delay > 0) {
      await sleep(+mockItem.delay);
      isBypassed = await this.doMockResponse(mockItem, requestInfo, resolve);
    } else {
      isBypassed = await this.doMockResponse(mockItem, requestInfo, resolve);
    }
    return isBypassed;
  }

  /**
   * Make mock request.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {Function} resolve
   */
  private async doMockResponse(mockItem: MockItem, requestInfo: RequestInfo, resolve: Function) {
    const body = await mockItem.sendBody(requestInfo);

    const now = Date.now();
    if (body instanceof Bypass) {
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
      : { ...mockItem.header, 'x-powered-by': 'http-request-mock' };

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
