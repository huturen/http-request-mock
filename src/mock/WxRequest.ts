import InterceptorWxRequest from '../inteceptor/WxRequest';
import Base from './Base';

const container = <any> { instance: null };
export default class WxRequestResponseMock extends Base {
  interceptor: InterceptorWxRequest;

  constructor() {
    super();
    if (container.instance) return container.instance;
    container.instance = this;


    this.interceptor = new InterceptorWxRequest();
    return this;
  }

  static setup() {
    return new WxRequestResponseMock();
  }

  // backward compatibility
  static init() {
    return new WxRequestResponseMock();
  }

  static setupForUnitTest() {
    wx.request = <any> function() {};
    return new WxRequestResponseMock();
  }

};
