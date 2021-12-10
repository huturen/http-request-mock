// run `npm run build` before running the command below
// npm run build && node experiment/disable.js
const HttpRequestMock = require('../dist/index');
// const HttpRequestMock = require('http-request-mock');
const mocker = HttpRequestMock.setupForNode();
const axios = require('axios');

mocker.mock({
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  method: 'any',
  times: 2,
  body: {mock: 'some response data'}
});

(async () => {
  let i = 0;
  await axios.get('https://jsonplaceholder.typicode.com/todos/1').then(res => {
    console.log(++i, 'res:', res.data);
  });
  await axios.get('https://jsonplaceholder.typicode.com/todos/1').then(res => {
    console.log(++i, 'res:', res.data);
  });
  await axios.get('https://jsonplaceholder.typicode.com/todos/1').then(res => {
    console.log(++i, 'res:', res.data);
  });
})();

