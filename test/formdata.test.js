import axios from 'axios';
import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForUnitTest('xhr');


// https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData
describe('form data', () => {
  it('http-request-mock should support FormData', async () => {
    mocker.mock({
      url: 'http://www.test.com/services/oauth2/token',
      method: 'post',
      status: 200,
      body: async (requestInfo) => {
        console.log('I am intercepted: ', requestInfo.url, requestInfo.body);
        // expect('foo').toEqual('bar');
        return { testToken: 'test' };
      },
    });

    const formData = new FormData();
    formData.append('username', 'Chris');

    const { data } = await axios({
      method: 'post',
      url: 'http://www.test.com/services/oauth2/token',
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 1000,
      data: formData,
    });
    console.log('data:', data);
    expect(data).toMatchObject({ testToken: 'test' });
  });

});
