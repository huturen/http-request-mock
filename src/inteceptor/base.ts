import { Method, MockMetaInfo } from '../types';
export default class BaseInteceptor {
  protected mockData: any;

  /**
   * Set global mock data configuration.
   * @param {object} data
   */
  setMockData(data: object) {
    this.mockData = data;
    return this;
  }

  /**
   * Add an mock item to global mock data configuration.
   * @param {string} key
   * @param {any} val
   */
  addMockData(key: string, val: any) {
    this.mockData[key] = val;
    return this;
  }

  /**
   * Check whether the specified request url matchs a defined mock item.
   * If a match were found, return mock meta information, otherwise a null is returned.
   * @param {string} reqUrl
   * @param {string} reqMethod
   */
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
