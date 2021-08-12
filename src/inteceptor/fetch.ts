import { HTTPStatusCodes } from '../config';
import Mocker from '../mocker';
import { MockItemInfo, RequestInfo } from '../types';
import Base from './base';

export default class FetchInterceptor extends Base{
  private static instance: FetchInterceptor;
  private fetch: any;

  constructor(mocker: Mocker) {
    super(mocker);

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
      global.fetch = function() {};
    }
    return new FetchInterceptor(mocker);
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * Intercept fetch object.
   */
  private intercept() {
    const me = this;
    this.global.fetch = function() {
      const args = [ ...(arguments as any) ];

      let url: any;
      let params: any;
      // https://developer.mozilla.org/en-US/docs/Web/API/Request
      // Note: the first argument of fetch maybe a Request object.
      if (typeof args[0] === 'object') {
        url = args[0].url || '';
        params = args[0];
      } else {
        url = args[0];
        params = args[1];
      }

      const method = params && params.method ? params.method : 'GET';

      return new Promise((resolve, reject) => {
        const mockItem:MockItemInfo | null  = me.matchMockRequest(url, method);
        if (mockItem) {
          const requestInfo = me.getRequestInfo({ url, method, ...params });
          me.doMockRequest(mockItem, requestInfo, resolve);
        } else {
          me.fetch(...args).then(resolve).catch(reject);
        }
      });
    };
    return this;
  }

  /**
   * Make mock request.
   * @param {MockItemInfo} mockItem
   * @param {RequestInfo} requestInfo
   * @param {Function} resolve
   */
  private doMockRequest(mockItem: MockItemInfo, requestInfo: RequestInfo, resolve: Function) {
    if (mockItem.delay && mockItem.delay > 0) {
      setTimeout(() => {
        this.doMockResponse(mockItem, requestInfo, resolve);
      }, +mockItem.delay);
    } else {
      this.doMockResponse(mockItem, requestInfo, resolve);
    }
  }

  /**
   * Make mock request.
   * @param {MockItemInfo} mockItem
   * @param {RequestInfo} requestInfo
   * @param {Function} resolve
   */
  private async doMockResponse(mockItem: MockItemInfo, requestInfo: RequestInfo, resolve: Function) {
    const body = typeof mockItem.response === 'function'
      ? await mockItem.response(requestInfo)
      : mockItem.response;

      resolve(this.getFetchResponse(body, mockItem, requestInfo));
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Response
   * Format mock data.
   * @param {any} responseBody
   * @param {MockItemInfo} mockItem
   * @param {RequestInfo} requestInfo
   */
  getFetchResponse(responseBody: any, mockItem: MockItemInfo, requestInfo: RequestInfo) {
    const data = responseBody;
    const status = mockItem.status || 200;
    const statusText = HTTPStatusCodes[status] || '';

    const headers = typeof Headers === 'function'
      ? new Headers({ ...mockItem.header, 'x-powered-by': 'http-request-mock' })
      : { ...mockItem.header, 'x-powered-by': 'http-request-mock' };

    const body = typeof Blob === 'function'
      ? new Blob([typeof data === 'string' ? data : JSON.stringify(data)])
      : data;

    if (typeof Response === 'function') {
      const response = new Response(body,{ status, statusText, headers });
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

