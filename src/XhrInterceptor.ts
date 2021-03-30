export default class XhrInterceptor {
  private xhr: any;
  private mockData: any;

  constructor() {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest
    this.xhr = window.XMLHttpRequest.prototype;
    this.mockData = {};
    this.intercept();
  }

  setMockData(data: object) {
    this.mockData = data;
    return this;
  }

  addMockData(key: string, val: any) {
    this.mockData[key] = val;
    return this;
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

  private matchRequest(reqUrl: any, reqMethod: any) {
    for(let key in this.mockData) {
      try {
        const info = this.mockData[key];
        if (info.disable === 'yes') {
          continue;
        }
        const method = `${info.method}`.toLowerCase();
        if (method !== 'any' && method !== `${reqMethod}`.toLowerCase()) {
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
      }catch(e) {}
    }
    return false;
  }

  private interceptOpen() {
    const me = this;
    const original = this.xhr.open;
    Object.defineProperty(this.xhr, 'open', {
      get: function() {
        return (method: any, url: any, async: any, user: any, password: any) => {
          const match = me.matchRequest(url, method);
          if (match) {
            this.isMockRequest = true;
            this.mockRequestInfo = match;
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
            return this.mockRequestInfo.delay && this.mockRequestInfo.delay > 0
              ? setTimeout(() => me.doCompleteCallbacks(this), +this.mockRequestInfo.delay)
              : me.doCompleteCallbacks(this);
          }
          return original.call(this, body);
        };
      }
    });
    return this;
  }

  private doCompleteCallbacks(xhrInstance: any) {
    xhrInstance.onreadystatechange();
    xhrInstance.onload && xhrInstance.onload();
    xhrInstance.onloadend && xhrInstance.onloadend();
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
          return 200;
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
          return 'OK';
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

