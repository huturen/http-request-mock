// run `npm run build` before running the command below
// npm run build && node experiment/disable.js
const HttpRequestMock = require('../dist/index');
// const HttpRequestMock = require('http-request-mock');
const mocker = HttpRequestMock.setupForUnitTest('fetch');

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
  await fetch('https://jsonplaceholder.typicode.com/todos/1?a=1')
    .then(res => res.text())
    .then(res => {
      console.log('res1:', res);
    })
    .catch(err => {
      console.log('err:', err.message);
    });


  console.log('----');
  await fetch('https://jsonplaceholder.typicode.com/todos/1?b=2')
    .then(res => res.text())
    .then(res => {
      console.log('res2:', res);
    })
    .catch(err => {
      console.log('err:', err.message);
    });
})();

