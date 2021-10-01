import Bypass from '../common/bypass';
import { sleep, tryToParseObject } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { Method, XMLHttpRequestInstance } from '../types';
import Base from './base';

export default class XMLHttpRequestInterceptor extends Base {
  private static instance: XMLHttpRequestInterceptor;
  private xhr: any;

  constructor(mocker: Mocker) {
    super(mocker);

    if (XMLHttpRequestInterceptor.instance) {
      return XMLHttpRequestInterceptor.instance;
    }

    XMLHttpRequestInterceptor.instance = this;
    this.xhr = this.global.XMLHttpRequest.prototype;
    this.intercept();
    return this;
  }

  /**
   * Setup request mocker for unit test.
   * You can specify the second argument for a fallback request
   * using http/https native request module if not matched.
   * @param {Mocker} mocker
   */
  static setupForUnitTest(mocker: Mocker) {
    // use requre here to avoid static analysis
    global.XMLHttpRequest = global.XMLHttpRequest || require('../faker/xhr').default;
    return new XMLHttpRequestInterceptor(mocker);
  }

  /**
   * https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest
   * Logic of intercepting XMLHttpRequest object.
   */
  private intercept() {
    // intercept methods
    this.interceptOpen();
    this.interceptSend();
    this.interceptSetRequestHeader();
    this.interceptGetAllResponseHeaders();
    this.interceptGetResponseHeader();

    // intercept getters
    this.interceptReadyState();
    this.interceptStatus();
    this.interceptStatusText();
    this.interceptResponseText();
    this.interceptResponse();
    this.interceptResponseURL();
    this.interceptResponseXML();
    return this;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open
   * Logic of intercepting XMLHttpRequest.open method.
   */
  private interceptOpen() {
    const me = this;
    const original = this.xhr.open;
    Object.defineProperty(this.xhr, 'open', {
      get: function() {
        return (
          method: Method,
          url: string,
          async: boolean = true,
          user: string | null = null,
          password: string | null = null
        ) => {
          if (!this.bypassMock) {
            const mockItem: MockItem | null = me.matchMockRequest(url, method);
            if (mockItem) {
              // 'this' points XMLHttpRequest instance.
              this.isMockRequest = true;
              this.mockItem = mockItem;
              this.mockResponse = new NotResolved();
              this.requestInfo = me.getRequestInfo({ url, method, });
              this.requestArgs = [method, url, async, user, password];
              return;
            }
          }
          return original.call(this, method, url, async, user, password);
        };
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.send method.
   */
  private interceptSend() {
    const me = this;
    const original = this.xhr.send;
    Object.defineProperty(this.xhr, 'send', {
      get: function() {
        return (body: any) => {
          if (this.isMockRequest) {
            if (body !== null && body !== undefined) {
              this.requestInfo.body = tryToParseObject(body);
            }
            return me.doMockRequest(this).then(isBypassed => {
              if (isBypassed) {
                this.isMockRequest = false;
                this.bypassMock = true;
                this.open(...this.requestArgs);
                return original.call(this, body);
              }
            });
          }
          return original.call(this, body);
        };
      }
    });
    return this;
  }

  /**
   * Make mock request.
   * @param {XMLHttpRequestInstance} xhr
   * @param {MockItemInfo} mockItem
   * @param {RequestInfo} requestInfo
   */
  private async doMockRequest(xhr: XMLHttpRequestInstance) {
    let isBypassed = false;
    const { mockItem } = xhr;
    if (mockItem.delay && mockItem.delay > 0) {
      await sleep(+mockItem.delay);
      isBypassed = await this.doMockResponse(xhr);
    } else {
      isBypassed = await this.doMockResponse(xhr);
    }
    return isBypassed;
  }

  /**
   * Make mock response.
   * @param {XMLHttpRequestInstance} xhr
   * @param {MockItemInfo} mockItem
   * @param {RequestInfo} requestInfo
   */
  private async doMockResponse(xhr: XMLHttpRequestInstance) {
    const { mockItem, requestInfo } = xhr;

    const now = Date.now();
    const body = await mockItem.sendBody(requestInfo);
    if (body instanceof Bypass) {
      return true;
    }
    const spent = (Date.now() - now) + (mockItem.delay || 0);
    xhr.mockResponse = body;

    this.mocker.sendResponseLog(spent, body, xhr.requestInfo, mockItem);
    this.sendResult(xhr);
    return false;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#event_handlers
   * Call some necessary callbacks if specified. Trigger some necessary events.
   * 'onreadystatechange' as a property of the XMLHttpRequest instance is supported in all browsers.
   * Since then, a number of additional on* event handler properties have been implemented in various
   * browsers (onload, onerror, onprogress, etc.). See Using XMLHttpRequest. More recent browsers,
   * including Firefox, also support listening to the XMLHttpRequest events via standard addEventListener() APIs
   * in addition to setting on* properties to a handler function.
   * @param {XMLHttpRequest} xhr
   */
  private sendResult(xhr: XMLHttpRequest) {
    const isEventReady = typeof Event !== 'undefined' && typeof xhr.dispatchEvent === 'function';

    if (typeof xhr.onreadystatechange === 'function') {
      xhr.onreadystatechange(undefined as any)
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('readystatechange'));
    }

    if (typeof xhr.onload === 'function') {
      xhr.onload(undefined as any)
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('load'));
    }

    if (typeof xhr.onloadend === 'function') {
      xhr.onloadend(undefined as any)
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('loadend'));
    }
  }

  /**
   * https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/getAllResponseHeaders
   * Logic of intercepting XMLHttpRequest.getAllResponseHeaders method.
   */
  private interceptGetAllResponseHeaders() {
    const original = this.xhr.getAllResponseHeaders;
    Object.defineProperty(this.xhr, 'getAllResponseHeaders', {
      get: function() {
        return (body: any) => {
          if (this.isMockRequest) {
            return Object.entries({...this.mockItem.header, 'x-powered-by': 'http-request-mock'})
              .map(([key, val]) => key.toLowerCase()+': '+val)
              .join('\r\n');
          }
          return original.call(this, body);
        };
      }
    });
    return this;
  }

  /**
   * https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/getResponseHeader
   * Logic of intercepting XMLHttpRequest.getResponseHeader method.
   */
  private interceptGetResponseHeader() {
    const original = this.xhr.getResponseHeader;
    Object.defineProperty(this.xhr, 'getResponseHeader', {
      get: function() {
        return (field: string) => {
          if (this.isMockRequest) {
            if (/^x-powered-by$/i.test(field)) {
              return 'http-request-mock';
            }
            const item = Object.entries(this.mockItem.header).find(([key]) => key.toLowerCase() === field);
            return item ? item[1] : null;
          }
          return original.call(this, field);
        };
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.interceptSetRequestHeader method.
   */
  private interceptSetRequestHeader() {
    const original = this.xhr.setRequestHeader;
    Object.defineProperty(this.xhr, 'setRequestHeader', {
      get: function() {
        return (header:any, value:any) => {
          if (this.isMockRequest) {
            this.requestInfo.headers = this.requestInfo.headers || {};
            this.requestInfo.headers[header] = value;
            return;
          }
          return original.call(this, header, value);
        }
      }
    });
    return this;
  }

  /**
   * Get getter function by key.
   * @param {string} key
   */
  private getGetter(key: string) {
    const descriptor = Object.getOwnPropertyDescriptor(this.xhr, key);
    if (descriptor) {
      return descriptor.get;
    }
    // when XMLHttpRequest is not a standard implement.
    return this.xhr[key];
  }

  /**
   * Logic of intercepting XMLHttpRequest.readyState getter.
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
   */
  private interceptReadyState() {
    const original = this.getGetter('readyState');
    Object.defineProperty(this.xhr, 'readyState', {
      get: function() {
        if (this.isMockRequest) {
          if (this.mockResponse instanceof NotResolved) return 1; // OPENED

          return 4;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.status getter.
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/status
   */
  private interceptStatus() {
    const original = this.getGetter('status');
    Object.defineProperty(this.xhr, 'status', {
      get: function() {
        if (this.isMockRequest) {
          if (this.mockResponse instanceof NotResolved) return 0;

          return this.mockItem.status;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.statusText getter.
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/statusText
   */
  private interceptStatusText() {
    const original = this.getGetter('statusText');
    Object.defineProperty(this.xhr, 'statusText', {
      get: function() {
        if (this.isMockRequest) {
          if (this.mockResponse instanceof NotResolved) return '';

          return HTTPStatusCodes[this.mockItem.status] || '';
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.responseText getter.
   */
  private interceptResponseText() {
    const original = this.getGetter('responseText');
    Object.defineProperty(this.xhr, 'responseText', {
      get: function() {
        if (this.isMockRequest) {
          if (this.mockResponse instanceof NotResolved) return '';

          const data = this.mockResponse;
          return typeof data === 'string' ? data : JSON.stringify(data);
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.response getter.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
   * When setting responseType to a particular value, the author should make
   * sure that the server is actually sending a response compatible with that
   * format. If the server returns data that is not compatible with the
   * responseType that was set, the value of response will be null.
   */
  private interceptResponse() {
    const original = this.getGetter('response');
    Object.defineProperty(this.xhr, 'response', {
      get: function() {
        if (this.isMockRequest) {
          if (this.mockResponse instanceof NotResolved) return null;

          const type = this.responseType;
          // An empty responseType string is the same as "text", the default type.
          if (type === 'text' || type === '') {
            return this.responseText;
          }
          // The response is a JavaScript ArrayBuffer containing binary data.
          if (type === 'arraybuffer' && typeof ArrayBuffer === 'function') {
            return (this.mockResponse instanceof ArrayBuffer) ? this.mockResponse : null;
          }
          // The response is a Blob object containing the binary data.
          if (type === 'blob' && typeof Blob === 'function') {
            return (this.mockResponse instanceof Blob) ? this.mockResponse : null;
          }
          // The response is an HTML Document or XML XMLDocument, as appropriate based on the MIME type of
          // the received data. See HTML in XMLHttpRequest to learn more about using XHR to fetch HTML content.
          if (type === 'document' && (typeof Document === 'function' || typeof XMLDocument === 'function')) {
            return ((this.mockResponse instanceof Document) || (this.mockResponse instanceof XMLDocument))
              ? this.mockResponse
              : null;
          }
          // The response is a JavaScript object created by parsing the contents of received data as JSON.
          if (type === 'json') {
            if (typeof this.mockResponse === 'object') {
              return this.mockResponse;
            }
            if (typeof this.mockResponse === 'string') {
              try {
                return JSON.parse(this.mockResponse);
              } catch(err) { // eslint-disable-line
                // console.warn('The mock response is not compatible with the responseType json: ' + err.message);
                return null;
              }
            }
            return null;
          }
          return this.mockResponse;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.responseURL getter.
   */
  private interceptResponseURL() {
    const original = this.getGetter('responseURL');
    Object.defineProperty(this.xhr, 'responseURL', {
      get: function() {
        if (this.isMockRequest) {
          return this.requestInfo.url;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.responseXML getter.
   */
  private interceptResponseXML() {
    const original = this.getGetter('responseXML');
    Object.defineProperty(this.xhr, 'responseXML', {
      get: function() {
        if (this.isMockRequest) {
          return this.responseType === 'document' ? this.response : null;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }
}

class NotResolved{}
