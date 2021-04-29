import ResonseMock from '../src/index';

const mock = ResonseMock.setupForUnitTest();

describe('mock XMLHttpRequest raw request', () => {
  it('XMLHttpRequest raw get request should be mocked', (done) => {
    mock.get('developer.mozilla.org/get', 'developer.mozilla.org');

    const xhr = new window.XMLHttpRequest();
    xhr.open('GET', 'https://developer.mozilla.org/get', true);
    xhr.onreadystatechange = function () {
      if(xhr.readyState === 4 && xhr.status === 200) {
        expect(xhr.responseText).toBe('developer.mozilla.org');
        done();
      }
    };
    xhr.send(null);
  });

  it('XMLHttpRequest raw post request should be mocked', (done) => {
    mock.post('developer.mozilla.org/post', 'developer.mozilla.org.post');

    const xhr = new window.XMLHttpRequest();
    xhr.open('POST', 'https://developer.mozilla.org/post', true);
    xhr.onreadystatechange = function () {
      if(xhr.readyState === 4 && xhr.status === 200) {
        expect(xhr.responseText).toBe('developer.mozilla.org.post');
        done();
      }
    };
    xhr.send(null);
  });
});
