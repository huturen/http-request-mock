import { Method, MockMetaInfo } from '../types';
export default class BaseInteceptor {
  protected mockData: any;

  setMockData(data: object) {
    this.mockData = data;
    return this;
  }

  addMockData(key: string, val: any) {
    this.mockData[key] = val;
    return this;
  }

  protected matchRequest(reqUrl: string, reqMethod: Method | undefined): MockMetaInfo | null {
    const requestMethod = reqMethod || 'get';

    for(let key in this.mockData) {
      try {
        const info = this.mockData[key];
        if (info.disable === 'yes') {
          continue;
        }

        const method = `${info.method}`.toLowerCase();
        if (method !== 'any' && method !== `${requestMethod}`.toLowerCase()) {
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
    return null;
  }

}
