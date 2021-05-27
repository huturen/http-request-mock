
import InterceptorFetch from '../inteceptor/fetch';
import InterceptorWxRequest from '../inteceptor/wx-request';
import InterceptorXhr from '../inteceptor/xml-http-request';
import { Method, MockMetaInfo } from '../types';

export default class BaseMocker {
  interceptor: InterceptorXhr | InterceptorWxRequest | InterceptorFetch;

  /**
   * Set global mock data configuration.
   * @param {object} data
   */
  setMockData(mockData: object) {
    this.interceptor.setMockData(mockData);
    return this;
  }

  /**
   * Reset global mock data configuration.
   * @param {string} key
   * @param {any} val
   */
  reset() {
    this.setMockData({});
    return this;
  }

  /**
   *  Check specified mock item & add to global mock data configuration.
   * @param {MockMetaInfo} mockItem
   */
  mock(mockItem: MockMetaInfo) {
    if (!mockItem.url || typeof mockItem.url !== 'string' && !(mockItem.url instanceof RegExp)) {
      return this;
    }

    if (mockItem.data === undefined) {
      return this;
    }

    mockItem.method = /^(get|post|put|patch|delete|any)$/i.test(mockItem.method || '')
      ? <Method> mockItem.method
      : <Method> 'any';

    const key = `${mockItem.url}-${mockItem.method}`;
    this.interceptor.addMockData(key, mockItem);
    return this;
  }

  /**
   * Make a mock item that matches an HTTP GET request.
   * @param {RegExp | String} url
   * @param {any} mockData
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  get(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'get', data: mockData, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP POST request.
   * @param {RegExp | String} url
   * @param {any} mockData
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  post(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'post', data: mockData, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP PUT request.
   * @param {RegExp | String} url
   * @param {any} mockData
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  put(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'put', data: mockData, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP PATCH request.
   * @param {RegExp | String} url
   * @param {any} mockData
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  patch(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'patch', data: mockData, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP DELETE request.
   * @param {RegExp | String} url
   * @param {any} mockData
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  delete(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'delete', data: mockData, delay, status, header });
    return this;
  }

  /**
   * Make a mock item that matches an HTTP GET, POST, PUT, PATCH or DELETE request.
   * @param {RegExp | String} url
   * @param {any} mockData
   * @param {number} delay
   * @param {number} status
   * @param {object} header
   */
  any(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'any', data: mockData, delay, status, header });
    return this;
  }
}
