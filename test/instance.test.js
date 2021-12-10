import HttpRequestMock from '../src/index';
import FetchInterceptor from '../src/interceptor/fetch';
import MockItem from '../src/mocker/mock-item';
import Mocker from '../src/mocker/mocker';

describe('test HttpRequestMock necessary methods', () => {
  it('setup method should return an instance of Mocker', () => {
    global.wx = { request: function(){
      void(0);
    } };
    expect(HttpRequestMock.setup()).toBe(new Mocker());

    window.fetch = function(){
      void(0);
    };
    expect(HttpRequestMock.setup()).toBe(new Mocker());
  });

  it('setupForWx method should return an instance of Mocker', () => {
    global.wx = { request: function(){
      void(0);
    } };
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

  it('enableLog method should return an instance of Mocker', () => {
    expect(HttpRequestMock.enableLog()).toBe(new Mocker());
  });

  it('disableLog method should return an instance of Mocker', () => {
    expect(HttpRequestMock.disableLog()).toBe(new Mocker());
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

    mocker.mock({url: new RegExp('/regexp-mock$')});
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

  it('Mocker.disableLog method should return an instance of Mocker', () => {
    expect(new Mocker().disableLog()).toBe(new Mocker());
  });

  it('Mocker.enableLog method should return an instance of Mocker', () => {
    const [log1, log2, log3] = [console.groupCollapsed, console.groupEnd, console.log];
    const mocker = new Mocker();
    console.groupCollapsed = jest.fn();
    console.groupEnd = jest.fn();
    console.log = jest.fn();
    expect(mocker.enableLog()).toBeInstanceOf(Mocker);
    mocker.groupLog([123, 'abc']);
    mocker.groupLog([[123, 456], ['abc', 'xyz']]);
    expect(console.groupCollapsed).toBeCalled();
    expect(console.groupEnd).toBeCalled();

    console.groupEnd = undefined;
    expect(mocker.groupLog([123, 'abc'])).toBe(undefined);

    console.groupCollapsed = undefined;
    expect(mocker.groupLog([123, 'abc'])).toBe(undefined);
    [console.groupCollapsed, console.groupEnd, console.log] = [log1, log2, log3];
  });

  it('MockItem.faker should be an instance of Faker.FakerStatic', () => {
    const mockItem = new MockItem({
      url: 'https://www.api.com/abc',
      response: '<html>xxx</html>',
      disable: 'true',
    });
    expect(mockItem.disable).toBe('YES');
    expect(mockItem.faker).toBeTruthy();
    expect(mockItem.faker.name).toBeTruthy();
    expect(typeof mockItem.faker.name.findName()).toBe('string');
  });
});



