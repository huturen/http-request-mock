import { Header, Method, MockConfigData, MockItemInfo } from './types';

export default class Mocker {
  private static instance: Mocker;
  private mockConfigData: MockConfigData;

  constructor() {
    if (Mocker.instance) {
      return Mocker.instance;
    }
    Mocker.instance = this;
    this.mockConfigData = {};
  }

  /**
   * Set global mock data configuration.
   * @param {object} mockConfigData
   */
  public setMockData(mockConfigData: MockConfigData) {
    this.mockConfigData = mockConfigData;
    return this;
  }

  /**
   * Add an mock item to global mock data configuration.
   * @param {string} key
   * @param {any} val
   */
  private addMockItem(key: string, val: MockItemInfo) {
    this.mockConfigData[key] = val;
    return this;
  }

  /**
   * Reset global mock data configuration.
   * @param {string} key
   * @param {any} val
   */
  public reset() {
    this.setMockData({});
    return this;
  }

  /**
   * Check specified mock item & add it to global mock data configuration.
   * @param {MockItemInfo} mockItem
   * @returns false | MockItemInfo
   */
  public mock(mockItem: MockItemInfo) {
    if (!mockItem.url || (typeof mockItem.url !== 'string' && !(mockItem.url instanceof RegExp))) {
      return false;
    }

    mockItem.method = /^(get|post|put|patch|delete|any)$/i.test(mockItem.method || '')
      ? <Method> mockItem.method
      : <Method> 'any';

    mockItem.delay = isNaN(mockItem.delay as any) ? 0 : Math.max(0, +<number>mockItem.delay);
    mockItem.status = /^[1-5][0-9][0-9]$/.test(<any>mockItem.status) ? +<number>mockItem.status : 200;
    mockItem.header = typeof mockItem.header === 'object' ? mockItem.header : {};

    const key = `${mockItem.url}-${mockItem.method}`;
    this.addMockItem(key, mockItem);
    return mockItem;
  }

  /**
   * Make a mock item that matches an HTTP GET request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  public get(url: RegExp | String, response: any, delay: number = 0, status: number = 200, header: Header = {}) {
    this.mock(<MockItemInfo>{ url, method: 'get', response, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP POST request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  public post(url: RegExp | String, response: any, delay: number = 0, status: number = 200, header: Header = {}) {
    this.mock(<MockItemInfo>{ url, method: 'post', response, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP PUT request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  public put(url: RegExp | String, response: any, delay: number = 0, status: number = 200, header: Header = {}) {
    this.mock(<MockItemInfo>{ url, method: 'put', response, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP PATCH request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  public patch(url: RegExp | String, response: any, delay: number = 0, status: number = 200, header: Header = {}) {
    this.mock(<MockItemInfo>{ url, method: 'patch', response, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP DELETE request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  public delete(url: RegExp | String, response: any, delay: number = 0, status: number = 200, header: Header = {}) {
    this.mock(<MockItemInfo>{ url, method: 'delete', response, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP GET, POST, PUT, PATCH or DELETE request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  public any(url: RegExp | String, response: any, delay: number = 0, status: number = 200, header: Header = {}) {
    this.mock(<MockItemInfo>{ url, method: 'any', response, delay, status, header });
    return this;
  }

  /**
   * Check whether the specified request url matchs a defined mock item.
   * If a match were found, return mock meta information, otherwise a null is returned.
   * @param {string} reqUrl
   * @param {string} reqMethod
   */
  public matchMockItem(reqUrl: string, reqMethod: Method | undefined): MockItemInfo | null {
    const requestMethod = reqMethod || 'get';

    for(let key in this.mockConfigData) {
      try {
        const info = this.mockConfigData[key];
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

        if (reqUrl.indexOf(info.url as string) !== -1) {
          return info;
        }
      } catch(e) {}
    }
    return null;
  }
}
