import Mocker from '../mocker';
import { Method, MockItemInfo } from '../types';
import InterceptorFetch from './fetch';
import InterceptorWxRequest from './wx-request';
import InterceptorXhr from './xml-http-request';
export default class BaseInteceptor {
  protected mocker: Mocker;
  protected inited: boolean = false;

  constructor(mocker: Mocker) {
    this.mocker = mocker;
  }

  /**
   * Setup request mocker.
   */
  public static setup(mocker: Mocker) {
    return <InterceptorFetch | InterceptorWxRequest | InterceptorXhr> new this(mocker);
  }

  /**
   * return global variable
   */
  public static global() : any {
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
}
