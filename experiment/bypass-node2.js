// run `npm run build` before running the command below
// npm run build && node experiment/disable.js
const HttpRequestMock = require('../dist/index');
// const HttpRequestMock = require('http-request-mock');
// const mocker = HttpRequestMock.setupForUnitTest('xhr');
const mocker = HttpRequestMock.setupForNode();
const axios = require('axios');
const httpAdapter = require('axios/lib/adapters/http');
axios.defaults.adapter = httpAdapter; // do not use xhr adapter

mocker.mock({
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  method: 'any',
  body: function(req) {
    if (req.query.b === '2') {
      return this.bypass();
    }
    return 'some data';
  }
});

(async () => {
  const res1 = await axios.get('https://jsonplaceholder.typicode.com/todos/1?a=1');
  console.log('res1:', res1.data);

  console.log('----');
  const res2 = await axios.get('https://jsonplaceholder.typicode.com/todos/1?b=2');
  console.log('res2:', res2.data);
})();


