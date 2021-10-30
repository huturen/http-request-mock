import { currentTime, isNodejs, isObject } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import { Method, MockConfigData, MockItemExt, RequestInfo } from '../types';
import MockItem from './mock-item';

export default class Mocker {
  private static instance: Mocker;
  private mockConfigData: MockConfigData;
  private disabled: boolean = false;
  private log: boolean = false;

  constructor() {
    if (Mocker.instance) {
      return Mocker.instance;
    }
    Mocker.instance = this;
    this.log = !isNodejs();
    this.mockConfigData = {};
    this.groupLog([['[http-request-mock] is %cloaded.', 'color:inherit;font-weight:bold;']]);
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
    this.groupLog([['[http-request-mock] is %cenabled.', 'color:green;font-weight:bold;']]);
    return this;
  }

  /**
   * Disable mock function temporarily.
   */
  public disable() {
    this.disabled = true;
    this.groupLog([['[http-request-mock] is %cdisabled.', 'color:red;font-weight:bold;']]);
    return this;
  }

  /**
   * Disable logs function temporarily.
   */
  public disableLog() {
    this.log = false;
    return this;
  }

  /**
   * Disable logs function temporarily.
   */
  public enableLog() {
    this.log = true;
    return this;
  }

  /**
   * Check specified mock item & add it to global mock data configuration.
   * @param {MockItem} mockItem
   * @returns false | MockItem
   */
  public mock(mockItemInfo: MockItem) {
    if (!isObject(mockItemInfo)) {
      throw new Error('Invalid mock item, a valid mock item must be an object.');
    }
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
   * If a match is found, return the matched mock item, otherwise a null is returned.
   * @param {string} reqUrl
   * @param {string} reqMethod
   * @return null | MockItem
   */
  public matchMockItem(reqUrl: string, reqMethod: Method | undefined): MockItem | null {
    if (this.disabled) {
      return null;
    }
    const requestMethod = (reqMethod || 'get').toLowerCase();

    const items = Object.values(this.mockConfigData).filter(({disable, times, method}: MockItem) => {
      const verb = String(method).toLowerCase();
      return disable !== 'yes' && (times === undefined || times > 0) && (verb === 'any' || verb === requestMethod);
    });

    for(let i = 0; i < 2; i++) {
      for(const info of items) {
        try {
          if ((info.url instanceof RegExp) && info.url.test(reqUrl)) {
            return info;
          }
          // [whole matching] takes precedence over partial matching
          if (i === 0 && (reqUrl === info.url || reqUrl.indexOf(info.url as string) === 0)) {
            return info;
          }
          // whole matching takes precedence over [partial matching]
          if (i === 1 && reqUrl.indexOf(info.url as string) > 0) {
            return info;
          }
        } catch(e) {}
      }
    }
    return null;
  }

  public groupLog(logs: any[]) {
    if (!this.log) return;
    if (typeof console.groupCollapsed !== 'function') return;
    if (typeof console.groupEnd !== 'function') return;

    if (Array.isArray(logs[0])) {
      console.groupCollapsed(...logs[0]);
    } else {
      console.groupCollapsed(logs[0])
    }
    for(let i = 1; i < logs.length; i++) {
      if (Array.isArray(logs[i])) {
        console.log(...logs[i]);
      } else {
        console.log(logs[i])
      }
    }
    console.groupEnd()
  }

  public sendResponseLog(spent: number, body: any, requestInfo: RequestInfo, mockItem: MockItem) {
    const logs = [
      [
        '[http-request-mock] %s %s %s (%c%s%c)',
        `${currentTime()}`,
        requestInfo.method,
        requestInfo.url,

        ('color:' + (mockItem.status < 300 ? 'green' : 'red')),
        mockItem.status,
        'color:inherit',
      ],
      ['Request: ', requestInfo],
      ['Response: ', {
        body,
        spent,
        headers: {...mockItem.header, 'x-powered-by': 'http-request-mock'},
        status: mockItem.status,
        statusText: HTTPStatusCodes[mockItem.status] || ''
      }],
      ['MockItem: ', mockItem]
    ];
    if (isNodejs()) { // less information for nodejs
      const { url, method, delay, times, status, disable } = mockItem;
      logs[3][1] = { url, method, delay, times, status, disable } as any;
    }
    this.groupLog(logs);
  }
}
