import fs from 'fs';
import path from 'path';
import Comment from '../../plugin/comment';
import { currentTime, isNodejs, isObject } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import { Logs, Method, MockConfigData, MockItemExt, RequestInfo } from '../types';
import MockItem from './mock-item';

export default class Mocker {
  private static instance: Mocker;
  private mockConfigData: MockConfigData;
  private disabled = false;
  private log = false;
  private proxyServer = '';
  private proxyMode = 'none';

  constructor(proxyServer = '') {
    if (Mocker.instance) {
      return Mocker.instance;
    }
    if (/^(matched|marked)@localhost:\d+$/.test(proxyServer)) {
      [this.proxyMode, this.proxyServer] = proxyServer.split('@');
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
    for(const key in mockConfigData) {
      this.mock(mockConfigData[key]);
    }
    return this;
  }

  /**
   * Add an mock item to global mock data configuration.
   * @param {string} key
   * @param {MockItem} val
   */
  private addMockItem(key: string, val: MockItem) {
    this.mockConfigData[key] = val;
    return this;
  }

  /**
   * Reset global mock data configuration.
   */
  public reset() {
    this.mockConfigData = {};
    this.sendMsgToProxyServer('reset');
    return this;
  }

  /**
   * Enable mock function temporarily.
   * Not available in proxy mode.
   */
  public enable() {
    this.disabled = false;
    this.sendMsgToProxyServer('enable');
    this.groupLog([['[http-request-mock] is %cenabled.', 'color:green;font-weight:bold;']]);
    return this;
  }

  /**
   * Disable mock function temporarily.
   * Not available in proxy mode.
   */
  public disable() {
    this.disabled = true;
    this.sendMsgToProxyServer('disable');
    this.groupLog([['[http-request-mock] is %cdisabled.', 'color:red;font-weight:bold;']]);
    return this;
  }

  /**
   * Send a message to proxy server if in a proxy mode.
   * @param {string} msg
   */
  public sendMsgToProxyServer(msg = '') {
    if (!this.proxyServer) {
      return;
    }
    if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
      return;
    }
    if (typeof window !== 'undefined' &&
      Object.prototype.toString.call(window) === '[object Window]' &&
      typeof window.fetch === 'function'
    ) {
      window.fetch(`http://${this.proxyServer}/__hrm_msg__/`+encodeURIComponent(msg));
    }
  }

  /**
   * Disable logs function temporarily.
   * Not available in proxy mode.
   */
  public disableLog() {
    this.log = false;
    this.sendMsgToProxyServer('disableLog');
    return this;
  }

  /**
   * Disable logs function temporarily.
   * Not available in proxy mode.
   */
  public enableLog() {
    this.log = true;
    this.sendMsgToProxyServer('enableLog');
    return this;
  }

  /**
   * Note: this method is only for a nodejs envrioment(test environment).
   * Use a mock file & add it to global mock data configuration.
   * @param {string} file
   */
  public use(file: string) {
    let absoluteFile = file;
    if (!path.isAbsolute(file)) {
      const callerFile = this.getCallerFile();
      if (!callerFile) {
        throw new Error('Expected "file" to be a absolute path.');
      }
      absoluteFile = path.resolve(callerFile, '..', file);
    }
    if (!fs.existsSync(absoluteFile)) {
      throw new Error(`${absoluteFile} does not exist.`);
    }
    const tags = Comment.parseCommentTags(absoluteFile) as unknown as Partial<MockItem>;
    // To avoid "Critical dependency: the request of a dependency is an expression" error
    tags.body = eval('require')(absoluteFile);
    return this.mock(tags);
  }

  /**
   * Get caller file from error stack
   */
  private getCallerFile() {
    const oldPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack)  => stack;
    const stack = new Error().stack as unknown as Record<string, { getFileName: () => string }>;
    Error.prepareStackTrace = oldPrepareStackTrace;


    if (stack !== null && typeof stack === 'object') {
      for(let i = 0; i < 50; i++) {
        const file = stack[i] ? stack[i].getFileName() : undefined;
        const next = stack[i + 1] ? stack[i + 1].getFileName() : undefined;
        if (file !== next && file === __filename) {
          return next;
        }
      }
    }
  }


  /**
   * Check specified mock item & add it to global mock data configuration.
   * @param {MockItem} mockItem
   * @returns false | MockItem
   */
  public mock(mockItemInfo: Partial<MockItem>) {
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
   * @param {unknown} body
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public get(url: RegExp | string, body: unknown, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock({ url, method: Method.GET, body, delay, status, header, times });
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
  public post(url: RegExp | string, body: unknown, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;

    this.mock({ url, method: Method.POST, body, delay, status, header, times });
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
  public put(url: RegExp | string, body: unknown, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock({ url, method: Method.PUT, body, delay, status, header, times });
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
  public patch(url: RegExp | string, body: unknown, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock({ url, method: Method.PATCH, body, delay, status, header, times });
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
  public delete(url: RegExp | string, body: unknown, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock({ url, method: Method.DELETE, body, delay, status, header, times });
    return this;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/HEAD
   * Warning: A response to a HEAD method should not have a body.
   * If it has one anyway, that body must be ignored, any representation
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
  public head(url: RegExp | string, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock({ url, method: Method.HEAD, body: '', delay, status, header, times });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP GET, POST, PUT, PATCH, DELETE or HEAD request.
   * @param {RegExp | String} url
   * @param {unknown} body
   * @param {MockItemExt} opts {
   *    @param {number} delay
   *    @param {number} status
   *    @param {object} header
   *    @param {number} times
   * }
   */
  public any(url: RegExp | string, body: unknown, opts: MockItemExt = {
    delay: 0,
    status: 200,
    times: Infinity,
    header: {}
  }) {
    const { delay, status, times, header } = opts;
    this.mock({ url, method: Method.ANY, body, delay, status, header, times });
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
    const requestMethod = (reqMethod || 'GET').toUpperCase();

    const items = Object.values(this.mockConfigData).filter(({disable, times, method}: MockItem) => {
      const verb = String(method).toUpperCase();
      return disable !== 'YES' && (times === undefined || times > 0) && (verb === 'ANY' || verb === requestMethod);
    }).sort((mockItem1: MockItem, mockItem2: MockItem) => {
      return String(mockItem2.url).length - String(mockItem1.url).length;
    });

    for(let i = 0; i < 2; i++) {
      for(const info of items) {
        try {
          if ((info.url instanceof RegExp) && info.url.test(reqUrl)) {
            return info;
          }
          const infoUrl = reqUrl.indexOf('//') === 0
            // for the request urls which without http protocol
            ? String(info.url).replace(/^https?:/ig, '')
            : String(info.url);

          // [whole matching] takes precedence over partial matching
          if (i === 0 && reqUrl === infoUrl) {
            return info;
          }

          // whole matching takes precedence over [partial matching]
          if (i === 1 && reqUrl.indexOf(infoUrl) !== -1) {
            return info;
          }
        } catch(e) {
          // ignore match error, normally, user doesn't care it.
        }
      }
    }
    return null;
  }

  /**
   * Set group logs
   * @param {Logs[]} logs
   * @returns
   */
  public groupLog(logs: Logs[]) {
    if (!this.log) return;
    if (typeof console.groupCollapsed !== 'function') return;
    if (typeof console.groupEnd !== 'function') return;

    if (Array.isArray(logs[0])) {
      console.groupCollapsed(...logs[0]);
    } else {
      console.groupCollapsed(logs[0]);
    }
    for(let i = 1; i < logs.length; i++) {
      if (Array.isArray(logs[i])) {
        console.log(...logs[i]);
      } else {
        console.log(logs[i]);
      }
    }
    console.groupEnd();
  }

  public sendResponseLog(spent: number, body: unknown, requestInfo: RequestInfo, mockItem: MockItem) {
    const logs: Logs[] = [
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
      // ['MockItem: ', mockItem]
    ];
    if (isNodejs()) { // less information for nodejs
      const { url, method, delay, times, status, disable } = mockItem;
      logs[3] = ['MockItem:', { url, method, delay, times, status, disable }];
    } else {
      logs[3] = ['MockItem: ', mockItem];
    }
    this.groupLog(logs);
  }
}
