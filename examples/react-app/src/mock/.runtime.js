/* eslint-disable */
import HttpRequestMock from 'http-request-mock';
if (process.env.NODE_ENV === 'development') {
  const mocker = HttpRequestMock.setup();
  import('./sample-dynamic.js').then(data => mocker.mock({
    "url": "https://some.api.com/dynamic",
    "method": "post",
    "response": data.default,
    "header": {
      "content-type": "application/json"
    }
  }));
  import('./sample-static.js').then(data => mocker.mock({
    "url": "https://some.api.com/static",
    "method": "get",
    "response": data.default,
    "delay": 1000
  }));
  import('./sample-times.js').then(data => mocker.mock({
    "url": "https://jsonplaceholder.typicode.com/todos/1",
    "method": "get",
    "response": data.default,
    "times": 100,
    "header": {
      "content-type": "application/json"
    }
  }));
}
/* eslint-enable */