import axios from 'axios';
import XhrResonseMock from '../src/index';

XhrResonseMock.mockXMLHttpRequest();

const mock = XhrResonseMock.init();

describe('mock axios request', () => {
  it('string url should match the mock request', (done) => {
    mock.doMock({
      url: 'http://www.api.com/abc',
      method: 'get',
      data: { ret: 0, msg: 'string'}
    });

    axios.get('http://www.api.com/abc').then(res => {
      expect(res.data).toMatchObject({ ret: 0, msg: 'string'});
      done();
    });
  });

  it('regexp url should match the mock request', (done) => {
    mock.doMock({
      url: /^.*\/xyz$/,
      method: 'get',
      data: { ret: 0, msg: 'regexp'}
    });

    axios.get('http://www.api.com/xyz').then(res => {
      expect(res.data).toMatchObject({ ret: 0, msg: 'regexp'});
      done();
    });
  });

  it('the delay the mock request should be returned in 10 ms', (done) => {
    mock.doMock({
      url: 'http://www.api.com/delay',
      method: 'post',
      delay: 15,
      data: { ret: 0, msg: 'delay'}
    });

    let result = null;
    axios.post('http://www.api.com/delay', {}).then(res => {
      result = res.data
    });
    setTimeout(() => expect(result).toBe(null), 10);
    setTimeout(() => {
      expect(result).toMatchObject({ ret: 0, msg: 'delay'});
      done();
    }, 15 + 10); // gap 10ms
  });

  it('methods(get|post|put|patch|delete) should be mocked', (done) => {
    mock.get('http://www.api.com/get', 'get');
    mock.post('http://www.api.com/post', 'post');
    mock.put('http://www.api.com/put', 'put');
    mock.patch('http://www.api.com/patch', 'patch');
    mock.delete('http://www.api.com/delete', 'delete');

    Promise.all([
      axios.get('http://www.api.com/get').then(res => res.data),
      axios.post('http://www.api.com/post').then(res => res.data),
      axios.put('http://www.api.com/put').then(res => res.data),
      axios.patch('http://www.api.com/patch').then(res => res.data),
      axios.delete('http://www.api.com/delete').then(res => res.data),
    ]).then(res => {
      expect(res).toMatchObject(['get', 'post', 'put', 'patch', 'delete']);
      done();
    });
  });
});

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
