import jquery from 'jquery';
import HttpRequestMock from '../src/index';


const mocker = HttpRequestMock.setupForUnitTest('xhr');

describe('mock jquery request', () => {
  it('mock url[www.jquery.com/get] should match get request[http://www.jquery.com/get]', (done) => {
    mocker.mock({
      url: 'www.jquery.com/get',
      method: 'get',
      data: { ret: 0, msg: 'string'}
    });

    jquery.getJSON('http://www.jquery.com/get', res => {
      expect(res).toMatchObject({ ret: 0, msg: 'string'});
      done();
    });
  });

  it('mock url[www.jquery.com/post] should match post request[http://www.jquery.com/post]', (done) => {
    mocker.mock({
      url: 'www.jquery.com/post',
      method: 'post',
      data: { ret: 0, msg: 'post'}
    });

    jquery.post('http://www.jquery.com/post', res => {
      expect(res).toMatchObject({ ret: 0, msg: 'post'});
      done();
    }, 'json');
  });
});

