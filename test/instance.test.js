import HttpRequestMock from '../src/index';
import Mocker from '../src/mocker';

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
});



