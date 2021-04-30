import { MockMetaInfo } from '../types';
export default class FetchInterceptor {
  private fetch: any;
  private mockData: any;

  constructor() {
    this.fetch = window.fetch;
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

  // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
  private intercept() {
    const me = this;
    window.fetch = function() {
      // console.log(arguments);
      const args = arguments;
      const url = args[0];
      const params = args[1];
      const method = params && params.method ? params.method : 'GET';

      return new Promise((resolve, reject) => {
        const match:any = me.matchRequest(url, method);
        if (match) {
          const mockData:any = me.fakeFetchResponse(url, match);

          if (match.delay && match.delay > 0) {
            setTimeout(() => {
              resolve(mockData);
            }, +match.delay);
          } else {
            resolve(mockData);
          }
          return;
        }
        me.fetch.apply(window, args).then((response: any) => {
          resolve(response);
        })
        .catch((error: any) => {
          reject(error);
        })
      });
    };
  }

  private matchRequest(reqUrl: any, reqMethod: any): MockMetaInfo | boolean {
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

  // https://developer.mozilla.org/en-US/docs/Web/API/Response
  private fakeFetchResponse(url:string, match: MockMetaInfo) {
    const response = {
      body: match.data,
      bodyUsed: false,
      headers: {
        isMock: 'yes'
      },
      ok: true,
      redirected: false,
      status: 200,
      statusText: 'OK',
      url,
      type: 'basic', // cors
      // response data depends on prepared data
      json: async () => match.data,
      arrayBuffer: async () => match.data,
      blob: async () => match.data,
      formData: async () => match.data,
      text: async () => match.data,
      // other methods that may be used
      clone: async () => response,
      error: async () => response,
      redirect: async () => response,
    };
    return response;
  }
}

