/* eslint-disable */
import HttpRequestMock from 'http-request-mock';
import data0 from './sample-dynamic.js';
import data1 from './sample-static.js';
import data2 from './sample-times.js';
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
/* eslint-enable */
