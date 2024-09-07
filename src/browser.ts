import cache from '../tool/plugin/cache.js';
import faker from '../tool/plugin/faker.js';
import BrowserPureIndex from './browser.pure';
import Mocker from './mocker/mocker';

export type { HttpVerb, MockItemExt, MockItemInfo, RequestInfo } from './types';
export { Mocker };

/**
 * The same as BrowserPureIndex, but with "faker" and "cache" plugins.
 */
export default class BrowserIndex extends BrowserPureIndex {
  static faker = faker;
  static cache = cache;
  static default = BrowserIndex; // for backward compatibility
}
