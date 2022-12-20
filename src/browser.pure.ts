import InterceptorFetch from './interceptor/fetch';
import InterceptorWxRequest from './interceptor/wx-request';
import InterceptorXhr from './interceptor/xml-http-request';
import Mocker from './mocker/mocker';

export type { HttpVerb, Method, MockItemExt, MockItemInfo, RequestInfo } from './types';
export { Mocker };

export default class BrowserPureIndex {
  protected static isEnabled = true;
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

  static default = BrowserPureIndex; // for backward compatibility
}
