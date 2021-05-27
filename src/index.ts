import WxRequestResponseMocker from './mocker/wx-request';
import XMLHttpRequestResponseMocker from './mocker/xml-http-request';


export default class Index {
  constructor(type: string) {
    return Index.setup(type);
  }

  /**
   * Setup request mock.
   * @param {string} type
   */
  static setup(type: string) {
    if (type === 'wx.request' || (typeof wx !== 'undefined' && wx.request)) {
      return WxRequestResponseMocker.setup();
    }

    if (type === 'xhr' || (typeof window !== 'undefined' && window.XMLHttpRequest)) {
      return XMLHttpRequestResponseMocker.setup();
    }
    // TODO: add unit tests for fetch
    // if (type === 'fetch' || (window && window.fetch)) {
    //   return XMLHttpRequestResponseMocker.setup();
    // }

    throw new Error('Invalid mock enviroment.');
  }

  /**
   * The same as setup method, for backward compatibility.
   * @param {string} type
   */
  static init(type: string) {
    return this.setup(type);
  }

  /**
   * Setup request mock for unit test.
   * @param {string} type
   */
  static setupForUnitTest(type = 'xhr') {
    if (type === 'wx.request') {
      return WxRequestResponseMocker.setupForUnitTest();
    }

    if (type === 'xhr') {
      return XMLHttpRequestResponseMocker.setupForUnitTest();
    }

    throw new Error('Invalid mock enviroment.');
  }
}
