import { isNodejs } from './common/utils';
import InterceptorFetch from './interceptor/fetch';
import InterceptorWxRequest from './interceptor/wx-request';
import InterceptorXhr from './interceptor/xml-http-request';
import Mocker from './mocker/mocker';

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
    if (isNodejs()) {
      // use requre here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./interceptor/node/http-and-https').default.setup(mocker);
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
   * Setup request mock for fetch.
   * @param {string} type
   */
  static setupForFetch() : Mocker {
    const mocker = new Mocker();
    InterceptorFetch.setup(mocker);
    return mocker;
  }

  /**
   * Setup request mock for node http/https request.
   * @param {string} type
   */
  static setupForNode() : Mocker {
    const mocker = new Mocker();
    // use requre here to avoid static analysis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./interceptor/node/http-and-https').default.setup(mocker);
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
   * Enable verbose log.
   */
  static enableLog() : Mocker {
    return Mocker.getInstance().enableLog();
  }

  /**
   * Disable verbose log.
   */
  static disableLog() : Mocker {
    return Mocker.getInstance().disableLog();
  }

  /**
   * Setup request mock for unit test.
   * @param {string} type
   */
  static setupForUnitTest(type: 'wx' | 'xhr' | 'fetch' | 'node' | 'node.http.request' | 'all') : Mocker {
    if (!isNodejs()) {
      throw new Error('"setupForUnitTest" is only for nodejs envrioment.');
    }

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
      // use requre here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./interceptor/node/http-and-https').default.setupForUnitTest(mocker);
    }

    if (type === 'all') {
      InterceptorWxRequest.setupForUnitTest(mocker);
      InterceptorXhr.setupForUnitTest(mocker);
      InterceptorFetch.setupForUnitTest(mocker);
      // use requre here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./interceptor/node/http-and-https').default.setupForUnitTest(mocker);
    }

    return mocker;
  }

  static default = Index; // for backward compatibility
}

module.exports = Index; // make it can be required without 'default' property
