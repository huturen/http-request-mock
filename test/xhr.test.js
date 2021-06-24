import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForUnitTest('xhr');
const xhrRequest = (method, url, data = null, callback = () => {}) => {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url);
  xhr.onreadystatechange = function () {
    callback(xhr);
  };
  xhr.send(data);
};
const xhrPromise = (url, method) => new Promise(resolve => {
  xhrRequest(method, url, null, xhr =>{
    resolve(xhr.responseText);
  });
});

describe('mock XMLHttpRequest raw request', () => {
  it('mock url[xhr.api.org/string] should match request[http://xhr.api.org/string]', (done) => {
    mocker.get('xhr.api.org/string', 'xhr.api.org');

    xhrRequest('GET', 'https://xhr.api.org/string', null, xhr =>{
      expect(xhr.readyState).toBe(4);
      expect(xhr.status).toBe(200);
      expect(xhr.responseText).toBe('xhr.api.org');
      done();
    });
  });

  it('mock url[/^.*\/regexp$/] should match request[http://xhr.api.org/xhr/regexp]', (done) => {
    mocker.post('xhr.api.org/regexp', 'xhr.api.org.regexp');

    xhrRequest('POST', 'https://xhr.api.org/regexp', null, xhr =>{
      expect(xhr.readyState).toBe(4);
      expect(xhr.status).toBe(200);
      expect(xhr.responseText).toBe('xhr.api.org.regexp');
      done();
    });
  });

  it('the delay mock request should be returned in 100 ms', (done) => {
    mocker.post('xhr.api.org/delay', 'xhr.api.org.post', 100);

    let result = null;
    xhrRequest('POST', 'https://xhr.api.org/delay', null, xhr =>{
      result = 'xhr.api.org.post';
    });

    setTimeout(() => expect(result).toBe(null), 10);
    setTimeout(() => {
      expect(result).toBe('xhr.api.org.post');
      done();
    }, 100 + 10); // gap 10ms
  });

  it('methods(get|post|put|patch|delete) should be mocked correctly', (done) => {
    mocker.get('https://xhr.api.org/get', 'get');
    mocker.post('https://xhr.api.org/post', 'post');
    mocker.put('https://xhr.api.org/put', 'put');
    mocker.patch('https://xhr.api.org/patch', 'patch');
    mocker.delete('https://xhr.api.org/delete', 'delete');

    Promise.all([
      xhrPromise('https://xhr.api.org/get', 'get').then(res => res),
      xhrPromise('https://xhr.api.org/post', 'post').then(res => res),
      xhrPromise('https://xhr.api.org/put', 'put').then(res => res),
      xhrPromise('https://xhr.api.org/patch', 'patch').then(res => res),
      xhrPromise('https://xhr.api.org/delete', 'delete').then(res => res),
    ]).then(res => {
      expect(res).toMatchObject(['get', 'post', 'put', 'patch', 'delete']);
      done();
    });
  });

  it('request https://xhr.api.org/status404  should return 404', (done) => {
    mocker.get('https://xhr.api.org/status404', 'xhr.api.org', 0, 404);

    xhrRequest('GET', 'https://xhr.api.org/status404', null, xhr =>{
      expect(xhr.readyState).toBe(4);
      expect(xhr.status).toBe(404);
      done();
    });
  });

  it('request https://xhr.api.org/headers should match customized headers', (done) => {
    mocker.get('https://xhr.api.org/headers', 'xhr.api.org', 0, 200, {
      custom: 'a-customized-header',
      another: 'another-header'
    });

    xhrRequest('GET', 'https://xhr.api.org/headers', null, xhr =>{
      expect(xhr.readyState).toBe(4);
      expect(xhr.status).toBe(200);
      expect(xhr.getResponseHeader('custom')).toBe('a-customized-header');
      expect(xhr.getResponseHeader('another')).toBe('another-header');
      expect(xhr.getResponseHeader('is-mock')).toBe('yes');

      const allHeaders = xhr.getAllResponseHeaders();
      expect(allHeaders.includes('custom')).toBe(true);
      expect(allHeaders.includes('another')).toBe(true);
      expect(allHeaders.includes('is-mock')).toBe(true);
      done();
    });
  });

  it('request https://xhr.api.org/function should get different result between two requests', async (done) => {
    let index = 0;
    mocker.mock({
      url: 'https://xhr.api.org/function',
      method: 'any',
      data: () => {
        index = index + 1;
        return 'data'+index;
      }
    });

    await xhrPromise('https://xhr.api.org/function').then(res => {
      expect(res).toBe('data1');
    });
    await xhrPromise('https://xhr.api.org/function').then(res => {
      expect(res).toBe('data2');
      done();
    });
  });
});
