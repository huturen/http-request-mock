import fs from 'fs';
import path from 'path';
import { parseCommentTags } from '../tool/lib/comment.js';
import Browser from './browser';
import { getCallerFile, isNodejs } from './common/utils';
import Dummy from './dummy';
import NodeHttpAndHttps from './interceptor/node/http-and-https';
import MockItem from './mocker/mock-item.js';
import Mocker from './mocker/mocker';

/**
* Note: this method is only for a nodejs envrioment(test environment).
* Use a mock file & add it to global mock data configuration.
* @param {string} file
*/
Mocker.prototype.use = function use(file: string) {
  let absoluteFile = file;
  if (!path.isAbsolute(file)) {
    const callerFile = getCallerFile();
    if (!callerFile) {
      throw new Error('Expected "file" to be a absolute path.');
    }
    absoluteFile = path.resolve(callerFile, '..', file);
  }
  if (!fs.existsSync(absoluteFile)) {
    throw new Error(`${absoluteFile} does not exist.`);
  }
  const tags = parseCommentTags(absoluteFile) as unknown as Partial<MockItem>;
  // To avoid "Critical dependency: the request of a dependency is an expression" error
  tags.body = require(absoluteFile);
  return this.mock(tags);
};

export default class Index extends Browser{
  /**
   * Auto detect request environment and setup request mock for wx.request, fetch and XHR.
   * @param {string} proxyServer A proxy server which is used by proxy mode.
   */
  static setup(proxyServer = ''): Mocker {
    const mocker = Browser.setup(proxyServer);


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
      throw new Error('"setupForUnitTest" is only for nodejs envrioment.');
    }
    if (!['wx', 'xhr', 'fetch', 'node', 'all'].includes(type)) {
      throw new Error('Invalid type, valid types are "wx", "xhr", "fetch", "node" and "all".');
    }

    if (type === 'wx' || type === 'all') {
      Dummy.initDummyWxRequestForUnitTest();
    }

    if (type === 'xhr' || type === 'all') {
      Dummy.initDummyXHRForUnitTest();
    }

    if (type === 'fetch' || type === 'all') {
      Dummy.initDummyFetchForUnitTest();
    }

    return this.setupForNode();
  }

  static default = Index; // for backward compatibility
}
