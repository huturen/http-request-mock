/* eslint-disable @typescript-eslint/no-empty-function */
import Bypass from '../common/bypass';
import { getFullRequestUrl, isObject, sleep } from '../common/utils';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { RequestInfo, WxRequestOpts, WxRequestTask } from '../types';
import Base from './base';

export default class WxRequestInterceptor extends Base {
  private static instance: WxRequestInterceptor;
  private wxRequest;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const global: any = Base.getGlobal();
    global.wx = global.wx || {};
    if (!global.wx.request) {
      // use requre here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      global.wx.request = require('../fallback/wx-request').default.bind(global.wx);
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
        wxRequestOpts.url = getFullRequestUrl(wxRequestOpts.url);

        const mockItem: MockItem | null = this.matchMockRequest(wxRequestOpts.url, wxRequestOpts.method);
        const requestInfo: RequestInfo = this.getRequestInfo(wxRequestOpts);
        if (/^get$/i.test(wxRequestOpts.method) && isObject(wxRequestOpts.data)) {
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
          return this.getRequstTask();
        } else {
          return this.wxRequest(wxRequestOpts); // fallback to original wx.request
        }
      }
    });
    return this;
  }

  private getRequstTask() : WxRequestTask{
    return <WxRequestTask>{
      abort() {},
      onHeadersReceived() {},
      offHeadersReceived() {}
    };
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
    const now = Date.now();
    const body = await mockItem.sendBody(requestInfo);
    if (body instanceof Bypass) {
      return true;
    }
    const spent = (Date.now() - now) + (mockItem.delay || 0);

    const wxResponse = this.getWxResponse(body, mockItem);

    this.mocker.sendResponseLog(spent, body, requestInfo, mockItem);
    this.sendResult(wxRequestOpts, wxResponse);
    return false;
  }

  /**
   * Get WX mock response data.
   * @param {unknown} responseBody
   * @param {MockItem} mockItem
   */
  getWxResponse(responseBody: unknown, mockItem: MockItem) {
    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    const setCookieHeader = [].concat((mockItem.header?.['set-cookie'] || []) as never[]);
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
  private sendResult(wxRequestOpts: WxRequestOpts, wxResponse: unknown) {
    if (typeof wxRequestOpts.success === 'function') {
      wxRequestOpts.success(wxResponse);
    }

    if (typeof wxRequestOpts.complete === 'function') {
      wxRequestOpts.complete(wxResponse);
    }
  }
}

