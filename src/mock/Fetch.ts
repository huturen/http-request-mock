import InterceptorFetch from '../inteceptor/Fetch';
import Base from './Base';

const container = <any> { instance: null };
export default class FetchResponseMock extends Base {
  interceptor: InterceptorFetch;

  constructor() {
    super();
    if (container.instance) return container.instance;
    container.instance = this;

    this.interceptor = new InterceptorFetch();

    return this;
  }

  static setup() {
    return new FetchResponseMock();
  }

  // backward compatibility
  static init() {
    return new FetchResponseMock();
  }

  static setupForUnitTest() {
    window.fetch = <any> function() {};
  }
}
