// run `npm run build` before running the command below
// npm run build && node experiment/other.js
const HttpRequestMock = require('../dist/index').default;
// const HttpRequestMock = require('http-request-mock').default;
const mocker = HttpRequestMock.setupForUnitTest('node');

const axios = require('axios');

mocker.mock({
  url: '/other',
  status: 200,
  method: 'get',
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
axios.get('https://abc:123@www.api.com/other?abc=1234&efg=xxx', {
  params: {
    jjyy: 'zzdd123',
  },
  proxy: false,
}).then(res => {
  console.log('spent:', Date.now() - time);
  console.log('response body:', res.data);
  console.log('response header:', res.headers);
});

