import faker from 'faker';
import Bypass from '../common/bypass';
import { Disable, Header, Method } from '../types';

export default class MockItem {
  public url: RegExp | string;
  public regexp: Array<string>; // ['abc.*xyz$', 'i'] => /abc.*xyz$/i
  public method: Method;
  public header: Header; // response header
  public delay: number;
  public body: any; // response body
  public response: any; // response body, for backward compatibility
  public status: number; // http status code

  public disable: Disable;
  public times: number;
  public key: string;
  public faker: Faker.FakerStatic;

  /**
   * Format specified mock item.
   * @param {MockItemInfo} mockItem
   * @returns false | MockItemInfo
   */
  constructor(mockItem: MockItem) {
    if (!mockItem.url || (typeof mockItem.url !== 'string' && !(mockItem.url instanceof RegExp))) {
      return;
    }
    this.url = mockItem.url;
    this.method = /^(get|post|put|patch|delete|head|any)$/i.test(mockItem.method || '')
      ? <Method> mockItem.method!.toLowerCase()
      : <Method> 'any';

    this.header = typeof mockItem.header === 'object' ? mockItem.header : {};
    this.delay = mockItem.delay !== undefined && /^\d{0,15}$/.test(mockItem.delay+'') ? (+mockItem.delay) : 0;
    this.times = mockItem.times !== undefined && /^-?\d{0,15}$/.test(mockItem.times+'') ? +mockItem.times : Infinity;
    this.status = mockItem.status && /^[1-5][0-9][0-9]$/.test(mockItem.status+'') ? +mockItem.status : 200;
    this.disable = (mockItem.disable && /^(yes|true|1)$/.test(mockItem.disable) ? 'yes' : 'no') as Disable;
    if ('body' in mockItem) {
      this.body = mockItem.body;
    } else if ('response' in mockItem) {
      this.body = mockItem.response;
    } else {
      this.body = '';
    }
    // @ts-ignore
    this.faker = faker;
    this.key = `${this.url}-${this.method}`;
  }

  public bypass() {
    return new Bypass;
  }

  public async sendBody(requestInfo: any) {
    const body = typeof this.body === 'function'
      ? await this.body.bind(this)(requestInfo, this)
      : this.body;

    // console.log('this.body:', this, body);
    return body;
  }
}
