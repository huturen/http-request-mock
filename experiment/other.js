// run `npm run build` before running the command below
// npm run build && node experiment/other.js
const HttpRequestMock = require('../dist/index').default;
// const HttpRequestMock = require('http-request-mock').default;
const mocker = HttpRequestMock.setupForUnitTest('all');

const axios = require('axios');

mocker.mock({
  url: 'www.api.com/other',
  status: 200,
  delay: 1000,
  header: {
    'content-type': 'application/text',
    'some-header': 'some-header-value',
  },
  response(requestInfo) {
    console.log('requestInfo:', requestInfo);
    return 'test response';
  }
});

let time = Date.now();
axios.get('https://www.api.com/other?abc=1234&efg=xxx').then(res => {
  console.log('spent:', Date.now() - time);
  console.log('response body:', res.data);
  console.log('response header:', res.headers);
});

