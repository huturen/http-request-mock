// run `npm run build` before running the command below
// npm run build && node experiment/disable.js
const HttpRequestMock = require('../dist/index').default;
// const HttpRequestMock = require('http-request-mock').default;
// const mocker = HttpRequestMock.setupForUnitTest('xhr');
const mocker = HttpRequestMock.setupForUnitTest('xhr', true);
const axios = require('axios');
// const httpAdapter = require('axios/lib/adapters/http');
// axios.defaults.adapter = httpAdapter; // do not use xhr adapter

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

(async () => {
  await axios.get('https://jsonplaceholder.typicode.com/todos/1?a=1')
    .then(res1 => {
      console.log('res1:', res1.data);
    })
    .catch(err => {
      console.log('err:', err.message)
    });


  console.log('----');
  await axios.get('https://jsonplaceholder.typicode.com/todos/1?b=2')
    .then(res2 => {
      console.log('res2:', res2.data);
    })
    .catch(err => {
      console.log('err:', err.message)
    });
})();

