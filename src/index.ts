import Browser from './browser';
import { isNodejs } from './common/utils';
import Dummy from './dummy';
import NodeHttpAndHttps from './interceptor/node/http-and-https';
import Mocker from './mocker/mocker-for-node';

export type { HttpVerb, Method, MockItemExt, MockItemInfo, RequestInfo } from './types';
export { Mocker };

export default class Index extends Browser{
  /**
   * Auto detect request environment and setup request mock for wx.request, fetch and XHR.
   * @param {string} proxyServer A proxy server which is used by proxy mode.
   */
  static setup(proxyServer = ''): Mocker {
    const mocker = new Mocker(proxyServer);

    Browser.setup(proxyServer);

    // for http.get, https.get, http.request, https.request in node environment
    if (this.isEnabled && isNodejs()) {
      // use require here to avoid static analysis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      NodeHttpAndHttps.setup(mocker, proxyServer);
    }

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
    this.isEnabled && NodeHttpAndHttps.setup(mocker, proxyServer);
    return mocker;
  }



  /**
   * Setup request mock for unit test.
   * @param {string} type
   */
  static setupForUnitTest(type: 'wx' | 'xhr' | 'fetch' | 'node' | 'all') : Mocker {
    if (!isNodejs()) {
      throw new Error('"setupForUnitTest" is only for nodejs environment.');
    }
    if (!['wx', 'xhr', 'fetch', 'node', 'all'].includes(type)) {
      throw new Error('Invalid type, valid types are "wx", "xhr", "fetch", "node" and "all".');
    }

    const mocker = new Mocker();

    if (type === 'wx' || type === 'all') {
      Dummy.initDummyWxRequestForUnitTest();
      this.setupForWx();
    }

    if (type === 'xhr' || type === 'all') {
      Dummy.initDummyXHRForUnitTest();
      this.setupForXhr();
    }

    if (type === 'fetch' || type === 'all') {
      Dummy.initDummyFetchForUnitTest();
      this.setupForFetch();
    }

    if (type === 'node' || type === 'all') {
      this.setupForNode();
    }

    return mocker;
  }

  static default = Index; // for backward compatibility
}
