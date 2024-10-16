import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForUnitTest('fetch');

const request = (url, method = 'get', opts = {}) => {
  return new Promise((resolve, reject) => {
    fetch(url, { url, method, ...opts }).then(async res => {
      const text = await res.text();
      const json = await res.json();
      const blob = await res.blob();
      const arrayBuffer = await res.arrayBuffer();
      resolve({
        data: text,
        status: res.status,
        text: () => text,
        json: () => json,
        blob: () => blob,
        arrayBuffer: () => arrayBuffer,
        headers: [...res.headers].reduce((res, item) => {
          const [key, val] = item;
          res[key] = val;
          return res;
        }, {})
      });
    }).catch(reject);
  });
};

describe('mock fetch requests for browser envrioment', () => {
  it('url config item should support partial matching', async () => {
    mocker.get('www.api.com/partial', 'get content');
    mocker.post('www.api.com/partial', 'post content');

    const res = await Promise.all([
      request('http://www.api.com/partial', 'get').then(res => res.text()),
      request('https://www.api.com/partial', 'post').then(res => res.text()),
      request('https://www.api.com/partial?abc=xyz', 'get').then(res => res.text()),
      request('https://www.api.com/partial-other', 'post').then(res => res.text()),
    ]);
    expect(res).toMatchObject([
      'get content', 'post content', 'get content', 'post content'
    ]);
  });

  it('response of fetch should contain necessary properties of Response', async () => {
    mocker.get('http://www.api.com/fetch-response', 'get content');
    const originalHeaders = global.Headers;
    const originalBlob = global.Blob;
    global.Headers = undefined;
    global.Blob = undefined;
    const res = await fetch('http://www.api.com/partial');
    expect(res.json().then).toBeTruthy();
    expect(res.arrayBuffer().then).toBeTruthy();
    expect(res.blob().then).toBeTruthy();
    expect(res.formData().then).toBeTruthy();
    expect(res.text().then).toBeTruthy();
    expect(res.clone()).toBeTruthy();
    expect(res.error()).toBeTruthy();
    expect(res.redirect()).toBeTruthy();
    global.Headers = originalHeaders;
    global.Blob = originalBlob;

    global.Response = function(){
      // fake it, not use it.
    };
    const res2 = await fetch('http://www.api.com/partial');
    expect(res2 instanceof global.Response).toBe(true);
    global.Response = undefined;
  });

  it('url config item should support RegExp matching', async () => {
    mocker.any(/^.*\/regexp$/, { ret: 0, msg: 'regexp'});

    const res = await request('http://www.api.com/regexp');
    expect(res.json()).toMatchObject({ ret: 0, msg: 'regexp'});
  });

  it('delay config item should support a delayed response', (done) => {
    mocker.mock({
      url: 'http://www.api.com/delay',
      delay: 101,
      body: { ret: 0, msg: 'delay'}
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
      expect(res.text()).toBe('not found');
      done();
    });
  });

  it('method config itme should support to mock a GET|POST|PUT|PATCH|DELETE http request', async () => {
    mocker.get('http://www.api.com/get', 'get');
    mocker.post('http://www.api.com/post', 'post');
    mocker.put('http://www.api.com/put', 'put');
    mocker.patch('http://www.api.com/patch', 'patch');
    mocker.delete('http://www.api.com/delete', 'delete');

    mocker.mock({method: 'get', url: 'http://www.api.com/method-get', body: 'method-get'});
    mocker.mock({method: 'post', url: 'http://www.api.com/method-post', body: 'method-post'});
    mocker.mock({method: 'put', url: 'http://www.api.com/method-put', body: 'method-put'});
    mocker.mock({method: 'patch', url: 'http://www.api.com/method-patch', body: 'method-patch'});
    mocker.mock({method: 'delete', url: 'http://www.api.com/method-delete', body: 'method-delete'});

    const res = await Promise.all([
      request('http://www.api.com/get', 'get').then(res => res.data),
      request('http://www.api.com/post', 'post').then(res => res.data),
      request('http://www.api.com/put', 'put').then(res => res.data),
      request('http://www.api.com/patch', 'patch').then(res => res.data),
      request('http://www.api.com/delete', 'delete').then(res => res.data),

      request('http://www.api.com/method-get', 'get').then(res => res.data),
      request('http://www.api.com/method-post', 'post').then(res => res.data),
      request('http://www.api.com/method-put', 'put').then(res => res.data),
      request('http://www.api.com/method-patch', 'patch').then(res => res.data),
      request('http://www.api.com/method-delete', 'delete').then(res => res.data),
    ]);

    expect(res).toMatchObject([
      'get', 'post', 'put', 'patch', 'delete',
      'method-get', 'method-post', 'method-put', 'method-patch', 'method-delete',
    ]);
  });

  it('should support to customize response headers', async () => {
    mocker.mock({
      url: 'http://www.api.com/headers',
      method: 'any',
      body: 'headers',
      headers: {
        custom: 'a-customized-header',
        another: 'another-header'
      }
    });

    const res = await request('http://www.api.com/headers');
    expect(res.status).toBe(200);
    expect(res.headers).toMatchObject({
      custom: 'a-customized-header',
      another: 'another-header',
      'x-powered-by': 'http-request-mock',
    });
  });

  it('mock response item should support to customize data types', async () => {
    mocker.any('http://www.api.com/string', 'string');
    mocker.any('http://www.api.com/object', {obj: 'yes'});
    mocker.any('http://www.api.com/blob', new Blob(['test-blob']));
    mocker.any('http://www.api.com/arraybuffer', new ArrayBuffer(8));


    const res = await Promise.all([
      request('http://www.api.com/string', 'get').then(res => res.text()),
      request('http://www.api.com/object', 'post', {responseType: 'json' }).then(res => res.json()),
      request('http://www.api.com/blob', 'get', {responseType: 'blob' }).then(res => res.blob()),
      request('http://www.api.com/arraybuffer', 'get', {responseType: 'arraybuffer' }).then(
        res => res.arrayBuffer()
      ),
    ]);
    expect(res[0]).toBe('string');
    expect(res[1]).toMatchObject({obj: 'yes'});
    expect(res[2]).toBeInstanceOf(Blob);
    expect(res[3]).toBeInstanceOf(ArrayBuffer);
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

  it('when setting a timeout, fetch should throw an exception if the request times out', async () => {
    mocker.mock({
      url: 'http://example.com/some/api',
      method: 'post',
      delay: 3000, // 3 seconds
      body: () => 'some mock response'
    });

    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => controller.abort(), 1000);

    const res = await fetch('http://example.com/some/api', { method: 'post', signal })
      .then(res => res.text())
      .catch(err => {
        console.log('Expected error due to timeout: ', err.message);
        return 'an error should be caught';
      });
    console.log('res:', res);
    expect(res).toBe('an error should be caught');
  });

  it('should support URL objects being passed into fetch', async () => {
    mocker.get('http://example.com/some/other/api', 'get content');
    const res = await fetch(new URL('http://example.com/some/other/api'), {
      method: 'get',
    }).then((res) => res.text());
    expect(res).toBe('get content');
  });
});
