import { isNodejs } from './common/utils';
import InterceptorFetch from './interceptor/fetch';
import InterceptorWxRequest from './interceptor/wx-request';
import InterceptorXhr from './interceptor/xml-http-request';
import Mocker from './mocker/mocker';

export default class Index {
  private static isEnabled = true;
  /**
   * Auto detect request enviroment and setup request mock.
   * @param {string} type
   */
  static setup(proxyServer = '') : Mocker {
    const mocker = new Mocker(proxyServer);

    if (this.isEnabled && typeof wx !== 'undefined' && typeof wx.request === 'function') {
      InterceptorWxRequest.setup(mocker, proxyServer);
    }

    if (this.isEnabled && typeof window !== 'undefined' && typeof window.XMLHttpRequest === 'function') {
      InterceptorXhr.setup(mocker, proxyServer);
    }

    if (this.isEnabled && typeof window !== 'undefined' && typeof window.fetch === 'function') {
      InterceptorFetch.setup(mocker, proxyServer);
    }

    // for http.get, https.get, http.request, https.request in node enviroment
    if (this.isEnabled && isNodejs()) {
      // use requre here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./interceptor/node/http-and-https').default.setup(mocker, proxyServer);
    }

    return mocker;
  }

  /**
   * Setup request mock for wx.request.
   * @param {string} type
   */
  static setupForWx(proxyServer = '') : Mocker {
    const mocker = new Mocker(proxyServer);
    this.isEnabled && InterceptorWxRequest.setup(mocker, proxyServer);
    return mocker;
  }

  /**
   * Setup request mock for XMLHttpRequest.
   * @param {string} type
   */
  static setupForXhr(proxyServer = '') : Mocker {
    const mocker = new Mocker(proxyServer);
    this.isEnabled && InterceptorXhr.setup(mocker, proxyServer);
    return mocker;
  }

  /**
   * Setup request mock for fetch.
   * @param {string} type
   */
  static setupForFetch(proxyServer = '') : Mocker {
    const mocker = new Mocker(proxyServer);
    this.isEnabled && InterceptorFetch.setup(mocker, proxyServer);
    return mocker;
  }

  /**
   * Setup request mock for node http/https request.
   * @param {string} type
   */
  static setupForNode(proxyServer = '') : Mocker {
    const mocker = new Mocker(proxyServer);
    // use requre here to avoid static analysis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.isEnabled && require('./interceptor/node/http-and-https').default.setup(mocker, proxyServer);
    return mocker;
  }

  /**
   * Enable mock function temporarily.
   * Not available in proxy mode.
   */
  static enable() : Mocker {
    this.isEnabled = true;
    return Mocker.getInstance().enable();
  }

  /**
   * Disable mock function temporarily.
   * Not available in proxy mode.
   */
  static disable() : Mocker {
    this.isEnabled = false;
    return Mocker.getInstance().disable();
  }

  /**
   * Enable verbose log.
   * Not available in proxy mode.
   */
  static enableLog() : Mocker {
    return Mocker.getInstance().enableLog();
  }

  /**
   * Disable verbose log.
   * Not available in proxy mode.
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
