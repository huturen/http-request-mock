/* eslint-disable */
const HttpRequestMock = require('http-request-mock').default;
const data0 = require('./sample-dynamic.js');
const data1 = require('./sample-static.js');
const data2 = require('./sample-times.js');
if (process.env.NODE_ENV === 'development') {
  const mocker = HttpRequestMock.setup();
  mocker.post('https://some.api.com/dynamic', data0, {
    "header": {
      "content-type": "application/json"
    }
  });
  mocker.get('https://some.api.com/static', data1, {
    "delay": 1000
  });
  mocker.any('https://jsonplaceholder.typicode.com/todos/1', data2, {
    "times": 100,
    "header": {
      "content-type": "application/json"
    }
  });
}
/* eslint-enable */
