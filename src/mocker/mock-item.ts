import Bypass from '../common/bypass';
import { getQuery, isImported, isPromise, queryObject2String } from '../common/utils';
import { Disable, DynamicImported, Header, HttpVerb, MockItemInfo, RequestInfo } from '../types';
import { RemoteResponse } from './../types';

export default class MockItem {
  public url: RegExp | string;
  public regexp: Array<string>; // ['abc.*xyz$', 'i'] => /abc.*xyz$/i
  public method: HttpVerb;
  public header: Header; // response header, the same as headers, just for backward compatibility
  public headers: Header; // response header
  public delay: number;
  public body: unknown; // response body
  public response: unknown; // response body, for backward compatibility
  public remote: string; // url of remote mock data
  public status: number; // http status code

  public disable: Disable;
  public times: number;
  public key: string;
  public deProxy = false; // Use this option to make the mock use case run in the browser instead of nodejs.

  /**
   * Format specified mock item.
   * @param {MockItemInfo} mockItem
   * @returns false | MockItemInfo
   */
  constructor(mockItem: MockItemInfo) {
    if (!mockItem.url || (typeof mockItem.url !== 'string' && !(mockItem.url instanceof RegExp))) {
      return;
    }
    this.url = mockItem.url;
    this.method = /^(get|post|put|patch|delete|head|any)$/i.test(mockItem.method || '')
      ? <HttpVerb> mockItem.method?.toUpperCase()
      : <HttpVerb> 'ANY';

    const headers = mockItem.headers || mockItem.header || {};
    this.header = headers && typeof headers === 'object' ? headers : {};
    this.headers = headers && typeof headers === 'object' ? headers : {};

    this.delay = mockItem.delay !== undefined && /^\d{0,15}$/.test(mockItem.delay+'') ? (+mockItem.delay) : 0;
    this.times = mockItem.times !== undefined && /^-?\d{0,15}$/.test(mockItem.times+'') ? +mockItem.times : Infinity;
    this.status = mockItem.status && /^[1-5][0-9][0-9]$/.test(mockItem.status+'') ? +mockItem.status : 200;
    this.disable = (mockItem.disable && /^(yes|true|1)$/.test(mockItem.disable) ? 'YES' : 'NO') as Disable;
    this.setBody(mockItem);

    const isUrlLiked = /^((get|post|put|patch|delete|head)\s+)?https?:\/\//i.test(mockItem.remote as string);
    const isDollarUrl = mockItem.remote === '$url';
    if (mockItem.remote && (isUrlLiked || isDollarUrl)) {
      this.remote = mockItem.remote;
    } else if (mockItem.remote){
      throw new Error('Invalid @remote config. Valid @remote examples: http://x.com/, GET http://x.com, $url');
    }
    this.deProxy = !!mockItem.deProxy;
    this.key = `${this.url}-${this.method}`;
  }

  private setBody(mockItem: MockItemInfo) {
    let body: unknown;
    if ('body' in mockItem) {
      body = mockItem.body;
    } else if ('response' in mockItem) {
      body = mockItem.response;
    } else {
      body = '';
    }
    if (isPromise(body)) {
      (body as Promise<unknown>).then((data) => {
        this.body = isImported(data) ? (data as DynamicImported).default : data;
      });
    } {
      this.body = body;
    }
  }

  public bypass() {
    return new Bypass;
  }

  public async sendBody(requestInfo: RequestInfo, remoteResponse: RemoteResponse | null = null) {
    let body;
    if (typeof this.body === 'function') {
      body = remoteResponse
        ? await this.body.bind(this)(remoteResponse, requestInfo, this)
        : await this.body.bind(this)(requestInfo, this);
    } else {
      body = this.body;
    }

    return body;
  }

  public getRemoteInfo(requestUrl: string): false | Record<string, string> {
    if (!this.remote) return false;

    const arr = this.remote.split(/(\s)/);
    let method = '';
    let url = this.remote;
    if (/^(get|post|put|patch|delete|head)$/i.test(arr[0])) {
      method = arr[0];
      url = arr.slice(2).join('');
    }
    const query = getQuery(requestUrl);
    for(const key in query) {
      const queryString = Array.isArray(query[key]) ? (query[key] as string[]).join(',') : query[key];
      url = url.replace(new RegExp('\\$query\.'+key, 'g'), queryString as string);
    }
    url = url.replace(/\$query/g, queryObject2String(query));
    url = url === '$url' ? requestUrl : url;
    return { method, url };
  }
}
