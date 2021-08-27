import HttpRequestMock from '../src/index';
import FetchInterceptor from '../src/interceptor/fetch';
import Mocker from '../src/mocker/mocker';

describe('test HttpRequestMock necessary methods', () => {
  it('setup method should return an instance of Mocker', () => {
    global.wx = { request: function(){} };
    expect(HttpRequestMock.setup()).toBe(new Mocker());

    window.fetch = function(){};
    expect(HttpRequestMock.setup()).toBe(new Mocker());
  });

  it('setupForWx method should return an instance of Mocker', () => {
    global.wx = { request: function(){} };
    expect(HttpRequestMock.setupForWx()).toBe(new Mocker());
  });

  it('setupForXhr method should return an instance of Mocker', () => {
    expect(HttpRequestMock.setupForXhr()).toBe(new Mocker());
  });

  it('enable method should return an instance of Mocker', () => {
    expect(HttpRequestMock.enable()).toBe(new Mocker());
  });

  it('disable method should return an instance of Mocker', () => {
    expect(HttpRequestMock.disable()).toBe(new Mocker());
  });

  it('Mocker.setMockData method should return an instance of Mocker', () => {
    expect(new Mocker().setMockData({'key': {}})).toBe(new Mocker());
  });

  it('Mocker.reset method should return an instance of Mocker', () => {
    expect(new Mocker().reset()).toBe(new Mocker());
  });

  it('Mocker.mock method should return false if specified mockItem is invalid', () => {
    expect(new Mocker().mock({})).toBe(false);
  });

  it('Mocker.matchMockItem method should return a mock item when matched with a request', () => {
    const mocker = new Mocker();
    mocker.mock({url: 'http://www.api.com/mock', times: 0});
    mocker.disable();

    expect(mocker.matchMockItem('http://www.api.com/mock')).toBe(null);
    mocker.enable();
    expect(mocker.matchMockItem('http://www.api.com/mock')).toBe(null);

    mocker.mock({url: 'http://www.api.com/regexp-mock', regexp: ['\/regexp-mock$', '']});
    expect(mocker.matchMockItem('http://www.api.com/regexp-mock')).toBeTruthy();
  });

  it('FetchInterceptor.setup method should return an instance of FetchInterceptor', () => {
    const mocker = new Mocker();
    const instance = FetchInterceptor.setup(mocker);

    const info1 = instance.getRequestInfo({headers: { abc: 123 }});
    const info2 = instance.getRequestInfo({header: { xyz: 456 }});
    const info3 = instance.getRequestInfo({body: '{ "rst": 789 }'});
    expect(info1.headers).toMatchObject({ abc: 123 });
    expect(info2.headers).toMatchObject({ xyz: 456 });
    expect(info3.body).toMatchObject({ rst: 789 });

    expect(instance).toBe(new FetchInterceptor(mocker));
  });
});



