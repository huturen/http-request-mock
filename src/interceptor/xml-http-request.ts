import Bypass from '../common/bypass';
import { sleep, tryToParseJson, tryToParseObject } from '../common/utils';
import { HTTPStatusCodes } from '../config';
import MockItem from '../mocker/mock-item';
import Mocker from '../mocker/mocker';
import { HttpVerb, RemoteResponse, XMLHttpRequestInstance } from '../types';
import { OriginalResponse } from './../types';
import Base from './base';

export default class XMLHttpRequestInterceptor extends Base {
  private static instance: XMLHttpRequestInterceptor;
  private xhr: XMLHttpRequest;

  constructor(mocker: Mocker, proxyServer = '') {
    super(mocker, proxyServer);

    if (XMLHttpRequestInterceptor.instance) {
      return XMLHttpRequestInterceptor.instance;
    }

    XMLHttpRequestInterceptor.instance = this;
    this.xhr = this.global.XMLHttpRequest.prototype;
    this.intercept();
    return this;
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;
    const original = this.xhr.open;
    Object.defineProperty(this.xhr, 'open', {
      get: function() {
        return (
          method: HttpVerb,
          url: string,
          async = true,
          user: string | null = null,
          password: string | null = null
        ) => {
          const requestUrl = me.getFullRequestUrl(url, method);
          const mockItem: MockItem | null = me.matchMockRequest(requestUrl, method);

          if (!this.bypassMock) {
            if (mockItem) {
              // 'this' points XMLHttpRequest instance.
              this.isMockRequest = true;
              this.mockItem = mockItem;
              this.mockResponse = new NotResolved();
              this.requestInfo = me.getRequestInfo({ url: requestUrl, method, });
              this.requestArgs = [method, requestUrl, async, user, password];

              this.requestInfo.doOriginalCall = async (): Promise<OriginalResponse> => {
                const res = await me.getOriginalResponse(this);
                this.requestInfo.doOriginalCall = undefined;
                return res;
              };
              return;
            }
          }
          return original.call(this, method, requestUrl, async, user, password);
        };
      }
    });
    return this;
  }

  /**
   * Logic of intercepting XMLHttpRequest.send method.
   */
  private interceptSend() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;
    const original = this.xhr.send;
    Object.defineProperty(this.xhr, 'send', {
      get: function() {
        return (body: unknown) => {
          if (this.isMockRequest) {
            if (body !== null && body !== undefined) {
              this.requestInfo.rawBody = body;
              this.requestInfo.body = tryToParseObject(body);
            }

            // remoteInfo has a higher priority than BypassMock
            const remoteInfo = this.mockItem?.getRemoteInfo(this.requestInfo.url);
            if (remoteInfo) {
              return me.sendRemoteResult(this, this.mockItem, remoteInfo);
            }

            return me.doMockRequest(this).then(isBypassed => {
              if (isBypassed) {
                this.isMockRequest = false;
                this.bypassMock = true;
                this.open(...this.requestArgs);
                return original.call(this, body as Document);
              }
            });
          }
          return original.call(this, body as Document);
        };
      }
    });
    return this;
  }

  /**
   * Set remote result.
   * @param {XMLHttpRequestInstance} xhr
   * @param {Record<string, string>} remoteInfo
   */
  private sendRemoteResult(xhr: XMLHttpRequestInstance, mockItem: MockItem, remoteInfo: Record<string, string>) {
    const [ method, async, user, password ] = xhr.requestArgs;

    const newXhr = new XMLHttpRequest() as unknown as XMLHttpRequestInstance;
    newXhr.responseType = xhr.responseType;
    newXhr.timeout = xhr.timeout;

    this.setTimeoutTimer(newXhr);

    Object.assign(newXhr, { isMockRequest: false, bypassMock: true });
    newXhr.onreadystatechange = () => {
      if (newXhr.isTimeout) {
        return;
      }
      if (newXhr.readyState === 4) {
        const remoteResponse: RemoteResponse = {
          status: newXhr.status,
          headers: newXhr.getAllResponseHeaders().split('\r\n').reduce((res: Record<string, string>, item: string) => {
            const [key, val] = item.split(':');
            if (key && val) {
              res[key.toLowerCase()] = val.trim();
            }
            return res;
          }, {} as Record<string, string>),
          response: newXhr.response,
          responseText: newXhr.responseText,
          responseJson: tryToParseJson(newXhr.responseText)
        };
        this.doMockRequest(xhr, remoteResponse);
      }
    };
    newXhr.open(
      remoteInfo.method || method as string,
      remoteInfo.url,
      async as boolean,
      user as string,
      password as string
    );
    Object.entries(mockItem.requestHeaders).forEach(([key, val]: [string, string]) => {
      newXhr.setRequestHeader(key, val);
    });
    newXhr.send(xhr.requestInfo.rawBody as Document); // raw body
    return xhr;
  }

  /**
   * Get original response
   * @param {XMLHttpRequestInstance} xhr
   */
  private getOriginalResponse(xhr: XMLHttpRequestInstance): Promise<OriginalResponse> {
    const [ method, requestUrl, async, user, password ] = xhr.requestArgs;
    const { requestInfo } = xhr;

    return new Promise(resolve => {
      const newXhr = new XMLHttpRequest();
      newXhr.responseType = xhr.responseType;
      newXhr.timeout = xhr.timeout;

      Object.assign(newXhr, { isMockRequest: false, bypassMock: true });
      let status: OriginalResponse['status'] = null;
      let headers: OriginalResponse['headers'] = {};
      let responseText: OriginalResponse['responseText'] = null;
      let responseJson: OriginalResponse['responseJson'] = null;
      let responseBuffer: OriginalResponse['responseBuffer'] = null;
      let responseBlob: OriginalResponse['responseBlob'] = null;

      newXhr.onreadystatechange = function handleLoad() {
        if (newXhr.readyState === 4) {
          const responseType = newXhr.responseType;
          status = newXhr.status;
          headers = newXhr.getAllResponseHeaders()
            .split('\r\n')
            .reduce((res: Record<string, string>, item: string) => {
              const [key, val] = item.split(':');
              if (key && val) {
                res[key.toLowerCase()] = val.trim();
              }
              return res;
            }, {} as Record<string, string>);

          responseText = !responseType || responseType === 'text' || responseType === 'json'
            ? newXhr.responseText
            : (typeof newXhr.response === 'string' ? typeof newXhr.response : null);

          responseJson = tryToParseJson(responseText as string);
          responseBuffer = (typeof ArrayBuffer === 'function') && (newXhr.response instanceof ArrayBuffer)
            ? newXhr.response
            : null;
          responseBlob = (typeof Blob === 'function') && (newXhr.response instanceof Blob)
            ? newXhr.response
            : null;

          resolve({ status, headers, responseText, responseJson, responseBuffer, responseBlob, error: null});
        }
      };
      newXhr.open(method as string, requestUrl as string, async as boolean, user as string, password as string);
      newXhr.ontimeout = function handleTimeout() {
        const error = new Error('timeout exceeded');
        resolve({ status, headers, responseText, responseJson, responseBuffer, responseBlob, error });
      };

      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      newXhr.onerror = function handleError() {
        const error = new Error('network error');
        resolve({ status, headers, responseText, responseJson, responseBuffer, responseBlob, error });
      };

      // Handle browser request cancellation (as opposed to a manual cancellation)
      newXhr.onabort = function handleAbort() {
        const error = new Error('request aborted');
        resolve({ status, headers, responseText, responseJson, responseBuffer, responseBlob, error });
      };


      Object.entries(requestInfo.headers || {}).forEach(([key, val]: [string, string]) => {
        newXhr.setRequestHeader(key, val);
      });
      newXhr.send(requestInfo.rawBody as Document); // raw body
    });
  }

  /**
   * Make mock request.
   * @param {XMLHttpRequestInstance} xhr
   * @param {RemoteResponse | null} remoteResponse
   */
  private async doMockRequest(xhr: XMLHttpRequestInstance, remoteResponse: RemoteResponse | null = null) {
    let isBypassed = false;
    const { mockItem } = xhr;

    this.setTimeoutTimer(xhr);

    if (mockItem.delay && mockItem.delay > 0) {
      await sleep(+mockItem.delay);
      isBypassed = await this.doMockResponse(xhr, remoteResponse);
    } else {
      isBypassed = await this.doMockResponse(xhr, remoteResponse);
    }
    return isBypassed;
  }

  private setTimeoutTimer(xhr: XMLHttpRequestInstance) {
    const isEventReady = typeof Event !== 'undefined' && typeof xhr.dispatchEvent === 'function';

    // If already set, ignore it
    if (xhr.timeoutTimer) {
      return true;
    }

    if (xhr.timeout) {
      xhr.timeoutTimer = setTimeout(() => {
        xhr.isTimeout = true;
        if (typeof xhr.ontimeout === 'function') {
          xhr.ontimeout(this.progressEvent('timeout'));
        } else if (isEventReady) {
          xhr.dispatchEvent(new Event('timeout'));
        }
      }, xhr.timeout);
      return true;
    }
    return false;
  }

  /**
   * Make mock response.
   * @param {XMLHttpRequestInstance} xhr
   * @param {RemoteResponse | null} remoteResponse
   */
  private async doMockResponse(xhr: XMLHttpRequestInstance, remoteResponse: RemoteResponse | null = null) {
    const { mockItem, requestInfo } = xhr;

    if (xhr.isTimeout) {
      return false;
    }

    clearTimeout(xhr.timeoutTimer);
    const now = Date.now();
    const body = remoteResponse
      ? await mockItem.sendBody(requestInfo, remoteResponse)
      : await mockItem.sendBody(requestInfo);
    if (body instanceof Bypass) {
      if (remoteResponse) {
        throw new Error('[http-request-mock] A request which is marked by @remote tag cannot be bypassed.');
      }
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
      xhr.onreadystatechange(this.event('readystatechange'));
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('readystatechange'));
    }

    if (typeof xhr.onload === 'function') {
      xhr.onload(this.progressEvent('load'));
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('load'));
    }

    if (typeof xhr.onloadend === 'function') {
      xhr.onloadend(this.progressEvent('loadend'));
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('loadend'));
    }
  }

  private event(type: string): Event {
    return {
      type,
      target: this,
      currentTarget: this,
      eventPhase: 0,
      bubbles: false,
      cancelable: false,
      defaultPrevented: false,
      composed: false,
      timeStamp: typeof performance?.now === 'function' ? performance.now() : 294973.8000000119,
      srcElement: null,
      returnValue: true,
      cancelBubble: false,
      // NONE, CAPTURING_PHASE, AT_TARGET, BUBBLING_PHASE
      // path: [],
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      composedPath: () => [],
      initEvent: () => void(0),
      preventDefault: () => void(0),
      stopImmediatePropagation: () => void(0),
      stopPropagation: () => void(0),
      isTrusted: false,
    };
  }

  private progressEvent(type: string) {
    const baseEvent = this.event(type);
    return {
      ...baseEvent,
      lengthComputable: false,
      loaded: type === 'loadend' ? 1 : 0,
      // a fake total size, not reliable
      total: type === 'loadend' ? 1 : 0,
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
        return () => {
          if (this.isMockRequest) {
            return Object.entries({...this.mockItem.headers, 'x-powered-by': 'http-request-mock'})
              .map(([key, val]) => key.toLowerCase()+': '+val)
              .join('\r\n');
          }
          return original.call(this);
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
            const item = Object.entries(this.mockItem.headers).find(([key]) => key.toLowerCase() === field);
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
        return (header: string, value: string) => {
          if (this.isMockRequest) {
            this.requestInfo.headers = this.requestInfo.headers || {};
            this.requestInfo.header = this.requestInfo.header || {};
            this.requestInfo.headers[header] = value;
            this.requestInfo.header[header] = value;
            return;
          }
          return original.call(this, header, value);
        };
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
