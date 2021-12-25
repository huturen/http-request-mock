import { getQuery, tryToParseObject } from '../common/utils';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { Method, MixedRequestInfo, RequestInfo } from '../types';
import InterceptorFetch from './fetch';
import InterceptorNode from './node/http-and-https';
import InterceptorWxRequest from './wx-request';
import InterceptorXhr from './xml-http-request';
export default class BaseInterceptor {
  protected mocker: Mocker;
  protected proxyServer: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected global: Record<string, any>;

  constructor(mocker: Mocker, proxyServer = '') {
    this.mocker = mocker;

    if (/^localhost:\d+$/.test(proxyServer)) {
      this.proxyServer = proxyServer;
    } else if (proxyServer) {
      console.warn('Invalid proxyServer:', proxyServer);
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
   * Check whether the specified request url matchs a defined mock item.
   * If a match is found, return mock meta information, otherwise a null is returned.
   * @param {string} reqUrl
   * @param {string} reqMethod
   */
  protected matchMockRequest(reqUrl: string, reqMethod: Method | undefined): MockItem | null {
    // ignore matching when it is a server mode
    if (this.proxyServer && reqUrl.indexOf(`http://${this.proxyServer}`) === 0) {
      return null;
    }
    const mockItem: MockItem | null =  this.mocker.matchMockItem(reqUrl, reqMethod);
    if (mockItem && mockItem.times !== undefined) {
      mockItem.times -= 1;
    }
    return mockItem;
  }

  public getRequestInfo(mixedRequestInfo: MixedRequestInfo) : RequestInfo {
    const info: RequestInfo = {
      url: mixedRequestInfo.url,
      method: mixedRequestInfo.method || 'GET',
      query: getQuery(mixedRequestInfo.url),
    };
    if (mixedRequestInfo.headers || mixedRequestInfo.header) {
      info.headers = mixedRequestInfo.headers || mixedRequestInfo.header;
    }
    if (mixedRequestInfo.body !== undefined) {
      info.body = tryToParseObject(mixedRequestInfo.body);
    }
    return info;
  }

  /**
 * Get full request url.
 * @param {string} url
 */
  getFullRequestUrl(url: string) {
    if (/^https?:\/\//i.test(url)) {
      return this.checkProxyUrl(url);
    }
    if (typeof URL === 'function' && typeof window === 'object' && window) {
      return this.checkProxyUrl(new URL(url, window.location.href).href);
    }

    if (typeof document === 'object' && document && typeof document.createElement === 'function') {
      const elemA = document.createElement('a');
      elemA.href = url;
      return this.checkProxyUrl(elemA.href);
    }
    return this.checkProxyUrl(url);
  }

  /**
   * Return a proxy url if in a proxy mode otherwise return the original url.
   * @param {string} url
   */
  public checkProxyUrl(url: string) {
    if (this.proxyServer) {
      return `http://${this.proxyServer}` + url.replace(/^(https?):\/\//, '/$1/');
    }
    return url;
  }
}

