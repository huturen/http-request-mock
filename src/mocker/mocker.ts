import { Method, MockConfigData, MockItemExt } from '../types';
import MockItem from './mock-item';

export default class Mocker {
  private static instance: Mocker;
  private mockConfigData: MockConfigData;
  private disabled: boolean = false;

  constructor() {
    if (Mocker.instance) {
      return Mocker.instance;
    }
    Mocker.instance = this;
    this.mockConfigData = {};
  }

  static getInstance() {
    return new Mocker();
  }

  /**
   * Set global mock data configuration.
   * @param {object} mockConfigData
   */
  public setMockData(mockConfigData: MockConfigData) {
    for(let key in mockConfigData) {
      this.mock(mockConfigData[key]);
    }
    return this;
  }

  /**
   * Add an mock item to global mock data configuration.
   * @param {string} key
   * @param {any} val
   */
  private addMockItem(key: string, val: MockItem) {
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
   * Enable mock function temporarily.
   */
  public enable() {
    this.disabled = false;
    return this;
  }

  /**
   * Disable mock function temporarily.
   */
  public disable() {
    this.disabled = true;
    return this;
  }

  /**
   * Check specified mock item & add it to global mock data configuration.
   * @param {MockItem} mockItem
   * @returns false | MockItem
   */
  public mock(mockItemInfo: MockItem) {
    const mockItem = new MockItem(mockItemInfo);
    if (!mockItem.key) return false;

    this.addMockItem(mockItem.key, mockItem);
    return mockItem;
  }

  /**
   * Make a mock item that matches an HTTP GET request.
   * @param {RegExp | String} url
   * @param {any} body
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public get(url: RegExp | String, body: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItem>{ url, method: 'get', body, delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP POST request.
   * @param {RegExp | String} url
   * @param {any} body
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public post(url: RegExp | String, body: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItem>{ url, method: 'post', body, delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP PUT request.
   * @param {RegExp | String} url
   * @param {any} body
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public put(url: RegExp | String, body: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItem>{ url, method: 'put', body, delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP PATCH request.
   * @param {RegExp | String} url
   * @param {any} body
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public patch(url: RegExp | String, body: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItem>{ url, method: 'patch', body, delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP DELETE request.
   * @param {RegExp | String} url
   * @param {any} body
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public delete(url: RegExp | String, body: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItem>{ url, method: 'delete', body, delay, status, header, times });
    return this;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/HEAD
   * Warning: A response to a HEAD method should not have a body.
   * If it has one anyway, that body must be ignored: any representation
   * headers that might describe the erroneous body are instead assumed
   * to describe the response which a similar GET request would have received.
   *
   * Make a mock item that matches an HTTP HEAD request.
   * @param {RegExp | String} url
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public head(url: RegExp | String, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItem>{ url, method: 'head', body: '', delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP GET, POST, PUT, PATCH, DELETE or HEAD request.
   * @param {RegExp | String} url
   * @param {any} body
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public any(url: RegExp | String, body: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItem>{ url, method: 'any', body, delay, status, header, times });
    return this;
  }

  /**
   * Check whether the specified request url matchs a defined mock item.
   * If a match were found, return mock meta information, otherwise a null is returned.
   * @param {string} reqUrl
   * @param {string} reqMethod
   * @return null | MockItem
   */
  public matchMockItem(reqUrl: string, reqMethod: Method | undefined): MockItem | null {
    if (this.disabled) {
      return null;
    }

    const requestMethod = reqMethod || 'get';

    for(let key in this.mockConfigData) {
      try {
        const info = this.mockConfigData[key];
        if (info.disable === 'yes' || (typeof info.times !== 'undefined' && info.times <= 0)) {
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
