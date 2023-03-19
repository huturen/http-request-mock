import { getQuery, tryToParseObject } from '../common/utils';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { HttpVerb, RequestInfo } from '../types';
import InterceptorFetch from './fetch';
import InterceptorNode from './node/http-and-https';
import InterceptorWxRequest from './wx-request';
import InterceptorXhr from './xml-http-request';
export default class BaseInterceptor {
  protected mocker: Mocker;
  protected proxyServer = '';
  protected proxyMode = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected global: Record<string, any>;

  constructor(mocker: Mocker, proxyServer = '') {
    this.mocker = mocker;

    if (/^(matched@localhost:\d+)|(middleware@\/)$/.test(proxyServer)) {
      [this.proxyMode, this.proxyServer] = proxyServer.split('@');
    }

    this.global = BaseInterceptor.getGlobal();
  }

  /**
   * Setup request mocker.
   * @param {Mocker} mocker
   */
  public static setup(mocker: Mocker, proxyServer = '') {
    return <InterceptorFetch | InterceptorWxRequest | InterceptorXhr | InterceptorNode> new this(mocker, proxyServer);
  }

  /**
   * return global variable
   */
  public static getGlobal() {
    if (typeof window !== 'undefined') {
      return window;
    } else if (typeof global !== 'undefined')  {
      return global;
    }
    throw new Error('Detect global variable error');
  }

  /**
   * Check whether the specified request url matches a defined mock item.
   * If a match is found, return mock meta information, otherwise a null is returned.
   * @param {string} reqUrl
   * @param {string} reqMethod
   */
  protected matchMockRequest(reqUrl: string, reqMethod: HttpVerb | undefined): MockItem | null {
    // ignore matching when it is a proxy mode
    if (this.proxyMode === 'matched' && reqUrl.indexOf(`http://${this.proxyServer}`) === 0) {
      return null;
    }
    const mockItem: MockItem | null =  this.mocker.matchMockItem(reqUrl, reqMethod);
    if (mockItem && mockItem.times !== undefined) {
      mockItem.times -= 1;
    }

    // "mockItem" should be returned if current request is under proxy mode of middleware and is marked by @deProxy
    if (this.proxyMode === 'middleware' && reqUrl.indexOf(this.getMiddlewareHost()) === 0) {
      return mockItem && mockItem.deProxy ? mockItem : null;
    }

    return mockItem;
  }

  public getRequestInfo(requestInfo: RequestInfo) : RequestInfo {
    const info: RequestInfo = {
      url: requestInfo.url,
      method: requestInfo.method || 'GET',
      query: getQuery(requestInfo.url),
    };
    if (requestInfo.headers || requestInfo.header) {
      info.headers = requestInfo.headers || requestInfo.header;
    }
    if (requestInfo.body !== undefined) {
      info.body = tryToParseObject(requestInfo.body);
    }
    return info;
  }

  /**
   * Get full request url.
   * @param {string} url
   */
  getFullRequestUrl(url: string, method: HttpVerb) {
    if (/^https?:\/\//i.test(url)) {
      return this.checkProxyUrl(url, method);
    }
    if (typeof URL === 'function' && typeof window === 'object' && window) {
      return this.checkProxyUrl(new URL(url, window.location.href).href, method);
    }

    if (typeof document === 'object' && document && typeof document.createElement === 'function') {
      const elemA = document.createElement('a');
      elemA.href = url;
      return this.checkProxyUrl(elemA.href, method);
    }
    return this.checkProxyUrl(url, method);
  }

  /**
   * Return a proxy url if in a proxy mode otherwise return the original url.
   * @param {string} url
   */
  public checkProxyUrl(url: string, method: HttpVerb) {
    if (!['matched', 'middleware'].includes(this.proxyMode) || !this.proxyServer) {
      return url;
    }

    const mockItem = this.mocker.matchMockItem(url, method);
    if (!mockItem) {
      return url;
    }

    const proxyUrl = this.proxyMode === 'middleware'
      ? `${this.getMiddlewareHost()}${url.replace(/^(https?):\/\//, '/$1/')}`
      : `http://${this.proxyServer}${url.replace(/^(https?):\/\//, '/$1/')}`;

    return mockItem.deProxy ? url : proxyUrl;
  }

  public getMiddlewareHost() {
    const { protocol, host } = window.location;
    return `${protocol}//${host}`;
  }
}

