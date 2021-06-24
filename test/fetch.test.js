import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForUnitTest('fetch');

describe('mock fetch request', () => {
  it('mock url[www.api.com/fetch/abc] should match request[http://www.api.com/fetch/abc]', (done) => {
    mocker.mock({
      url: 'www.api.com/fetch/abc',
      method: 'get',
      data: { ret: 0, msg: 'string'}
    });

    fetch('http://www.api.com/fetch/abc').then(res => {
      return res.json();
    }).then(json => {
      expect(json).toMatchObject({ ret: 0, msg: 'string'});
      done();
    });
  });

  it('mock url[/^.*\/regexp$/] should match request[http://www.api.com/fetch/regexp]', (done) => {
    mocker.mock({
      url: /^.*\/regexp$/,
      method: 'get',
      data: { ret: 0, msg: 'regexp'}
    });

    fetch('http://www.api.com/fetch/regexp').then(res => {
      return res.json();
    }).then(json => {
      expect(json).toMatchObject({ ret: 0, msg: 'regexp'});
      done();
    });
  });

  it('the delay mock request[http://www.api.com/fetch/delay] should be returned in 100 ms', (done) => {
    mocker.mock({
      url: 'http://www.api.com/fetch/delay',
      method: 'any',
      delay: 100,
      data: { ret: 0, msg: 'delay'}
    });

    let result = null;
    fetch('http://www.api.com/fetch/delay').then(res => {
      return res.json();
    }).then(json => {
      result = json;
      done();
    });
    setTimeout(() => expect(result).toBe(null), 10);
    setTimeout(() => {
      expect(result).toMatchObject({ ret: 0, msg: 'delay'});
      done();
    }, 100 + 10); // gap 10ms
  });

  it('methods(get|post|put|patch|delete) should be mocked correctly', (done) => {
    mocker.get('http://www.api.com/fetch/get', 'get');
    mocker.post('http://www.api.com/fetch/post', 'post');
    mocker.put('http://www.api.com/fetch/put', 'put');
    mocker.patch('http://www.api.com/fetch/patch', 'patch');
    mocker.delete('http://www.api.com/fetch/delete', 'delete');

    Promise.all([
      fetch('http://www.api.com/fetch/get', { method: 'get' }).then(res => res.text()),
      fetch('http://www.api.com/fetch/post', { method: 'post' }).then(res => res.text()),
      fetch('http://www.api.com/fetch/put', { method: 'put' }).then(res => res.text()),
      fetch('http://www.api.com/fetch/patch', { method: 'patch' }).then(res => res.text()),
      fetch('http://www.api.com/fetch/delete', { method: 'delete' }).then(res => res.text()),
    ]).then(res => {
      expect(res).toMatchObject(['get', 'post', 'put', 'patch', 'delete']);
      done();
    });
  });

  it('request http://www.api.com/fetch/status404 should return 404', (done) => {
    mocker.mock({
      url: 'http://www.api.com/fetch/status404',
      method: 'any',
      status: 404,
      data: 'not found'
    });

    fetch('http://www.api.com/fetch/status404').then(res => {
      expect(res.status).toBe(404);
      done();
    });
  });

  it('request http://www.api.com/fetch/headers should match customized headers', (done) => {
    mocker.mock({
      url: 'http://www.api.com/fetch/headers',
      method: 'any',
      data: 'headers',
      header: {
        custom: 'a-customized-header',
        another: 'another-header'
      }
    });

    fetch('http://www.api.com/fetch/headers').then(res => {
      expect(res.status).toBe(200);
      if (res.headers instanceof Headers) {
        expect(res.headers.get('custom')).toBe('a-customized-header');
        expect(res.headers.get('another')).toBe('another-header');
        expect(res.headers.get('is-mock')).toBe('yes');
      } else {
        expect(res.headers).toMatchObject({
          custom: 'a-customized-header',
          another: 'another-header',
          'is-mock': 'yes',
        });
      }
      done();
    });
  });

  it('request http://www.api.com/fetch/function should get different result between two requests', async (done) => {
    let index = 0;
    mocker.mock({
      url: 'http://www.api.com/fetch/function',
      method: 'any',
      data: () => {
        index = index + 1;
        return 'data'+index;
      }
    });


    await fetch('http://www.api.com/fetch/function').then(res => {
      res.text().then(text => expect(text).toBe('data1'));
    });
    await fetch('http://www.api.com/fetch/function').then(res => {
      res.text().then(text => {
        expect(text).toBe('data2');
        done();
      });
    });
  });
});

