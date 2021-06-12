import axios from 'axios';
import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForUnitTest('xhr');

describe('mock axios request', () => {
  it('string url[www.api.com/axios/abc] should match request[http://www.api.com/axios/abc]', (done) => {
    mocker.mock({
      url: 'www.api.com/axios/abc',
      method: 'get',
      data: { ret: 0, msg: 'string'}
    });

    axios.get('http://www.api.com/axios/abc').then(res => {
      expect(res.data).toMatchObject({ ret: 0, msg: 'string'});
      done();
    });
  });

  it('regexp url[/^.*\/regexp$/] should match request[http://www.api.com/axios/regexp]', (done) => {
    mocker.mock({
      url: /^.*\/regexp$/,
      method: 'get',
      data: { ret: 0, msg: 'regexp'}
    });

    axios.get('http://www.api.com/axios/regexp').then(res => {
      expect(res.data).toMatchObject({ ret: 0, msg: 'regexp'});
      done();
    });
  });

  it('the delay mock request[http://www.api.com/axios/delay] should be returned in 100 ms', (done) => {
    mocker.mock({
      url: 'http://www.api.com/axios/delay',
      method: 'post',
      delay: 100,
      data: { ret: 0, msg: 'delay'}
    });

    let result = null;
    axios.post('http://www.api.com/axios/delay', {}).then(res => {
      result = res.data
    });
    setTimeout(() => expect(result).toBe(null), 10);
    setTimeout(() => {
      expect(result).toMatchObject({ ret: 0, msg: 'delay'});
      done();
    }, 100 + 10); // gap 10ms
  });

  it('methods(get|post|put|patch|delete) should be mocked correctly', (done) => {
    mocker.get('http://www.api.com/axios/get', 'get');
    mocker.post('http://www.api.com/axios/post', 'post');
    mocker.put('http://www.api.com/axios/put', 'put');
    mocker.patch('http://www.api.com/axios/patch', 'patch');
    mocker.delete('http://www.api.com/axios/delete', 'delete');

    Promise.all([
      axios.get('http://www.api.com/axios/get').then(res => res.data),
      axios.post('http://www.api.com/axios/post').then(res => res.data),
      axios.put('http://www.api.com/axios/put').then(res => res.data),
      axios.patch('http://www.api.com/axios/patch').then(res => res.data),
      axios.delete('http://www.api.com/axios/delete').then(res => res.data),
    ]).then(res => {
      expect(res).toMatchObject(['get', 'post', 'put', 'patch', 'delete']);
      done();
    });
  });

  it('request http://www.api.com/axios/status404 should return 404', (done) => {
    mocker.mock({
      url: 'http://www.api.com/axios/status404',
      method: 'any',
      status: 404,
      data: 'not found'
    });

    axios.post('http://www.api.com/axios/status404', {}).catch(err => {
      expect(err.message).toBe('Request failed with status code 404');
      expect(err.response.status).toBe(404);
      expect(err.response.data).toBe('not found');
      done();
    });
  });

  it('request http://www.api.com/axios/headers should match customized headers', (done) => {
    mocker.mock({
      url: 'http://www.api.com/axios/headers',
      method: 'any',
      data: 'headers',
      header: {
        custom: 'a-customized-header',
        another: 'another-header'
      }
    });

    axios.get('http://www.api.com/axios/headers').then(res => {
      expect(res.status).toBe(200);
      expect(res.headers).toMatchObject({
        custom: 'a-customized-header',
        another: 'another-header',
        'is-mock': 'yes',
      });
      done();
    });
  });

  it('request http://www.api.com/axios/function should get different result between two requests', (done) => {
    let index = 0;
    mocker.mock({
      url: 'http://www.api.com/axios/function',
      method: 'any',
      data: () => {
        index = index + 1;
        return 'data'+index;
      }
    });

    axios.get('http://www.api.com/axios/function').then(res => {
      expect(res.data).toBe('data1');

      axios.post('http://www.api.com/axios/function').then(res => {
        expect(res.data).toBe('data2');
        done();
      });
    });
  });
});

