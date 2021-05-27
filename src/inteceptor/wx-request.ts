import { MockMetaInfo, WxRequestInfo } from '../types';
import Base from './base';

export default class WxRequestInterceptor extends Base {
  private wxRequest: any;

  constructor() {
    super();

    this.wxRequest = wx.request.bind(wx);
    this.mockData = {};
    this.intercept();
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

          const match: MockMetaInfo | null = this.matchRequest(requestInfo.url, requestInfo.method);
          if (match) {
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
   * @param {MockMetaInfo} match
   * @param {WxRequestInfo} requestInfo
   */
  private doMockRequest(match: MockMetaInfo, requestInfo: WxRequestInfo) {
    if (match.file) {
      // To avoid "Critical dependency: the request of a dependency is an expression" error
      import(`${process.env.HRM_MOCK_DIR}/${match.file}`).then((mock) => {
        const mockData = this.formatMockData(mock.default, match, requestInfo);
        this.doMockResponse(mockData, match, requestInfo);
      });
      return;
    }

    const mockData = this.formatMockData(match.data, match, requestInfo);
    this.doMockResponse(mockData, match, requestInfo);
  }

  /**
   * Make mock response.
   * @param {any} mockData
   * @param {MockMetaInfo} match
   * @param {WxRequestInfo} requestInfo
   */
  private doMockResponse(mockData: any, match: MockMetaInfo, requestInfo: WxRequestInfo) {
    if (match.delay && match.delay > 0) {
      setTimeout(() => {
        this.doCompleteCallbacks(requestInfo, mockData)
      }, +match.delay);
    } else {
      this.doCompleteCallbacks(requestInfo, mockData)
    }
  }

  /**
   * Format mock data to fit wx.request callbacks.
   * @param {any} mockData
   * @param {MockMetaInfo} match
   * @param {WxRequestInfo} requestInfo
   */
  formatMockData(mockData: any, match: MockMetaInfo, requestInfo: WxRequestInfo) {
    const data = typeof mockData === 'function' ? mockData(requestInfo) : mockData;

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
   * @param {any} mockData
   */
  private doCompleteCallbacks(requestInfo: WxRequestInfo, mockData: any) {
    if (typeof requestInfo.success === 'function') {
      requestInfo.success(mockData);
    }

    if (typeof requestInfo.complete === 'function') {
      requestInfo.complete(mockData);
    }
  }
}

