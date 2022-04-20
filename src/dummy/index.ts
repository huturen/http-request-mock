import BaseInterceptor from '../interceptor/base';
import { WxObject } from '../types';
import dummyFetch from './fetch';
import dummyWxRequest from './wx-request';
import dummyXMLHttpRequest from './xhr';
export default class Dummy {
  /**
   * Initialize a dummy 'fetch' object if 'fetch' is not existent in the context.
   */
  static initDummyFetchForUnitTest() {
    const global = BaseInterceptor.getGlobal();
    if (!global.fetch) {
      global.fetch = dummyFetch as unknown as typeof global.fetch;
    }
  }

  /**
   * Initialize a dummy 'wx.request' object if 'wx.request' is not existent in the context.
   */
  static initDummyWxRequestForUnitTest() {
    const global = BaseInterceptor.getGlobal() as unknown as { wx: WxObject };
    global.wx = global.wx || {};
    if (!global.wx.request) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      global.wx.request = dummyWxRequest.bind(global.wx);
    }
  }

  /**
   * Initialize a dummy 'XMLHttpRequest' object if 'XMLHttpRequest' is not existent in the context.
   */
  static initDummyXHRForUnitTest() {
    const global = BaseInterceptor.getGlobal();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    global.XMLHttpRequest = global.XMLHttpRequest || dummyXMLHttpRequest;
  }
}
