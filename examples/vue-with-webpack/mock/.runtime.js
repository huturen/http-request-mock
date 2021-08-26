/* eslint-disable */
import HttpRequestMock from 'http-request-mock';

const mocker = HttpRequestMock.setup();
import('./sample-dynamic.js').then(data => mocker.mock({
  "url": "https://some.api.com/dynamic",
  "response": data.default,
  "header": {
    "content-type": "application/json"
  }
}));
import('./sample-static.js').then(data => mocker.mock({
  "url": "https://some.api.com/static",
  "response": data.default,
  "delay": 1000
}));
import('./sample-times.js').then(data => mocker.mock({
  "url": "https://jsonplaceholder.typicode.com/todos/1",
  "method": "any",
  "response": data.default,
  "times": 100,
  "header": {
    "content-type": "application/json"
  }
}));
/* eslint-enable */
