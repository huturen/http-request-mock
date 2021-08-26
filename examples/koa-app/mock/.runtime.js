/* eslint-disable */
const HttpRequestMock = require('http-request-mock').default;
if (process.env.NODE_ENV === 'development') {
  const mocker = HttpRequestMock.setup();
  mocker.mock({
    "url": "https://some.api.com/dynamic",
    "method": "post",
    "response": require('./sample-dynamic.js'),
    "header": {
      "content-type": "application/json"
    }
  });
  mocker.mock({
    "url": "https://some.api.com/static",
    "method": "get",
    "response": require('./sample-static.js'),
    "delay": 1000
  });
  mocker.mock({
    "url": "https://jsonplaceholder.typicode.com/todos/1",
    "method": "any",
    "response": require('./sample-times.js'),
    "times": 100,
    "header": {
      "content-type": "application/json"
    }
  });
}
/* eslint-enable */