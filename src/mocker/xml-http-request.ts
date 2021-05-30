import InterceptorXhr from '../inteceptor/xml-http-request';
import Base from './base';

const container = <any> { instance: null };
export default class XMLHttpRequestMocker extends Base {
  interceptor: InterceptorXhr;

  constructor() {
    super();
    if (container.instance) return container.instance;
    container.instance = this;

    this.interceptor = new InterceptorXhr();

    return this;
  }

  /**
   * Setup request mocker.
   */
  static setup() {
    return new XMLHttpRequestMocker();
  }

  /**
   * The same as setup method but for backward compatibility.
   */
  static init() {
    return new XMLHttpRequestMocker();
  }

  /**
   * Setup request mocker for unit test.
   */
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
    return new XMLHttpRequestMocker();
  }
}
