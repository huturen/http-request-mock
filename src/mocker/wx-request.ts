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

  /**
   * Setup request mocker.
   */
  static setup() {
    return new WxRequestMocker();
  }


  /**
   * Setup request mocker for unit test.
   */
  static setupForUnitTest() {
    wx.request = <any> function() {};
    return new WxRequestMocker();
  }

};
