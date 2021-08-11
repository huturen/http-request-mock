import { isObject } from '../common/utils';
import Mocker from '../mocker';
import { MockItemInfo, RequestInfo, WxRequestOpts } from '../types';
import Base from './base';

export default class WxRequestInterceptor extends Base {
  private static instance: WxRequestInterceptor;
  private wxRequest: any;

  constructor(mocker: Mocker) {
    super(mocker);

    if (WxRequestInterceptor.instance) {
      return WxRequestInterceptor.instance;
    }

    WxRequestInterceptor.instance = this;
    // Note: this.global has no wx object
    this.wxRequest = wx.request.bind(wx);
    this.intercept();
    return this;
  }

  /**
   * Setup request mocker for unit test.
   * @param {Mocker} mocker
   */
  static setupForUnitTest(mocker: Mocker) {
    const global = Base.getGlobal();
    global.wx = global.wx || {};
    if (!global.wx.request) {
      global.wx.request = function() {};
    }
    return new WxRequestInterceptor(mocker);
  }

  /**
   * https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
   * Intercept wx.request object.
   */
  private intercept() {
    Object.defineProperty(wx, 'request', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: (wxRequestOpts: WxRequestOpts) => {
          if (!wxRequestOpts || !wxRequestOpts.url) {
            return;
          }

          const mockItem: MockItemInfo | null = this.matchMockRequest(wxRequestOpts.url, wxRequestOpts.method);
          const requestInfo: RequestInfo = this.getRequestInfo(wxRequestOpts);
            if (/^get$/i.test(wxRequestOpts.method!) && isObject(wxRequestOpts.data)) {
              requestInfo.query = { ...requestInfo.query, ...wxRequestOpts.data };
            } else {
              requestInfo.body = wxRequestOpts.data;
            }

          if (mockItem) {
            this.doMockRequest(mockItem, requestInfo, wxRequestOpts);
          } else {
            this.wxRequest(wxRequestOpts); // fallback to original wx.request
          }
        }
    });
    return this;
  }

  /**
   * Make mock request.
   * @param {MockItemInfo} mockItem
   * @param {RequestInfo} requestInfo
   * @param {WxRequestOpts} wxRequestOpts
   */
  private doMockRequest(mockItem: MockItemInfo, requestInfo: RequestInfo, wxRequestOpts: WxRequestOpts) {
    const mockResponse = this.getMockResponse(mockItem, requestInfo);
    this.doMockResponse(mockResponse, mockItem, wxRequestOpts);
  }

  /**
   * Make mock response.
   * @param {any} response
   * @param {MockItemInfo} mockItem
   * @param {WxRequestOpts} wxRequestOpts
   */
  private doMockResponse(response: any, mockItem: MockItemInfo, wxRequestOpts: WxRequestOpts) {
    if (mockItem.delay && mockItem.delay > 0) {
      setTimeout(() => {
        this.doCompleteCallbacks(wxRequestOpts, response)
      }, +mockItem.delay);
    } else {
      this.doCompleteCallbacks(wxRequestOpts, response)
    }
  }

  /**
   * Format mock data to fit wx.request callbacks.
   * @param {MockItemInfo} mockItem
   * @param {RequestInfo} requestInfo
   */
  getMockResponse(mockItem: MockItemInfo, requestInfo: RequestInfo) {
    const data = typeof mockItem.response === 'function' ? mockItem.response(requestInfo) : mockItem.response;

    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    return {
      data,
      statusCode: mockItem.status || 200,
      header: {
        ...mockItem.header,
        'x-powered-by': 'http-request-mock'
      },
      profile: {},
    };
  }

  /**
   * Call some necessary callbacks if specified.
   * @param {WxRequestOpts} wxRequestOpts
   * @param {WxRequestOpts} response
   */
  private doCompleteCallbacks(wxRequestOpts: WxRequestOpts, response: any) {
    if (typeof wxRequestOpts.success === 'function') {
      wxRequestOpts.success(response);
    }

    if (typeof wxRequestOpts.complete === 'function') {
      wxRequestOpts.complete(response);
    }
  }
}

