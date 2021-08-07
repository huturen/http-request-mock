import Mocker from '../mocker';
import { Method, MockItemInfo, Query } from '../types';
import InterceptorFetch from './fetch';
import InterceptorNode from './node/http-and-https';
import InterceptorWxRequest from './wx-request';
import InterceptorXhr from './xml-http-request';
export default class BaseInteceptor {
  protected mocker: Mocker;
  protected global: any;

  constructor(mocker: Mocker) {
    this.mocker = mocker;
    this.global = BaseInteceptor.getGlobal();
  }

  /**
   * Setup request mocker.
   * @param {Mocker} mocker
   */
  public static setup(mocker: Mocker) {
    return <InterceptorFetch | InterceptorWxRequest | InterceptorXhr | InterceptorNode> new this(mocker);
  }

  /**
   * return global variable
   */
  public static getGlobal() : any {
    if (typeof window !== 'undefined') {
      return window;
    } else if (typeof global !== 'undefined')  {
      return global;
    } else if (typeof self !== 'undefined') {
      return self;
    }
    throw new Error('Detect global variable error');
  }

  /**
   * Check whether the specified request url matchs a defined mock item.
   * If a match were found, return mock meta information, otherwise a null is returned.
   * @param {string} reqUrl
   * @param {string} reqMethod
   */
  protected matchMockRequest(reqUrl: string, reqMethod: Method | undefined): MockItemInfo | null {
    return this.mocker.matchMockItem(reqUrl, reqMethod);
  }

  /**
   * Get query parameters from the specified request url.
   * @param {string} reqUrl
   */
  protected getQuery(reqUrl: string) : Query{
    return /\?/.test(reqUrl)
      ? reqUrl
        .replace(/.*?\?/g, '') // no protocol, domain and path
        .replace(/#.*$/g, '') // no hash tag
        .split('&')
        .reduce((res : Query, item: string) => {
          const [k,v] = item.split('=');
          res[k] = (v || '').trim();
          return res;
        }, {})
      : {};
  }

  /**
   * Check whether or not this specified obj is an object.
   * @param {any} obj
   */
  protected isObject(obj: any) {
    return Object.prototype.toString.call(obj) === '[object Object]';
  };
}

