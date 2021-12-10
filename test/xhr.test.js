import { expect } from '@jest/globals';
import FakeXMLHttpRequest from '../src/fallback/xhr';
import HttpRequestMock from '../src/index';

global.XMLHttpRequest = undefined; // do not use XMLHttpRequest in jsdom
const mocker = HttpRequestMock.setupForUnitTest('xhr');

const request = (url, method = 'get', opts = {}) => {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for(let key in opts) {
      xhr[key] = opts[key];
    }
    xhr.onreadystatechange = function () {
      resolve({
        xhr,
        data: xhr.response,
        status: xhr.status,
        headers: xhr.getAllResponseHeaders().split(/\r\n/).reduce((res, item) => {
          const [key, val] = item.split(':');
          if (!key || !val) {
            return res;
          }
          res[key.trim()] = val.trim();
          return res;
        }, {})
      });
    };
    xhr.onloadend = function(){
      void(0);
    };
    xhr.send(opts.body || null);
  });
};

describe('mock xhr requests', () => {
  it('url config item should support partial matching', async () => {
    mocker.get('www.api.com/partial', 'get content');
    mocker.post('www.api.com/partial', 'post content');

    const res = await Promise.all([
      request('http://www.api.com/partial', 'get').then(res => res.data),
      request('https://www.api.com/partial', 'post').then(res => res.data),
      request('https://www.api.com/partial?abc=xyz', 'get').then(res => res.data),
      request('https://www.api.com/partial-other', 'post').then(res => res.data),
    ]);
    expect(res).toMatchObject([
      'get content', 'post content', 'get content', 'post content'
    ]);
  });

  it('url config item should support RegExp matching', async () => {
    mocker.any(/^.*\/regexp\b/, '<xml>regexp</xml>');

    const res = await request('http://www.api.com/regexp?a=1', 'get', { responseType: 'text' });
    expect(res.xhr.responseURL).toBe('http://www.api.com/regexp?a=1');

    expect(res.xhr.responseXML).toBe(null);
    expect(res.data).toBe('<xml>regexp</xml>');
  });

  it('delay config item should support a delayed response', (done) => {
    mocker.mock({
      url: 'http://www.api.com/delay',
      delay: 101,
      body: { ret: 0, msg: 'delay' },
    });

    const time = Date.now();
    request('http://www.api.com/delay').then(() => {
      expect(Date.now() - time).toBeGreaterThanOrEqual(100);
      done();
    });
  });

  it('status config itme should support to customize http status code response', (done) => {
    mocker.mock({
      url: 'http://www.api.com/status404',
      status: 404,
      body: 'not found'
    });

    request('http://www.api.com/status404').then(res => {
      expect(res.status).toBe(404);
      expect(res.data).toBe('not found');
      done();
    });
  });

  it('method config itme should support to mock a GET|POST|PUT|PATCH|DELETE http request', async () => {
    mocker.get('http://www.api.com/get', 'get');
    mocker.post('http://www.api.com/post', 'post');
    mocker.put('http://www.api.com/put', 'put');
    mocker.patch('http://www.api.com/patch', 'patch');
    mocker.delete('http://www.api.com/delete', 'delete');
    mocker.head('http://www.api.com/head');

    mocker.mock({method: 'get', url: 'http://www.api.com/method-get', body: 'method-get'});
    mocker.mock({method: 'post', url: 'http://www.api.com/method-post', body: 'method-post'});
    mocker.mock({method: 'put', url: 'http://www.api.com/method-put', body: 'method-put'});
    mocker.mock({method: 'patch', url: 'http://www.api.com/method-patch', body: 'method-patch'});
    mocker.mock({method: 'delete', url: 'http://www.api.com/method-delete', body: 'method-delete'});
    mocker.mock({method: 'head', url: 'http://www.api.com/method-head', body: ''});

    const res = await Promise.all([
      request('http://www.api.com/get', 'get').then(res => res.data),
      request('http://www.api.com/post', 'post').then(res => res.data),
      request('http://www.api.com/put', 'put').then(res => res.data),
      request('http://www.api.com/patch', 'patch').then(res => res.data),
      request('http://www.api.com/delete', 'delete').then(res => res.data),
      request('http://www.api.com/head', 'head').then(res => res.data),

      request('http://www.api.com/method-get', 'get').then(res => res.data),
      request('http://www.api.com/method-post', 'post').then(res => res.data),
      request('http://www.api.com/method-put', 'put').then(res => res.data),
      request('http://www.api.com/method-patch', 'patch').then(res => res.data),
      request('http://www.api.com/method-delete', 'delete').then(res => res.data),
      request('http://www.api.com/method-head', 'head').then(res => res.data),
    ]);

    expect(res).toMatchObject([
      'get', 'post', 'put', 'patch', 'delete', '',
      'method-get', 'method-post', 'method-put', 'method-patch', 'method-delete', ''
    ]);
  });

  it('header config itme should support to customize response headers', async () => {
    mocker.mock({
      url: 'http://www.api.com/headers',
      method: 'any',
      body: 'headers',
      header: {
        custom: 'a-customized-header',
        another: 'another-header'
      }
    });

    const res = await request('http://www.api.com/headers');
    expect(res.xhr.getResponseHeader('x-powered-by')).toBe('http-request-mock');
    expect(res.status).toBe(200);
    expect(res.headers).toMatchObject({
      custom: 'a-customized-header',
      another: 'another-header',
      'x-powered-by': 'http-request-mock',
    });
  });

  it('mock response should support to customize data types', async () => {
    mocker.any('http://www.api.com/string', 'string');
    mocker.any('http://www.api.com/object', {obj: 'yes'});
    mocker.any('http://www.api.com/strobj', '{"obj": "yes"}');
    mocker.any('http://www.api.com/bad-strobj', '{"obj": "yes"');
    mocker.any('http://www.api.com/blob', new Blob(['test-blob']));
    mocker.any('http://www.api.com/arraybuffer', new ArrayBuffer(8));

    const res = await Promise.all([
      request('http://www.api.com/string', 'get').then(res => res.data),
      request('http://www.api.com/object', 'post', {responseType: 'json' }).then(res => res.data),
      request('http://www.api.com/strobj', 'post', {responseType: 'json' }).then(res => res.data),
      request('http://www.api.com/bad-strobj', 'post', {responseType: 'json' }).then(res => res.data),
      request('http://www.api.com/blob', 'get', {responseType: 'blob' }).then(res => res.data),
      request('http://www.api.com/arraybuffer', 'get', {responseType: 'arraybuffer' }).then(res => res.data),
    ]);
    expect(res[0]).toBe('string');
    expect(res[1]).toMatchObject({obj: 'yes'});
    expect(res[2]).toMatchObject({obj: 'yes'});
    expect(res[3]).toBe(null);
    expect(res[4]).toBeInstanceOf(Blob);
    expect(res[5]).toBeInstanceOf(ArrayBuffer);

    // for document
    global.Document = function(){
      void(0);
    };
    mocker.any(/^.*\/document-regexp$/, new Document());
    const res2 = await request('http://www.api.com/document-regexp', 'get', { responseType: 'document' });
    expect(res2.xhr.responseURL).toBe('http://www.api.com/document-regexp');

    expect(res2.xhr.responseXML).toBeInstanceOf(global.Document);
    expect(res2.data).toBeInstanceOf(global.Document);
  });

  it('mock response function should support to get request info', async () => {
    let requestInfo = {};
    mocker.mock({
      url: 'http://www.api.com/request-info',
      method: 'get',
      body: (reqInfo) => {
        requestInfo = reqInfo;
        return requestInfo;
      }
    });

    await request('http://www.api.com/request-info?arg1=111&arg2=222');
    expect(requestInfo.url).toBe('http://www.api.com/request-info?arg1=111&arg2=222');
    expect(/^get$/i.test(requestInfo.method)).toBe(true);
  });

  it('mock response should support synchronized function', async () => {
    let index = 0;
    mocker.mock({
      url: 'http://www.api.com/function',
      method: 'any',
      body: () => {
        index = index + 1;
        return 'data'+index;
      }
    });

    const res1 = await request('http://www.api.com/function');
    const res2 = await request('http://www.api.com/function');
    expect(res1.data).toBe('data1');
    expect(res2.data).toBe('data2');
  });

  it('mock response should support asynchronous function', async () => {
    let index = 0;
    mocker.mock({
      url: 'http://www.api.com/async-function',
      body: async () => {
        await new Promise(resolve => setTimeout(resolve, 101));
        index = index + 1;
        return 'data'+index;
      }
    });

    const now = Date.now();
    const res1 = await request('http://www.api.com/async-function');
    expect(Date.now() - now).toBeGreaterThanOrEqual(100);

    const res2 = await request('http://www.api.com/async-function');
    expect(Date.now() - now).toBeGreaterThanOrEqual(200);

    expect(res1.data).toBe('data1');
    expect(res2.data).toBe('data2');
  });

  it('xhr object should have a requestInfo property', async () => {
    mocker.mock({
      url: 'http://www.api.com/xhr-requestInfo',
      body: 'xhr-requestInfo'
    });

    await new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      expect(xhr).toBeInstanceOf(FakeXMLHttpRequest);
      xhr.open('post', 'http://www.api.com/xhr-requestInfo');
      xhr.onreadystatechange = function () {
        expect(xhr.requestInfo).toBeTruthy();
        expect(xhr.requestInfo.body).toMatchObject({test: 1});
        resolve();
      };
      xhr.send('{"test": 1}');
    });
    await new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.open('post', 'http://www.api.com/xhr-requestInfo');
      xhr.onreadystatechange = function () {
        expect(xhr.requestInfo).toBeTruthy();
        expect(xhr.requestInfo.body).toBe('{test: 1}');
        resolve();
      };
      xhr.send('{test: 1}'); // faled to parse
    });
    await new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.open('post', 'http://www.api.com/xhr-requestInfo');
      xhr.onreadystatechange = function () {
        expect(xhr.requestInfo).toBeTruthy();
        expect(xhr.requestInfo.body).toBe('test: 1');
        resolve();
      };
      xhr.send('test: 1'); // faled to parse
    });
  });

  it('instance of FakeXMLHttpRequest should have some necessary properties.', async () => {
    const fake = new FakeXMLHttpRequest();
    fake.open('get', 'http://fake.api.com');
    expect(fake.open).toBeTruthy();
    expect(fake.send).toBeTruthy();
    expect(fake.setRequestHeader).toBeTruthy();
    expect(fake.getAllResponseHeaders).toBeTruthy();
    expect(fake.getResponseHeader).toBeTruthy();

    expect(fake.readyState).not.toBe(undefined);
    expect(fake.status).not.toBe(undefined);
    expect(fake.statusText).not.toBe(undefined);
    expect(fake.response).not.toBe(undefined);
    expect(fake.responseText).not.toBe(undefined);
    expect(fake.responseURL).not.toBe(undefined);
    expect(fake.responseXML).not.toBe(undefined);
  });
});
