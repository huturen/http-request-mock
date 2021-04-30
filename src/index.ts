import WxRequestResponseMock from './mocker/wx-request';
import XMLHttpRequestResponseMock from './mocker/xml-http-request';


export default class Index {
  constructor(type: string) {
    return Index.setup(type);
  }

  /**
   * Setup request mock.
   * @param {string} type
   */
  static setup(type: string) {
    if (type === 'wx.request' || (wx && wx.request)) {
      return WxRequestResponseMock.setup();
    }

    if (type === 'xhr' || (window && window.XMLHttpRequest)) {
      return XMLHttpRequestResponseMock.setup();
    }
    // TODO: add unit tests for fetch
    // if (type === 'fetch' || (window && window.fetch)) {
    //   return XMLHttpRequestResponseMock.setup();
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
      return WxRequestResponseMock.setupForUnitTest();
    }

    if (type === 'xhr') {
      return XMLHttpRequestResponseMock.setupForUnitTest();
    }

    throw new Error('Invalid mock enviroment.');
  }
}
