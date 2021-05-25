import { HTTPStatusCodes } from '../config';
import { Method, MockMetaInfo, XhrRequestInfo, XMLHttpRequestInstance } from '../types';
import Base from './base';
export default class XMLHttpRequestInterceptor extends Base {
  private xhr: any;

  constructor() {
    super();
    // https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest
    this.xhr = window.XMLHttpRequest.prototype;
    this.mockData = {};
    this.intercept();
  }

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

  // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open
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
          const match: MockMetaInfo | null = me.matchRequest(url, method);
          if (match) {
            // 'this' points XMLHttpRequest instance.
            this.isMockRequest = true;
            this.mockRequestInfo = match;
            this.xhrRequestInfo = <XhrRequestInfo>{ url, method, async, user, password, };
            return;
          }
          return original.call(this, method, url, async, user, password);
        };
      }
    });
    return this;
  }

  private interceptSend() {
    const me = this;
    const original = this.xhr.send;
    Object.defineProperty(this.xhr, 'send', {
      get: function() {
        return (body: any) => {
          if (this.isMockRequest) {
            this.xhrRequestInfo.body = body;
            return me.doMockRequest(this, this.mockRequestInfo, this.xhrRequestInfo);
          }
          return original.call(this, body);
        };
      }
    });
    return this;
  }

  private doMockRequest(xhr: XMLHttpRequestInstance, match: MockMetaInfo, requestInfo: XhrRequestInfo) {
    if (match.file) {
      import(`${process.env.HRM_MOCK_DIR}/${match.file}`).then((mock) => {
        xhr.mockRequestInfo.data = this.formatMockData(mock.default, requestInfo);
        this.doMockResponse(xhr, match);
      });
      return;
    }

    xhr.mockRequestInfo.data = this.formatMockData(match.data, requestInfo);
    this.doMockResponse(xhr, match);
  }

  private doMockResponse(xhr: XMLHttpRequestInstance, match: MockMetaInfo,) {
    if (match.delay && match.delay > 0) {
      setTimeout(() => {
        this.doCompleteCallbacks(xhr)
      }, +match.delay);
    } else {
      this.doCompleteCallbacks(xhr)
    }
  }

  formatMockData(mockData: any, requestInfo: XhrRequestInfo) {
    return typeof mockData === 'function' ? mockData(requestInfo) : mockData;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#event_handlers
   * Event handlers
   *  onreadystatechange as a property of the XMLHttpRequest instance is supported in all browsers.
   * Since then, a number of additional on* event handler properties have been implemented in various
   * browsers (onload, onerror, onprogress, etc.). See Using XMLHttpRequest. More recent browsers,
   * including Firefox, also support listening to the XMLHttpRequest events via standard addEventListener() APIs
   * in addition to setting on* properties to a handler function.
   * @param {XMLHttpRequest} xhr
   */
  private doCompleteCallbacks(xhr: XMLHttpRequest) {
    if (typeof xhr.onreadystatechange === 'function') {
      xhr.onreadystatechange(undefined as any)
    }

    if (typeof xhr.onload === 'function') {
      xhr.onload(undefined as any)
    }

    if (typeof xhr.onloadend === 'function') {
      xhr.onloadend(undefined as any)
    }

    if (typeof Event !== 'undefined' && typeof xhr.dispatchEvent === 'function') {
      xhr.dispatchEvent(new Event('readystatechange'));
      xhr.dispatchEvent(new Event('load'));
      xhr.dispatchEvent(new Event('loadend'));
    }
  }

  // https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/getAllResponseHeaders
  private interceptGetAllResponseHeaders() {
    const original = this.xhr.getAllResponseHeaders;
    Object.defineProperty(this.xhr, 'getAllResponseHeaders', {
      get: function() {
        return (body: any) => {
          if (this.isMockRequest) {
            return Object.entries({...this.mockRequestInfo.header, 'is-mock': 'yes'})
              .map(([key, val]) => key.toLowerCase()+': '+val)
              .join('\r\n');
          }
          return original.call(this, body);
        };
      }
    });
    return this;
  }

  // https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/getResponseHeader
  private interceptGetResponseHeader() {
    const original = this.xhr.getResponseHeader;
    Object.defineProperty(this.xhr, 'getResponseHeader', {
      get: function() {
        return (field: string) => {
          if (this.isMockRequest) {
            if (/^is-mock$/.test(field)) {
              return 'yes';
            }
            const item = Object.entries(this.mockRequestInfo.header).find(([key]) => key.toLowerCase() === field);
            return item ? item[1] : null;
          }
          return original.call(this, field);
        };
      }
    });
    return this;
  }

  private interceptSetRequestHeader() {
    const original = this.xhr.setRequestHeader;
    Object.defineProperty(this.xhr, 'setRequestHeader', {
      get: function() {
        return (header:any, value:any) => {
          if (this.isMockRequest) {
            return;
          }
          return original.call(this, header, value);
        }
      }
    });
    return this;
  }

  private getGetter(key: string) {
    const descriptor = Object.getOwnPropertyDescriptor(this.xhr, key);
    if (descriptor) {
      return descriptor.get;
    }
    // when XMLHttpRequest is not a standard implement.
    return this.xhr[key];
  }

  private interceptReadyState() {
    const original = this.getGetter('readyState');
    Object.defineProperty(this.xhr, 'readyState', {
      get: function() {
        if (this.isMockRequest) {
          return 4;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  private interceptStatus() {
    const original = this.getGetter('status');
    Object.defineProperty(this.xhr, 'status', {
      get: function() {
        if (this.isMockRequest) {
          return this.mockRequestInfo.status || 200;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  private interceptStatusText() {
    const original = this.getGetter('statusText');
    Object.defineProperty(this.xhr, 'statusText', {
      get: function() {
        if (this.isMockRequest) {
          return HTTPStatusCodes[this.mockRequestInfo.status || 200] || '';
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  private interceptResponseText() {
    const original = this.getGetter('responseText');
    Object.defineProperty(this.xhr, 'responseText', {
      get: function() {
        if (this.isMockRequest) {
          const data = this.mockRequestInfo.data;
          return typeof data === 'string' ? data : JSON.stringify(data);
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  private interceptResponse() {
    const original = this.getGetter('response');
    Object.defineProperty(this.xhr, 'response', {
      get: function() {
        if (this.isMockRequest) {
          return this.responseType !== '' ? this.mockRequestInfo.data : this.responseText;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

  private interceptResponseURL() {
    const original = this.getGetter('responseURL');
    Object.defineProperty(this.xhr, 'responseURL', {
      get: function() {
        if (this.isMockRequest) {
          return this.xhrRequestInfo.url;
        }
        return typeof original === 'function' ? original.call(this) : original;
      }
    });
    return this;
  }

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

