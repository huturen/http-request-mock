import InterceptorXhr from '../inteceptor/XMLHttpRequest';
import Base from './Base';

const container = <any> { instance: null };
export default class XMLHttpRequestResponseMock extends Base {
  interceptor: InterceptorXhr;

  constructor() {
    super();
    if (container.instance) return container.instance;
    container.instance = this;

    this.interceptor = new InterceptorXhr();

    return this;
  }

  static setup() {
    return new XMLHttpRequestResponseMock();
  }

  // backward compatibility
  static init() {
    return new XMLHttpRequestResponseMock();
  }

  static setupForUnitTest() {
    window.XMLHttpRequest = <any> function() {};
    window.XMLHttpRequest.prototype = <any>{
      open: function() {
      },
      send: function() {
      },
      setRequestHeader: function() {
      },
      onreadystatechange: function() {
      },
      load: function() {
      },
      loadend: function() {
      },
      get readyState() {
        return 4;
      },
      get status() {
        return 200;
      },
      get statusText() {
        return '';
      },
      get response() {
        return '';
      },
      get responseText() {
        return '';
      },
    };
    return new XMLHttpRequestResponseMock();
  }
}
