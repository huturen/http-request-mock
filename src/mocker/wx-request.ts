import InterceptorWxRequest from '../inteceptor/wx-request';
import Base from './base';

const container = <any> { instance: null };
export default class WxRequestMocker extends Base {
  interceptor: InterceptorWxRequest;

  constructor() {
    super();
    if (container.instance) return container.instance;
    container.instance = this;

    this.interceptor = new InterceptorWxRequest();
    return this;
  }

  static setup() {
    return new WxRequestMocker();
  }

  // backward compatibility
  static init() {
    return new WxRequestMocker();
  }

  static setupForUnitTest() {
    wx.request = <any> function() {};
    return new WxRequestMocker();
  }

};
