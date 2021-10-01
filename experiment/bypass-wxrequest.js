// run `npm run build` before running the command below
// npm run build && node experiment/disable.js
const HttpRequestMock = require('../dist/index');
// const HttpRequestMock = require('http-request-mock');
const mocker = HttpRequestMock.setupForUnitTest('wx');

let times = 0;
mocker.mock({
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  method: 'any',
  // delay: 100,
  body: function() {
    if (++times > 1) {
      return this.bypass();
    }
    return times;
  }
});

(async () => {
  wx.request({
    url: 'https://jsonplaceholder.typicode.com/todos/1?a=1',
    success: res => {
      console.log('res1:', res.data);
    },
    fail: err => {
      console.log('err:', err.message)
    }
  })

  // await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('----');
  wx.request({
    url: 'https://jsonplaceholder.typicode.com/todos/1?b=2',
    success: res => {
      console.log('res2:', res.data);
    },
    fail: err => {
      console.log('err:', err.message)
    }
  })
})();

