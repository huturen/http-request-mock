import InterceptorFetch from '../inteceptor/fetch';
import Base from './base';

const container = <any> { instance: null };
export default class FetchMocker extends Base {
  interceptor: InterceptorFetch;

  constructor() {
    super();
    if (container.instance) return container.instance;
    container.instance = this;

    this.interceptor = new InterceptorFetch();

    return this;
  }

  static setup() {
    return new FetchMocker();
  }

  static setupForUnitTest() {
    window.fetch = <any> function() {};
  }
}
