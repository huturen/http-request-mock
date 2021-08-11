import { Disable, Method, MockConfigData, MockItemExt, MockItemInfo } from './types';

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
   * @param {MockItemInfo} mockItem
   * @returns false | MockItemInfo
   */
  public mock(mockItem: MockItemInfo) {
    if (!mockItem.url || (typeof mockItem.url !== 'string' && !(mockItem.url instanceof RegExp))) {
      return false;
    }

    mockItem.method = /^(get|post|put|patch|delete|head|any)$/i.test(mockItem.method || '')
      ? <Method> mockItem.method!.toLowerCase()
      : <Method> 'any';

    mockItem.header = typeof mockItem.header === 'object' ? mockItem.header : {};
    mockItem.delay = mockItem.delay && /^[1-9]\d{0,14}$/.test(mockItem.delay+'') ? +mockItem.delay : 0;;
    mockItem.times = mockItem.times && /^-?[1-9]\d{0,14}$/.test(mockItem.times+'') ? +mockItem.times : Infinity;
    mockItem.status = mockItem.status && /^[1-5][0-9][0-9]$/.test(mockItem.status+'') ? +mockItem.status : 200;
    mockItem.disable = (mockItem.disable && /^(yes|true|1)$/.test(mockItem.disable) ? 'yes' : 'no') as Disable;

    const key = `${mockItem.url}-${mockItem.method}`;
    this.addMockItem(key, mockItem);
    return mockItem;
  }

  /**
   * Make a mock item that matches an HTTP GET request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public get(url: RegExp | String, response: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItemInfo>{ url, method: 'get', response, delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP POST request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public post(url: RegExp | String, response: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItemInfo>{ url, method: 'post', response, delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP PUT request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public put(url: RegExp | String, response: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItemInfo>{ url, method: 'put', response, delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP PATCH request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public patch(url: RegExp | String, response: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItemInfo>{ url, method: 'patch', response, delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP DELETE request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public delete(url: RegExp | String, response: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItemInfo>{ url, method: 'delete', response, delay, status, header, times });
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
   * @param {any} response
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public head(url: RegExp | String, response: any = '', opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItemInfo>{ url, method: 'delete', response: '', delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP GET, POST, PUT, PATCH, DELETE or HEAD request.
   * @param {RegExp | String} url
   * @param {any} response
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public any(url: RegExp | String, response: any, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock(<MockItemInfo>{ url, method: 'any', response, delay, status, header, times });
    return this;
  }

  /**
   * Check whether the specified request url matchs a defined mock item.
   * If a match were found, return mock meta information, otherwise a null is returned.
   * @param {string} reqUrl
   * @param {string} reqMethod
   * @return null | MockItemInfo
   */
  public matchMockItem(reqUrl: string, reqMethod: Method | undefined): MockItemInfo | null {
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
