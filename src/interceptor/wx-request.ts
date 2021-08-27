import Bypass from '../common/bypass';
import { isObject, sleep } from '../common/utils';
import fakeWxRequest from '../faker/wx-request';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { RequestInfo, WxRequestOpts } from '../types';
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
      global.wx.request = fakeWxRequest.bind(global.wx);
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

        const mockItem: MockItem | null = this.matchMockRequest(wxRequestOpts.url, wxRequestOpts.method);
        const requestInfo: RequestInfo = this.getRequestInfo(wxRequestOpts);
          if (/^get$/i.test(wxRequestOpts.method!) && isObject(wxRequestOpts.data)) {
            requestInfo.query = { ...requestInfo.query, ...wxRequestOpts.data };
          } else {
            requestInfo.body = wxRequestOpts.data;
          }

        if (mockItem) {
          this.doMockRequest(mockItem, requestInfo, wxRequestOpts).then(isBypassed => {
            if (isBypassed) {
              this.wxRequest(wxRequestOpts); // fallback to original wx.request
            }
          });
          return { abort() {} };
        } else {
          return this.wxRequest(wxRequestOpts); // fallback to original wx.request
        }
      }
    });
    return this;
  }

  /**
   * Make mock request.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {WxRequestOpts} wxRequestOpts
   */
  private async doMockRequest(mockItem: MockItem, requestInfo: RequestInfo, wxRequestOpts: WxRequestOpts) {
    let isBypassed = false;
    if (mockItem.delay && mockItem.delay > 0) {
      await sleep(+mockItem.delay);
      isBypassed = await this.doMockResponse(mockItem, requestInfo, wxRequestOpts);
    } else {
      isBypassed = await this.doMockResponse(mockItem, requestInfo, wxRequestOpts);
    }
    return isBypassed;
  }

  /**
   * Make mock response.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {WxRequestOpts} wxRequestOpts
   */
  private async doMockResponse(mockItem: MockItem, requestInfo: RequestInfo, wxRequestOpts: WxRequestOpts) {
    const body = await mockItem.sendBody(requestInfo);
    if (body instanceof Bypass) {
      return true;
    }

    const wxResponse = this.getWxResponse(body, mockItem);
    this.sendResult(wxRequestOpts, wxResponse);
    return false;
  }

  /**
   * Format mock data to fit wx.request callbacks.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   */
  getWxResponse(responseBody: any, mockItem: MockItem) {
    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    const setCookieHeader = [].concat((mockItem.header?.['set-cookie'] || []) as any);
    return {
      data: responseBody,
      statusCode: mockItem.status || 200,
      header: {
        ...mockItem.header,
        'x-powered-by': 'http-request-mock'
      },
      cookies: setCookieHeader,
      profile: {},
    };
  }

  /**
   * Call some necessary callbacks if specified.
   * @param {WxRequestOpts} wxRequestOpts
   * @param {WxRequestOpts} response
   */
  private sendResult(wxRequestOpts: WxRequestOpts, wxResponse: any) {
    if (typeof wxRequestOpts.success === 'function') {
      wxRequestOpts.success(wxResponse);
    }

    if (typeof wxRequestOpts.complete === 'function') {
      wxRequestOpts.complete(wxResponse);
    }
  }
}

