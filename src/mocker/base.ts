
import InterceptorFetch from '../inteceptor/fetch';
import InterceptorWxRequest from '../inteceptor/wx-request';
import InterceptorXhr from '../inteceptor/xml-http-request';
import { Method, MockMetaInfo } from '../types';

export default class BaseMocker {
  interceptor: InterceptorXhr | InterceptorWxRequest | InterceptorFetch;

  setMockData(mockData: object) {
    this.interceptor.setMockData(mockData);
    return this;
  }

  reset() {
    this.setMockData({});
    return this;
  }

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

  get(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'get', data: mockData, delay, status, header });
    return this;
  }

  post(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'post', data: mockData, delay, status, header });
    return this;
  }

  put(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'put', data: mockData, delay, status, header });
    return this;
  }

  patch(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'patch', data: mockData, delay, status, header });
    return this;
  }

  delete(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'delete', data: mockData, delay, status, header });
    return this;
  }

  any(url: RegExp | String, mockData: any, delay: number = 0, status: number = 200, header: object) {
    this.mock(<MockMetaInfo>{ url, method: 'any', data: mockData, delay, status, header });
    return this;
  }
}
