import { isArrayBuffer, str2arrayBuffer } from '../common/utils';
import fallback from './fallback';

export default class FakeXMLHttpRequest {
  'http-request-mock': true; // make a flag to distinguish
  requestArgs: any[] = [];
  reqHeaders: any = {};
  _responseHeaders: any = {};
  _responseBody: any = '';
  responseType: string = '';
  // 0	UNSENT	Client has been created. open() not called yet.
  // 1	OPENED	open() has been called.
  // 2	HEADERS_RECEIVED	send() has been called, and headers and status are available.
  // 3	LOADING	Downloading; responseText holds partial data.
  // 4	DONE	The operation is complete.
  _readyState: number = 0;
  _status: number = 0;
  _statusText: string = '';

  open(
    method: string,
    url: string,
    async: boolean = true,
    user: string | null = null,
    password: string | null = null
  ) {
    this.requestArgs = [method, url, async, user, password];
    this._readyState = 1;
  }

  send(body: any) {
    const [method, url, async, user, password] = this.requestArgs;
    let opts = user && password ? {
      auth: `${user}:${password}`,
    } : {};
    // @ts-ignore
    fallback(url, method, this.reqHeaders, body, opts)
      .then((res: any) => {
        this._responseBody = res.body;
        this._readyState = 4;
        this._status = res.response.statusCode!;
        this._statusText = res.response.statusMessage!;

        this._responseHeaders = res.response.headers || {};
        this.sendResult(this as any);
      })
      .catch((err: Error) => {
        // Before the request completes, the value of status is 0.
        // Browsers also report a status of 0 in case of XMLHttpRequest errors.
        this._status = 0;

        // @ts-ignore
        if (typeof this.onerror === 'function') {
          // @ts-ignore
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

  setRequestHeader(header:any, value:any) {
    this.reqHeaders[header] = value;
  }

  private sendResult(xhr: XMLHttpRequest) {
    const isEventReady = typeof Event !== 'undefined' && typeof xhr.dispatchEvent === 'function';

    if (typeof xhr.onreadystatechange === 'function') {
      xhr.onreadystatechange(undefined as any);
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('readystatechange'));
    }

    if (typeof xhr.onload === 'function') {
      xhr.onload(undefined as any);
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('load'));
    }
    if (typeof xhr.onloadend === 'function') {
      xhr.onloadend(undefined as any);
    } else if (isEventReady) {
      xhr.dispatchEvent(new Event('loadend'));
    }
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
};
