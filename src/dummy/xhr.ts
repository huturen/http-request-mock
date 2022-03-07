import { IncomingMessage } from 'http';
import { isArrayBuffer, str2arrayBuffer } from '../common/utils';
import fallback from './fallback';

export default class dummyXMLHttpRequest {
  'http-request-mock': true; // make a flag to distinguish
  requestArgs: (string | boolean | null)[] = [];
  reqHeaders: Record<string, string> = {};
  _responseHeaders: Record<string, string | string[] | undefined> = {};
  _responseBody: unknown = '';
  onerror: unknown;

  responseType = '';

  // 0 UNSENT Client has been created. open() not called yet.
  // 1 OPENED open() has been called.
  // 2 HEADERS_RECEIVED send() has been called, and headers and status are available.
  // 3 LOADING Downloading; responseText holds partial data.
  // 4 DONE The operation is complete.
  _readyState = 0;
  _status = 0;
  _statusText = '';

  open(
    method: string,
    url: string,
    async = true,
    user: string | null = null,
    password: string | null = null
  ) {
    this.requestArgs = [method, url, async, user, password];
    this._readyState = 1;
  }

  send(body: unknown) {
    const [method, url, user, password] = this.requestArgs;
    const opts: Record<string, string> = user && password ? {
      auth: `${user}:${password}`,
    } : {};
    fallback(url as string, method as string, this.reqHeaders, body, opts)
      .then((res: {body: string, response: IncomingMessage}) => {
        this._responseBody = res.body;
        this._readyState = 4;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._status = res.response.statusCode!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._statusText = res.response.statusMessage!;

        this._responseHeaders = res.response.headers || {};
        this.sendResult(this as unknown as XMLHttpRequest);
      })
      .catch((err: Error) => {
        // Before the request completes, the value of status is 0.
        // Browsers also report a status of 0 in case of XMLHttpRequest errors.
        this._status = 0;

        if (typeof this.onerror === 'function') {
          this.onerror(err);
        } else {
          throw err;
        }
      });
  }

  /**
   * The XMLHttpRequest.abort() method aborts the request if it has already been sent.
   * When a request is aborted, its readyState is changed to XMLHttpRequest.UNSENT (0)
   * and the request's status code is set to 0.
   */
  abort() {
    this._status = 0;
    this._readyState = 0;
    this._responseBody = '';
  }

  setRequestHeader(header: string, value: string) {
    this.reqHeaders[header] = value;
  }

  private sendResult(xhr: XMLHttpRequest) {
    const isEventReady = typeof Event !== 'undefined' && typeof xhr.dispatchEvent === 'function';

    if (typeof xhr.onreadystatechange === 'function') {
      xhr.onreadystatechange(this.event('readystatechange'));
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('readystatechange'));
    }

    if (typeof xhr.onload === 'function') {
      xhr.onload(this.event('load'));
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('load'));
    }
    if (typeof xhr.onloadend === 'function') {
      xhr.onloadend(this.event('loadend'));
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('loadend'));
    }
  }

  private event(type: string) {
    return {
      type,
      target: null,
      currentTarget: null,
      eventPhase: 0,
      bubbles: false,
      cancelable: false,
      defaultPrevented: false,
      composed: false,
      timeStamp: 294973.8000000119,
      srcElement: null,
      returnValue: true,
      cancelBubble: false,
      path: [],
      NONE: 0,
      CAPTURING_PHASE: 0,
      AT_TARGET: 0,
      BUBBLING_PHASE: 0,
      composedPath: () => [],
      initEvent: () => void(0),
      preventDefault: () => void(0),
      stopImmediatePropagation: () => void(0),
      stopPropagation: () => void(0),
      isTrusted: false,
      lengthComputable: false,
      loaded: 1,
      total: 1
    };
  }

  getAllResponseHeaders() {
    return Object.entries({...this._responseHeaders})
      .map(([key, val]) => key.toLowerCase()+': '+val)
      .join('\r\n');
  }

  getResponseHeader(key: string) {
    return this._responseHeaders[key] === undefined ? null : this._responseHeaders[key];
  }

  get readyState() {
    return this._readyState;
  }

  get status() {
    return this._status;
  }

  get statusText() {
    return this._statusText;
  }

  get response() {
    const type = this.responseType;
    if (type === 'text' || type === '') {
      return this.responseText;
    }
    if (type === 'arraybuffer') {
      if (isArrayBuffer(this._responseBody)) {
        return this._responseBody;
      }
      else if (typeof this._responseBody === 'string') {
        return str2arrayBuffer(this._responseBody);
      } else {
        return str2arrayBuffer(JSON.stringify(this._responseBody));
      }
    }
    if (type === 'json') {
      if (typeof this._responseBody === 'string') {
        try {
          return JSON.parse(this._responseBody);
        } catch(err) { // eslint-disable-line
          return null;
        }
      }
    }
    return this._responseBody;
  }

  get responseText() {
    return typeof this._responseBody === 'string'
      ? this._responseBody
      : JSON.stringify(this._responseBody);
  }

  get responseURL() {
    return this.requestArgs[1];
  }

  get responseXML() {
    return null;
  }
}
