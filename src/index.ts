

import InterceptorFetch from './inteceptor/fetch';
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
   * Setup request mock for unit test.
   * @param {string} type
   */
  static setupForUnitTest(type: string = 'all') : Mocker {
    const mocker = new Mocker();

    if (type === 'wx.request' || type === 'wx') {
      InterceptorWxRequest.setupForUnitTest(mocker);
    }

    if (type === 'xhr') {
      InterceptorXhr.setupForUnitTest(mocker);
    }

    if (type === 'fetch') {
      InterceptorFetch.setupForUnitTest(mocker);
    }

    if (type === 'all') {
      InterceptorWxRequest.setupForUnitTest(mocker);
      InterceptorXhr.setupForUnitTest(mocker);
      InterceptorFetch.setupForUnitTest(mocker);
    }

    return mocker;
  }
}
