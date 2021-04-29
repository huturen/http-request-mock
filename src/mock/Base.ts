
import InterceptorFetch from '../inteceptor/Fetch';
import InterceptorWxRequest from '../inteceptor/WxRequest';
import InterceptorXhr from '../inteceptor/XMLHttpRequest';
import { Method, MockTpl } from '../types';

export default class Base {
  interceptor: InterceptorXhr | InterceptorWxRequest | InterceptorFetch;

  setMockData(mockData: object) {
    this.interceptor.setMockData(mockData);
    return this;
  }

  reset() {
    this.setMockData({});
    return this;
  }

  doMock(mockItem: any) {
    if (!mockItem.url || typeof mockItem.url !== 'string' && !(mockItem.url instanceof RegExp)) {
      return this;
    }

    if (mockItem.data === undefined) {
      return this;
    }

    mockItem.method = /^(get|post|put|patch|delete|any)$/i.test(mockItem.method)
      ? <Method> mockItem.method.toLowerCase()
      : <Method> 'any';

    const key = `${mockItem.url}-${mockItem.method}`;
    this.interceptor.addMockData(key, mockItem);
    return this;
  }

  get(url: RegExp | String, mockData: any, delay: number = 0) {
    this.doMock(<MockTpl>{ url, method: 'get', data: mockData, delay });
    return this;
  }

  post(url: RegExp | String, mockData: any, delay: number = 0) {
    this.doMock(<MockTpl>{ url, method: 'post', data: mockData, delay });
    return this;
  }

  put(url: RegExp | String, mockData: any, delay: number = 0) {
    this.doMock(<MockTpl>{ url, method: 'put', data: mockData, delay });
    return this;
  }

  patch(url: RegExp | String, mockData: any, delay: number = 0) {
    this.doMock(<MockTpl>{ url, method: 'patch', data: mockData, delay });
    return this;
  }

  delete(url: RegExp | String, mockData: any, delay: number = 0) {
    this.doMock(<MockTpl>{ url, method: 'delete', data: mockData, delay });
    return this;
  }

  any(url: RegExp | String, mockData: any, delay: number = 0) {
    this.doMock(<MockTpl>{ url, method: 'any', data: mockData, delay });
    return this;
  }
}
