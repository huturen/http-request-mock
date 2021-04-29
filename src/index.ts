import WxRequestResponseMock from './mock/WxRequest';
import XMLHttpRequestResponseMock from './mock/XMLHttpRequest';


export default class Index {

  static setup(type = null) {
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
