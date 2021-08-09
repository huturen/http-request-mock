// run `npm run build` before running the command below
// npm run build && node experiment/disable.js
const HttpRequestMock = require('../dist/index').default;
// const HttpRequestMock = require('http-request-mock').default;
const mocker = HttpRequestMock.setupForNode();
const axios = require('axios');

const mockItem = mocker.mock({
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  method: 'any',
  response: {mock: 'some response data'}
});

(async () => {
  const res1 = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  console.log('res1:', res1.data);

  mockItem.disable = 'yes';

  const res2 = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  console.log('res2:', res2.data);
})();

