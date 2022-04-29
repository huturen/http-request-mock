/* eslint-disable @typescript-eslint/no-empty-function */
import Bypass from '../common/bypass';
import { isObject, sleep, tryToParseJson } from '../common/utils';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { Method, RemoteResponse, RequestInfo, WxRequestOpts, WxRequestTask, WxResponse } from '../types';
import Base from './base';

export default class WxRequestInterceptor extends Base {
  private static instance: WxRequestInterceptor;
  private wxRequest;

  constructor(mocker: Mocker, proxyServer = '') {
    super(mocker, proxyServer);

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
        wxRequestOpts.url = this.getFullRequestUrl(wxRequestOpts.url, wxRequestOpts.method);

        const mockItem: MockItem | null = this.matchMockRequest(wxRequestOpts.url, wxRequestOpts.method);
        const remoteInfo = mockItem?.getRemoteInfo(wxRequestOpts.url);
        const requestInfo: RequestInfo = this.getRequestInfo(wxRequestOpts);

        if (mockItem && remoteInfo) {
          wxRequestOpts.url = remoteInfo.url;
          wxRequestOpts.method = <Method>remoteInfo.method || wxRequestOpts.method;
          return this.sendRemoteResult(wxRequestOpts, mockItem, requestInfo);
        }

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
          wxRequestOpts.url = wxRequestOpts.url;
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
   * Set remote result.
   * @param {WxRequestOpts} wxRequestOpts
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   */
  private sendRemoteResult(wxRequestOpts: WxRequestOpts, mockItem: MockItem, requestInfo: RequestInfo) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;
    // fallback to original wx.request
    this.wxRequest({
      ...wxRequestOpts,
      success(wxResponse: WxResponse) {
        const remoteResponse: RemoteResponse = {
          status: wxResponse.statusCode,
          headers: wxResponse.header,
          response: wxResponse.data,
          responseText: typeof wxResponse.data === 'string' ? wxResponse.data : JSON.stringify(wxResponse.data),
          responseJson: typeof wxResponse.data === 'string' ? tryToParseJson(wxResponse.data) : wxResponse.data
        };

        me.doMockRequest(mockItem, requestInfo, wxRequestOpts, remoteResponse);
      }
    });
    return this.getRequstTask();
  }

  /**
   * Make mock request.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {WxRequestOpts} wxRequestOpts
   */
  private async doMockRequest(
    mockItem: MockItem,
    requestInfo: RequestInfo,
    wxRequestOpts: WxRequestOpts,
    remoteResponse: RemoteResponse | null = null
  ) {
    let isBypassed = false;
    if (mockItem.delay && mockItem.delay > 0) {
      await sleep(+mockItem.delay);
      isBypassed = await this.doMockResponse(mockItem, requestInfo, wxRequestOpts, remoteResponse);
    } else {
      isBypassed = await this.doMockResponse(mockItem, requestInfo, wxRequestOpts, remoteResponse);
    }
    return isBypassed;
  }

  /**
   * Make mock response.
   * @param {MockItem} mockItem
   * @param {RequestInfo} requestInfo
   * @param {WxRequestOpts} wxRequestOpts
   */
  private async doMockResponse(
    mockItem: MockItem,
    requestInfo: RequestInfo,
    wxRequestOpts: WxRequestOpts,
    remoteResponse: RemoteResponse | null = null
  ) {
    const now = Date.now();
    const body = await mockItem.sendBody(requestInfo, remoteResponse);
    if (body instanceof Bypass) {
      if (remoteResponse) {
        throw new Error('[http-request-mock] A request which is marked by @remote tag cannot be bypassed.');
      }
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
  getWxResponse(responseBody: unknown, mockItem: MockItem): WxResponse {
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

