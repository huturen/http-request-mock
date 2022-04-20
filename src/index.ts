import cache from '../tool/plugin/cache.js';
import faker from '../tool/plugin/faker.js';
import { isNodejs } from './common/utils';
import InterceptorFetch from './interceptor/fetch';
import InterceptorWxRequest from './interceptor/wx-request';
import InterceptorXhr from './interceptor/xml-http-request';
import Mocker from './mocker/mocker';

export default class Index {
  private static isEnabled = true;
  /**
   * Auto detect request environment and setup request mock for wx.request, fetch and XHR.
   * @param {string} proxyServer A proxy server which is used by proxy mode.
   */
  static setup(proxyServer = ''): Mocker {
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

    // for http.get, https.get, http.request, https.request in node environment
    if (this.isEnabled && isNodejs()) {
      // use require here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./interceptor/node/http-and-https').default.setup(mocker, proxyServer);
    }

    return mocker;
  }

  /**
   * Setup request mock for wx.request.
   * @param {string} proxyServer A proxy server which is used by proxy mode.
   */
  static setupForWx(proxyServer = ''): Mocker {
    const mocker = new Mocker(proxyServer);
    this.isEnabled && InterceptorWxRequest.setup(mocker, proxyServer);
    return mocker;
  }

  /**
   * Setup request mock for XMLHttpRequest.
   * @param {string} proxyServer A proxy server which is used by proxy mode.
   */
  static setupForXhr(proxyServer = ''): Mocker {
    const mocker = new Mocker(proxyServer);
    this.isEnabled && InterceptorXhr.setup(mocker, proxyServer);
    return mocker;
  }

  /**
   * Setup request mock for fetch.
   * @param {string} proxyServer A proxy server which is used by proxy mode.
   */
  static setupForFetch(proxyServer = ''): Mocker {
    const mocker = new Mocker(proxyServer);
    this.isEnabled && InterceptorFetch.setup(mocker, proxyServer);
    return mocker;
  }

  /**
   * Setup request mock for node http/https request.
   * For http.get, https.get, http.request, https.request in nodejs environment
   * @param {string} proxyServer A proxy server which is used by proxy mode.
   */
  static setupForNode(proxyServer = ''): Mocker {
    const mocker = new Mocker(proxyServer);
    // use require here to avoid static analysis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.isEnabled && require('./interceptor/node/http-and-https').default.setup(mocker, proxyServer);
    return mocker;
  }

  /**
   * Enable mock function temporarily.
   * Not available in proxy mode.
   */
  static enable(): Mocker {
    this.isEnabled = true;
    return Mocker.getInstance().enable();
  }

  /**
   * Disable mock function temporarily.
   * Not available in proxy mode.
   */
  static disable(): Mocker {
    this.isEnabled = false;
    return Mocker.getInstance().disable();
  }

  /**
   * Enable verbose log.
   * Not available in proxy mode.
   */
  static enableLog(): Mocker {
    return Mocker.getInstance().enableLog();
  }

  /**
   * Disable verbose log.
   * Not available in proxy mode.
   */
  static disableLog(): Mocker {
    return Mocker.getInstance().disableLog();
  }

  /**
   * Setup request mock for unit test.
   * @param {string} type
   */
  static setupForUnitTest(type: 'wx' | 'xhr' | 'fetch' | 'node' | 'all') : Mocker {
    if (!isNodejs()) {
      throw new Error('"setupForUnitTest" is only for nodejs envrioment.');
    }
    if (!['wx', 'xhr', 'fetch', 'node', 'all'].includes(type)) {
      throw new Error('Invalid type, valid types are "wx", "xhr", "fetch", "node" and "all".');
    }

    const mocker = new Mocker();

    if (type === 'wx' || type === 'all') {
      InterceptorWxRequest.initDummyWxRequestForUnitTest(mocker);
    }

    if (type === 'xhr' || type === 'all') {
      InterceptorXhr.initDummyXHRForUnitTest(mocker);
    }

    if (type === 'fetch' || type === 'all') {
      InterceptorFetch.initDummyFetchForUnitTest(mocker);
    }

    if (type === 'node' || type === 'all') {
      // use require here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./interceptor/node/http-and-https').default.setup(mocker);
    }

    return mocker;
  }
  static faker = faker;
  static cache = cache;
  static default = Index; // for backward compatibility
}
