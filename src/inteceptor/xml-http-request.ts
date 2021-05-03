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

    // intercept getters
    this.interceptReadyState();
    this.interceptStatus();
    this.interceptStatusText();
    this.interceptResponseText();
    this.interceptResponse();
    return this;
  }

  private interceptOpen() {
    const me = this;
    const original = this.xhr.open;
    Object.defineProperty(this.xhr, 'open', {
      get: function() {
        return (method: Method, url: string, async: boolean, user: string, password: string) => {
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
}

