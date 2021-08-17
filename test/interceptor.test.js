
    import HttpRequestMock from '../src/index';
import FetchInterceptor from '../src/interceptor/fetch';
import NodeHttpAndHttps from '../src/interceptor/node/http-and-https';
import WxInterceptor from '../src/interceptor/wx-request';
import XhrInterceptor from '../src/interceptor/xml-http-request';

describe('test interceptor necessary methods', () => {
  it('getGlobal method should return a proper global object', () => {
    // window from jsdom
    expect(XhrInterceptor.getGlobal()).toBe(window);

    delete global.window;
    expect(XhrInterceptor.getGlobal()).toBe(global);
  });

  it('set method should return the same object of new operator', () => {
    expect(XhrInterceptor.setup()).toBe(new XhrInterceptor());
    expect(NodeHttpAndHttps.setup()).toBe(new NodeHttpAndHttps());

    HttpRequestMock.setupForUnitTest('wx');
    expect(WxInterceptor.setup()).toBe(new WxInterceptor());

    HttpRequestMock.setupForUnitTest('fetch');
    expect(FetchInterceptor.setup()).toBe(new FetchInterceptor());
  });
});
