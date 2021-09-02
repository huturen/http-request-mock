// run `npm run build` before running the command below
// npm run build && node experiment/disable.js
const HttpRequestMock = require('../dist/index').default;
// const HttpRequestMock = require('http-request-mock').default;
const mocker = HttpRequestMock.setupForNode(); // .enableLog();
const https = require('https');
const axios = require('axios');

let times = 0;
mocker.mock({
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  method: 'any',
  body: function() {
    if (++times > 1) {
      return this.bypass();
    }
    return times;
  }
});

const request = (url) => new Promise(resolve => {
  let buffer = '';
  https.get(url, (res) => {
    res.on('data', chunk => (buffer += chunk));
    res.on('end', () => resolve(buffer));
  }).on('error', (e) => {
    console.log('https.get error:', '[', e, ']');
    resolve(e.message);
  });
});

(async () => {
  const res1 = await request('https://jsonplaceholder.typicode.com/todos/1');
  console.log('res1:', res1);

  console.log('----');
  const res2 = await request('https://www.api.com/https-request-bypass');
  console.log('res2:', res2);
})();

