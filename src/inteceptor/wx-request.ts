import Mocker from '../mocker';
import { MockItemInfo, WxRequestInfo } from '../types';
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
    this.wxRequest = this.global.wx.request.bind(wx);
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
        value: (requestInfo: WxRequestInfo) => {
          if (!requestInfo || !requestInfo.url) {
            return;
          }

          const match: MockItemInfo | null = this.matchMockRequest(requestInfo.url, requestInfo.method);
          if (match) {
            requestInfo.query = this.getQuery(requestInfo.url);
            this.doMockRequest(match, requestInfo);
          } else {
            this.wxRequest(requestInfo); // fallback to original wx.request
          }
        }
    });
    return this;
  }

  /**
   * Make mock request.
   * @param {MockItemInfo} match
   * @param {WxRequestInfo} requestInfo
   */
  private doMockRequest(match: MockItemInfo, requestInfo: WxRequestInfo) {
    if (match.file) {
      // To avoid "Critical dependency: the request of a dependency is an expression" error
      import(`${process.env.HRM_MOCK_DIR}/${match.file}`).then((mock) => {
        const mockResponse = this.getMockResponse(mock.default, match, requestInfo);
        this.doMockResponse(mockResponse, match, requestInfo);
      });
      return;
    }

    const mockResponse = this.getMockResponse(match.response, match, requestInfo);
    this.doMockResponse(mockResponse, match, requestInfo);
  }

  /**
   * Make mock response.
   * @param {any} response
   * @param {MockItemInfo} match
   * @param {WxRequestInfo} requestInfo
   */
  private doMockResponse(response: any, match: MockItemInfo, requestInfo: WxRequestInfo) {
    if (match.delay && match.delay > 0) {
      setTimeout(() => {
        this.doCompleteCallbacks(requestInfo, response)
      }, +match.delay);
    } else {
      this.doCompleteCallbacks(requestInfo, response)
    }
  }

  /**
   * Format mock data to fit wx.request callbacks.
   * @param {any} mockResponseConfig
   * @param {MockItemInfo} match
   * @param {WxRequestInfo} requestInfo
   */
  getMockResponse(mockResponseConfig: any, match: MockItemInfo, requestInfo: WxRequestInfo) {
    const data = typeof mockResponseConfig === 'function' ? mockResponseConfig(requestInfo) : mockResponseConfig;

    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    return {
      data,
      statusCode: match.status || 200,
      header: {
        ...match.header,
        'is-mock': 'yes'
      },
      cookies: [],
      profile: {},
    };
  }

  /**
   * Call some necessary callbacks if specified.
   * @param {WxRequestInfo} requestInfo
   * @param {any} response
   */
  private doCompleteCallbacks(requestInfo: WxRequestInfo, response: any) {
    if (typeof requestInfo.success === 'function') {
      requestInfo.success(response);
    }

    if (typeof requestInfo.complete === 'function') {
      requestInfo.complete(response);
    }
  }
}

