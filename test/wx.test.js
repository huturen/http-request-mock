import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForUnitTest('wx.request');

const wxrequest = (url, method) => new Promise(resolve => {
  wx.request({ url, method, success: res => {
    resolve(res);
  }});
});

describe('mock wx.request request', () => {
  it('mock url[wx.api.com/abc] should match request[http://wx.api.com/abc]', (done) => {
    mocker.mock({
      url: 'wx.api.com/abc',
      method: 'get',
      data: { ret: 0, msg: 'string'}
    });

    wxrequest('http://wx.api.com/abc').then(res => {
      expect(res.data).toMatchObject({ ret: 0, msg: 'string'});
      done();
    });
  });

  it('mock url[/^.*\/regexp$/] should match request[http://wx.api.com/regexp]', (done) => {
    mocker.mock({
      url: /^.*\/regexp$/,
      method: 'get',
      data: { ret: 0, msg: 'regexp'}
    });

    wxrequest('http://wx.api.com/regexp').then(res => {
      expect(res.data).toMatchObject({ ret: 0, msg: 'regexp'});
      done();
    });
  });

  it('the delay mock request[http://wx.api.com/delay] should be returned in 100 ms', (done) => {
    mocker.mock({
      url: 'http://wx.api.com/delay',
      method: 'any',
      delay: 100,
      data: { ret: 0, msg: 'delay'}
    });

    let result = null;
    wxrequest('http://wx.api.com/delay').then(res => {
      result = res.data;
      done();
    });
    setTimeout(() => expect(result).toBe(null), 10);
    setTimeout(() => {
      expect(result).toMatchObject({ ret: 0, msg: 'delay'});
      done();
    }, 100 + 10); // gap 10ms
  });

  it('methods(get|post|put|patch|delete) should be mocked correctly', (done) => {
    mocker.get('http://wx.api.com/get', 'get');
    mocker.post('http://wx.api.com/post', 'post');
    mocker.put('http://wx.api.com/put', 'put');
    mocker.patch('http://wx.api.com/patch', 'patch');
    mocker.delete('http://wx.api.com/delete', 'delete');

    Promise.all([
      wxrequest('http://wx.api.com/get', 'get').then(res => res.data),
      wxrequest('http://wx.api.com/post', 'post').then(res => res.data),
      wxrequest('http://wx.api.com/put', 'put').then(res => res.data),
      wxrequest('http://wx.api.com/patch', 'patch').then(res => res.data),
      wxrequest('http://wx.api.com/delete', 'delete').then(res => res.data),
    ]).then(res => {
      expect(res).toMatchObject(['get', 'post', 'put', 'patch', 'delete']);
      done();
    });
  });

  it('request http://wx.api.com/status404 should return 404', (done) => {
    mocker.mock({
      url: 'http://wx.api.com/status404',
      method: 'any',
      status: 404,
      data: 'not found'
    });

    wxrequest('http://wx.api.com/status404').then(res => {
      expect(res.statusCode).toBe(404);
      done();
    });
  });

  it('request http://wx.api.com/headers should match customized headers', (done) => {
    mocker.mock({
      url: 'http://wx.api.com/headers',
      method: 'any',
      data: 'headers',
      header: {
        custom: 'a-customized-header',
        another: 'another-header'
      }
    });

    wxrequest('http://wx.api.com/headers').then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.header).toMatchObject({
        custom: 'a-customized-header',
        another: 'another-header',
        'is-mock': 'yes',
      });
      done();
    });
  });

  it('request http://wx.api.com/function should get different result between two requests', async (done) => {
    let index = 0;
    mocker.mock({
      url: 'http://wx.api.com/function',
      method: 'any',
      data: () => {
        index = index + 1;
        return 'data'+index;
      }
    });

    await wxrequest('http://wx.api.com/function').then(res => {
      expect(res.data).toBe('data1');
    });
    await wxrequest('http://wx.api.com/function').then(res => {
      expect(res.data).toBe('data2');
      done();
    });
  });
});

