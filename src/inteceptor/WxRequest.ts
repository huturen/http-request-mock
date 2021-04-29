import { WxRequestInfo } from '../types';

export default class WxRequestInterceptor {
  private wxRequest: any;
  private mockData: any;

  constructor() {
    this.wxRequest = wx.request.bind(wx);
    this.mockData = {};
    this.intercept();
  }

  setMockData(data: object) {
    this.mockData = data;
    return this;
  }

  addMockData(key: string, val: any) {
    this.mockData[key] = val;
    return this;
  }

  // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
  private intercept() {
    const me = this;
    Object.defineProperty(wx, 'request', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: (info: any) => {
            if (!info || !info.url) {
              return;
            }

            const method = info.method || 'GET'; // method is optional
            const match = me.matchRequest(info.url, method);
            if (match) {
              const mockData = {
                data: match.data,
                header: {
                  isMock: 'yes'
                },
                statusCode: 200
              };

              if (match.delay && match.delay > 0) {
                setTimeout(() => {
                  me.doCompleteCallbacks(info, mockData)
                }, +match.delay);
              } else {
                me.doCompleteCallbacks(info, mockData)
              }
              return;
            }

            // fallback to original wx.request
            return me.wxRequest(info);

        }
    });
    return this;
  }

  private matchRequest(reqUrl: any, reqMethod: any) {
    for(let key in this.mockData) {
      try {
        const info = this.mockData[key];
        if (info.disable === 'yes') {
          continue;
        }
        const method = `${info.method}`.toLowerCase();
        if (method !== 'any' && method !== `${reqMethod}`.toLowerCase()) {
          continue;
        }

        if (Array.isArray(info.regexp) && info.regexp.length === 2
          && new RegExp(info.regexp[0], info.regexp[1]).test(reqUrl)
        ) {
          return info;
        }
        if ((info.url instanceof RegExp) && info.url.test(reqUrl)) {
          return info;
        }
        if (reqUrl.indexOf(info.url) !== -1) {
          return info;
        }
      } catch(e) {}
    }
    return false;
  }

  private doCompleteCallbacks(wxRequestInfo: WxRequestInfo, mockData: any) {
    if (typeof wxRequestInfo.success === 'function') {
      wxRequestInfo.success(mockData);
    }

    if (typeof wxRequestInfo.complete === 'function') {
      wxRequestInfo.complete(mockData);
    }
  }
}

