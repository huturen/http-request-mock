import Bypass from '../common/bypass';
import { getQuery, queryObject2String } from '../common/utils';
import { Disable, Header, Method, RequestInfo } from '../types';

export default class MockItem {
  public url: RegExp | string;
  public regexp: Array<string>; // ['abc.*xyz$', 'i'] => /abc.*xyz$/i
  public method: Method;
  public header: Header; // response header
  public delay: number;
  public body: unknown; // response body
  public response: unknown; // response body, for backward compatibility
  public remote: string; // url of remote mock data
  public proxy: boolean; // marked proxy mode
  public status: number; // http status code

  public disable: Disable;
  public times: number;
  public key: string;

  /**
   * Format specified mock item.
   * @param {MockItemInfo} mockItem
   * @returns false | MockItemInfo
   */
  constructor(mockItem: Partial<MockItem>) {
    if (!mockItem.url || (typeof mockItem.url !== 'string' && !(mockItem.url instanceof RegExp))) {
      return;
    }
    this.url = mockItem.url;
    this.method = /^(get|post|put|patch|delete|head|any)$/i.test(mockItem.method || '')
      ? <Method> mockItem.method?.toUpperCase()
      : <Method> 'ANY';

    this.header = typeof mockItem.header === 'object' ? mockItem.header : {};
    this.delay = mockItem.delay !== undefined && /^\d{0,15}$/.test(mockItem.delay+'') ? (+mockItem.delay) : 0;
    this.times = mockItem.times !== undefined && /^-?\d{0,15}$/.test(mockItem.times+'') ? +mockItem.times : Infinity;
    this.status = mockItem.status && /^[1-5][0-9][0-9]$/.test(mockItem.status+'') ? +mockItem.status : 200;
    this.disable = (mockItem.disable && /^(yes|true|1)$/.test(mockItem.disable) ? 'YES' : 'NO') as Disable;
    if ('body' in mockItem) {
      this.body = mockItem.body;
    } else if ('response' in mockItem) {
      this.body = mockItem.response;
    } else {
      this.body = '';
    }
    if (mockItem.remote && /^((get|post|put|patch|delete|head)\s+)?https?:\/\//i.test(mockItem.remote)) {
      this.remote = mockItem.remote;
    }
    this.proxy = !!mockItem.proxy;
    this.key = `${this.url}-${this.method}`;
  }

  public bypass() {
    return new Bypass;
  }

  public async sendBody(requestInfo: RequestInfo) {
    const body = typeof this.body === 'function'
      ? await this.body.bind(this)(requestInfo, this)
      : this.body;

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
      url = url.replace(new RegExp('\\$query\.'+key, 'g'), query[key]);
    }
    url = url.replace(/\$query/g, queryObject2String(query));

    return { method, url };
  }
}
