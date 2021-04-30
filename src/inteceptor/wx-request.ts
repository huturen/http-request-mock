import { HTTPStatusCodes } from '../config';
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

  // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
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

  private doMockRequest(match: MockMetaInfo, requestInfo: WxRequestInfo) {
    if (match.file) {
      // To avoid "Critical dependency: the request of a dependency is an expression" error
      import(`${process.env.HRM_MOCK_DIR}${match.file}`).then((mock) => {
        const mockData = this.formatMockData(mock.default, match, requestInfo);
        this.doMockResponse(mockData, match, requestInfo);
      });
      return;
    }

    const mockData = this.formatMockData(match.data, match, requestInfo);
    this.doMockResponse(mockData, match, requestInfo);
  }

  private doMockResponse(mockData: any, match: MockMetaInfo, requestInfo: WxRequestInfo) {
    if (match.delay && match.delay > 0) {
      setTimeout(() => {
        this.doCompleteCallbacks(requestInfo, mockData)
      }, +match.delay);
    } else {
      this.doCompleteCallbacks(requestInfo, mockData)
    }
  }

  formatMockData(mockData: any, match: MockMetaInfo, requestInfo: WxRequestInfo) {
    const data = typeof mockData === 'function' ? mockData(requestInfo) : mockData;
    const status = match.status || 200;

    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    return {
      data: data || HTTPStatusCodes[status] || '',
      statusCode: status,
      header: {
        ...match.header,
        'is-mock': 'yes'
      },
      cookies: [],
      profile: {},
    };
  }

  private doCompleteCallbacks(requestInfo: WxRequestInfo, mockData: any) {
    if (typeof requestInfo.success === 'function') {
      requestInfo.success(mockData);
    }

    if (typeof requestInfo.complete === 'function') {
      requestInfo.complete(mockData);
    }
  }
}

