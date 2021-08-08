

import InterceptorFetch from './inteceptor/fetch';
import NodeHttpAndHttpsRequestInterceptor from './inteceptor/node/http-and-https';
import InterceptorWxRequest from './inteceptor/wx-request';
import InterceptorXhr from './inteceptor/xml-http-request';
import Mocker from './mocker';
export default class Index {
  /**
   * Auto detect request enviroment and setup request mock.
   * @param {string} type
   */
  static setup() : Mocker {
    const mocker = new Mocker();

    if (typeof wx !== 'undefined' && typeof wx.request === 'function') {
      InterceptorWxRequest.setup(mocker);
    }

    if (typeof window !== 'undefined' && typeof window.XMLHttpRequest === 'function') {
      InterceptorXhr.setup(mocker);
    }

    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      InterceptorFetch.setup(mocker);
    }

    // for http.get, https.get, http.request, https.request in node enviroment
    if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
      NodeHttpAndHttpsRequestInterceptor.setup(mocker);
    }

    return mocker;
  }

  /**
   * Setup request mock for wx.request.
   * @param {string} type
   */
  static setupForWx() : Mocker {
    const mocker = new Mocker();
    InterceptorWxRequest.setup(mocker);
    return mocker;
  }

  /**
   * Setup request mock for XMLHttpRequest.
   * @param {string} type
   */
  static setupForXhr() : Mocker {
    const mocker = new Mocker();
    InterceptorXhr.setup(mocker);
    return mocker;
  }

  /**
   * Setup request mock for node http/https request.
   * @param {string} type
   */
  static setupForNode() : Mocker {
    const mocker = new Mocker();
    NodeHttpAndHttpsRequestInterceptor.setup(mocker);
    return mocker;
  }

  /**
   * Setup request mock for fetch.
   * @param {string} type
   */
  static setupForFetch() : Mocker {
    const mocker = new Mocker();
    InterceptorFetch.setup(mocker);
    return mocker;
  }

  /**
   * Enable mock function temporarily.
   */
  static enable() : Mocker {
    return Mocker.getInstance().enable();
  }

  /**
   * Disable mock function temporarily.
   */
  static disable() : Mocker {
    return Mocker.getInstance().disable();
  }


  /**
   * Setup request mock for unit test.
   * @param {string} type
   */
  static setupForUnitTest(type: 'wx' | 'xhr' | 'fetch' | 'node' | 'node.http.request') : Mocker {
    const mocker = new Mocker();

    if (type === 'wx') {
      InterceptorWxRequest.setupForUnitTest(mocker);
    }

    if (type === 'xhr') {
      InterceptorXhr.setupForUnitTest(mocker);
    }

    if (type === 'fetch') {
      InterceptorFetch.setupForUnitTest(mocker);
    }

    if (type === 'node' || type === 'node.http.request') {
      NodeHttpAndHttpsRequestInterceptor.setupForUnitTest(mocker);

      // By default, 'jsdom' will set up a fake XMLHttpRequest which triggers "http.request".
      // So we set up XMLHttpRequest mock too in jest envrioment.
      // @ts-ignore
      if (process.env.JEST_WORKER_ID || typeof jest !== 'undefined') {
        InterceptorXhr.setupForUnitTest(mocker);
      }
    }

    return mocker;
  }
}
