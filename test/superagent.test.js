import * as superagent from 'superagent/dist/superagent.js';
import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForUnitTest('xhr');

describe('mock superagent request', () => {
  it('mock url[www.superagent.com/get] should match get request[http://www.superagent.com/get]', (done) => {
    mocker.mock({
      url: 'www.superagent.com/get',
      method: 'get',
      data: { ret: 0, msg: 'string'},
      header: {
        'content-type': 'application/json', // response data to json
      }
    });

    superagent.get('http://www.superagent.com/get', (err, res) => {
        expect(res.body).toMatchObject({ ret: 0, msg: 'string'});
        done();
      });
  });

  it('mock url[www.superagent.com/post] should match post request[http://www.superagent.com/post]', (done) => {
    mocker.mock({
      url: 'www.superagent.com/post',
      method: 'post',
      data: { ret: 0, msg: 'post'},
      header: {
        'content-type': 'application/json', // response data to json
      }
    });

    superagent.post('http://www.superagent.com/post', (err, res) => {
      expect(res.text).toBe(JSON.stringify({ ret: 0, msg: 'post'}));
      done();
    }, 'json');
  });
});

