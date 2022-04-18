[![Latest version](https://img.shields.io/npm/v/http-request-mock.svg?style=flat)](https://www.npmjs.com/package/http-request-mock)
[![Coverage Status](https://coveralls.io/repos/github/huturen/http-request-mock/badge.svg)](https://coveralls.io/github/huturen/http-request-mock)
![License](https://img.shields.io/npm/l/http-request-mock)


**English** | [中文](https://github.com/huturen/http-request-mock/blob/main/README-CN.MD)

# http-request-mock ![Logo](https://huturen.github.io/http-request-mock-docs/imgs/logo-small.png)

Full documentation: [https://huturen.github.io/http-request-mock-docs/](https://huturen.github.io/http-request-mock-docs/)

A quick demo: [https://huturen.github.io/http-request-mock-docs/plain-html/](https://huturen.github.io/http-request-mock-docs/plain-html/)


Integration Cases:
- Integration with vue by webpack plugin:
  [Codesandbox](https://codesandbox.io/s/github/huturen/http-request-mock-integration-with-vue-by-webpack-plugin/tree/main),
  [Github](https://github.com/huturen/http-request-mock-integration-with-vue-by-webpack-plugin)

- Integration with vue by webpack CLI:
  [Codesandbox](https://codesandbox.io/s/github/huturen/http-request-mock-integration-with-vue-by-cli/tree/main),
  [Github](https://github.com/huturen/http-request-mock-integration-with-vue-by-cli)

- Integration with react:
  [Codesandbox](https://codesandbox.io/s/github/huturen/http-request-mock-integration-with-react-by-cli/tree/main),
  [Github](https://github.com/huturen/http-request-mock-integration-with-react-by-cli)

- Integration with nodejs:
  [Codesandbox](https://codesandbox.io/s/github/huturen/http-request-mock-integration-with-nodejs/tree/main),
  [Github](https://github.com/huturen/http-request-mock-integration-with-nodejs)

- A CURD demo (http-request-mock + vite + vue3 + ES2015+ + TypeScript):
  [Website](https://huturen.github.io/http-request-mock-curd/#/dashboard),
  [Github](https://github.com/huturen/http-request-mock-curd)

- Unit test:
  [Codesandbox](https://codesandbox.io/s/github/huturen/http-request-mock-unit-test/tree/main),
  [Github](https://github.com/huturen/http-request-mock-unit-test)


It mocks http requests issued by axios, jquery, superagent, ky, node-fetch, got, request
or any other request libraries by intercepting XMLHttpRequest, fetch and nodejs native
HTTP/HTTPS module requests in low level.

1. XMLHttpRequest
2. fetch
3. https.request, https.get (nodejs native https request)
4. http.request, http.get (nodejs native http request)
5. wx.request (for mini program in Wechat)

Because of the low-level interception, any 3th-party request libraries that
based on the above requests can also be supported, such as:

`axios`, `jquery`, `superagent`, `ky`, `node-fetch`, `got`, `request` ...

![layers-design](https://huturen.github.io/http-request-mock-docs/imgs/layers-design.png)

It differs from the other mocking libraries in that it provides a webpack plugin and command line tool
to separate mock data from your business code. It's a truly non-hacking mocking library. You never
have to hack into your business code to mock something ever again after a one-time configuration.

## Table of Contents

* [Introduction And Motivation](#Introduction-And-Motivation)
* [Features](#Features)
* [Installation](#Installation)
* [Examples](#Examples)
    - [Usage](#Usage)
    - [Static response](#Static-response)
    - [Dynamic response](#Dynamic-response)
    - [Delay](#Delay)
    - [HTTP-status](#HTTP-status)
    - [Disable a mock item](#Disable-a-mock-item)
    - [Limited number of mocking](#Limited-number-of-mocking)
    - [Request information](#Request-information)
* [Integration](#Integration)
    - [Integration By Webpack plugin](#Integration-By-Webpack-plugin)
    - [Integration By Command Line Tool](#Integration-By-Command-Line-Tool)
* [Command Line Tool Options](#Command-Line-Tool-Options)
* [API](#API)
* [Unit test](#Unit-test)
* [Mock data file](#Mock-data-file)
* [FAQ](#FAQ)
* [License](#License)



## Introduction And Motivation

`http-request-mock` is an http request mocking library that lets you develop, build and test as normal even when
backend APIs are down or not ready yet. It supplies a new way to prototype your web application.


The original intention of making this library was to find a mocking library to decouple from backend.
However, we can't find a library that meets our requirements. Some libraries have occupied the most
readable names, but they provide weak functionalities or even no longer provide any updates .


There are some problems you may encounter when using the other mocking libraries:
1. You may have to hack your source code to mock something and revert it back to restore normal after mocking.
2. You may involve complex setups, such as all kinds of proxies, http servers.
3. Not all in one, some library only for `XMLHttpRequest`, some library only for `fetch`.
4. No updates, hard to set up and a lot of bugs.


## Features

* **Non-hacking**: You don't have to change your business code.
* **Interceptor**: It can be used as an interceptor. You can decide how to handle requests.
* **All in one**: XMLHttpRequest, fetch, https.get, http.get, https.request, http.request, wx.request.
* **More 3rd-party libraries support**: It supports axios, jquery, superagent, ky, node-fetch, got, request...
* **Unit test capability**: It can be worked in jest, mocha and ava environment.
* **Dynamic mocking**: Dynamically resolve response based on request query, payloads...
* **Flexible route matching**: Supports RegExp matching and partial string matching.
* **Delaying mocking**: Supports to simulate network latency.
* **Fake data**: Easy to generate massive amounts of fake data, automatically and programmatically.
* **Complete unit tests**: It has complete unit tests including the 3th-party request libraries.
* **Protobuf**: Support for generating mock data by proto files.
* **Remote**: Support for using remote mock data.


## Installation

**NPM**:

`npm install --save-dev http-request-mock`


```javascript
// using ES6 modules
import HttpRequestMock from 'http-request-mock';

// using CommonJS modules
const HttpRequestMock = require('http-request-mock');
```

**CDN**:

The UMD build is also available on `unpkg` and `cdnjs`:

```html
<!-- unpkg -->
<script src="https://unpkg.com/http-request-mock/dist/http-request-mock.js"></script>

<!-- cdnjs -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/http-request-mock/1.5.10/http-request-mock.js"></script>
```


You can find the library on window.HttpRequestMock.


## Examples

#### Usage

To mock an http request, just call a `mock` method or http verb method(`get`,`post`,`put`,`patch`,`delete`).
```javascript
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

mocker.mock({
  url: 'www.api.com/some-api' // or RegExp: /.*\/some-api$/
  method: 'get', // get, post, put, patch or delete
  delay: 0,
  status: 200,
  header: { // respone headers
    'content-type': 'application/json',
    'some-header': 'value',
  },
  body: 'some response data'
});

// or using http verb method:
mocker.get('www.api.com/some-api', 'some response data');
```

#### Static response

```javascript
// mock configuration:
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

mocker.get('https://www.api.com/text-response', '<html>mock response content</html>');
mocker.post('https://www.api.com/json-response', { ret: 0, msg: 'ok' });

// issue some requests:
...
const text = await axios.get('https://www.api.com/text-response');
const json = await axios.post('https://www.api.com/json-response', null, { responseType: 'json' });
console.log(text); // <html>mock response content</html>
console.log(json); // { ret: 0, msg: 'ok' }
...
```


#### Dynamic response

You can export a function instead of an object to resolve a dynamic response,
so as to simulate a complex business logic in the real world.


```javascript
// mock configuration:
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

let times = 0;
// requestInfo: please refer to < RequestInfo > in src/types.ts
mocker.get('https://www.api.com/dynamic-response', (requestInfo) => {
  times = times + 1;
  return { times: 'times: ' + times, url: requestInfo.url };
});

// Note: the contents of url and times fields are different between the two requests below:
...
const res1 = await axios({ url: 'https://www.api.com/dynamic-response?a=1', responseType: 'json' });
const res2 = await axios({ url: 'https://www.api.com/dynamic-response?b=2', responseType: 'json' });
console.log(res1); // { times: 'times: 1', url: 'https://www.api.com/dynamic-response?a=1' }
console.log(res2); // { times: 'times: 2', url: 'https://www.api.com/dynamic-response?b=2' }
...
```


#### Delay
```javascript
// configuration
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();
mocker.mock({
  url: 'https://some.api.com/name',
  method: 'get',
  delay: 3000 // the response will be resolved in 3 seconds
});

// issue a request:
let time = Date.now();
axios.get('https://some.api.com/name').then(() => {
  console.log(Date.now() - time); // >= 3000
});
```

#### HTTP status
```javascript
// configuration
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();
mocker.mock({
  url: 'www.api.com/status404',
  status: 404,
  header: {
    'content-type': 'application/json',
    'some-header': 'header-value',
  }
});

// issue a request:
// Note: axios will throw an error when meets a 404 response
axios.get('https://www.api.com/status404').catch(err => {
  console.log(err.message); // Request failed with status code 404
  console.log(err.response.status); // 404
  console.log(err.response.headers['some-header']); // header-value
});
```


#### Disable a mock item

For more details, please refer to `experiment/disable.js`.

```javascript
// configuration
const mocker = HttpRequestMock.setup();
const mockItem = mocker.mock({
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  method: 'any',
  body: {mock: 'some response data'}
});

(async () => {
  const res1 = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  console.log('res1:', res1.data); // it'll resolve a response from mocking.

  mockItem.disable = 'yes';

  const res2 = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  console.log('res2:', res2.data); // it'll resolve a response from real network request.
})();

// res1: { mock: 'some response data' }
// res2: { userId: 1, id: 1, title: 'delectus aut autem', completed: false }
```


#### Limited number of mocking

For more details, please refer to `experiment/times.js`:

```javascript
const mocker = HttpRequestMock.setup();
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

// 1 res: { mock: 'some response data' }
// 2 res: { mock: 'some response data' }
// 3 res: { userId: 1, id: 1, title: 'delectus aut autem', completed: false }
```


#### Request information
```javascript
mocker.mock({
  url: 'https://www.api.com/reqinfo',
  response(requestInfo) {
    return requestInfo;
  }
});

axios.post('https://www.api.com/reqinfo?abc=123', {xyz: 456}, {responseType: 'json'}).then(res => {
  console.log('info:', res.data);
});

// output may look like below:
// info: {
//   "url": "https://www.api.com/reqinfo?abc=123",
//   "method": "POST",
//   "query": {
//     "abc": "123"
//   },
//   "headers": {
//     "Accept": "application/json, text/plain, */*",
//     "Content-Type": "application/json;charset=utf-8"
//   },
//   "body": {
//     "xyz": 456
//   }
// }
```


## Integration
In a bare-bones example, you just import `http-request-mock` into your application
entry file(such as: src/main.js) and configure your mock datas there.
Take a Vue project as an example:
```javascript
import { createApp } from 'vue'
import App from './App.vue'
import HttpRequestMock from 'http-request-mock'

if (process.env.NODE_ENV === 'development') {
  const mocker = HttpRequestMock.setup()
  mocker.get('https://some.api.com/some-path', ...)
  mocker.post('https://some.api.com/other-path', ...)
  ...
}

createApp(App).mount('#app')
```
It may be ok in a small project, however, for a large web application,
it may have lots of APIs to be mocked. You may need frequently change
the entry file when adding/deleting/updating a mock data.
There will be a day that you'll get a mess as the project grows.

In order to solve the problem above, we provide a webpack plugin and command
tool to integrate your project. In this way, the mock data file can be
separated from the entry to reduce the burden of managing this entry file.

#### Integration By Webpack plugin

You can set it up by the steps below:

1. Run `npx http-request-mock-cli -i`. It'll initialize some samples in your mock directory.
2. Configure `HttpRequestMockWebpackPlugin` in your webpack configurations, which looks like below.
```javascript
const path = require('path');
// The webpack plugin will parse mock files under the mock directory and generate a mock
// configuration entry file named `.runtime.js`, then inject it into the your application entry file.
const HttpRequestMockWebpackPlugin = require('http-request-mock/plugin/webpack.js');
module.exports = {
  // ...
  plugins: [
    new HttpRequestMockWebpackPlugin(
      enable: process.env.NODE_ENV === 'development', // activate/deactivate
      entry: /src\/main\.js$/, // web application entry
      dir: path.resolve(__dirname, 'mock/'), // mock directory
    ),
  ]
  // ...
};
```
3. In your package.json, set a command named `mock-dev` to start a mock development:
```json
  "scripts": {
    "dev": "npm run start",
    "mock-dev": "NODE_ENV=development npm run start"
  },
```

**Webpack Plugin options**

| Option          | Required | Description                                                      |
| :-----          | :----    | :----                                                            |
| **entry**       | yes      | Application entry file, must be a Regexp object                   |
| **dir**         | yes      | Mock directory, must be an absulte path                          |
| **enable**      | no       | Whether or not to enable this plugin, defaut: true               |
| **watch**       | no       | A callback that is triggered when a mock data file is changed     |
| **proxyMode**   | no       | Proxy mode. Valid values are 'marked' and 'matched'              |

#### Integration By Command Line Tool

An alternative way to integrate with your project is using CLI.
You can set it up by the steps below:

1. Run `npx http-request-mock-cli -j src/xxx.js` to inject mock configuration file
into the specified entry which may look like below:
```javascript
import '../mock/.runtime.js'
import { createApp } from 'vue'
import App from './App.vue'
// ...
createApp(App).mount('#app')
```

2. In your package.json, set a command named `mock-dev` to start a mock development:
```json
"scripts": {
  "serve": "vue-cli-service serve",
  "mock-dev": "http-request-mock-cli -w \"vue-cli-service serve\"",
},
```
The command passed into `http-request-mock-cli -w` must be quoted with double quotes.


***Note：***

If `-e --environment` is not specified, mock function will be enabled by `NODE_ENV=development`.

Or, you can specify another environment variable, such as: `-e MOCK=yes`.


## Command Line Tool Options
`npx http-request-mock-cli -h`:

```
Usage: npx http-request-mock-cli [options]

Description: http-request-mock command line tool at version 1.6.8.
Glossary: [.runtime.js] A runtime mock configuration entry file.
Example:
    npx http-request-mock-cli -i

Options:
  -d, --directory [directory]        The mock directory relative to the working directory. (default: "mock")
  -e, --environment [variable-pair]  Enable mock function by environment variable for .runtime.js.
                                     (default: "NODE_ENV=development")
  -i, --init                         Initialize some samples & a .runtime.js in the mock directory.
  -w, --watch [command]              Watch mock directory & update .runtime.js. If the [command] is specified,
                                     ths specified command will be executed together with watching.
  -j, --inject <app-entry-file>      Inject .runtime.js into the specified entry relative to the working directory.
  -t, --type [module-type]           The module type of .runtime.js.
                                     Possible values are: es6, cjs(alias of commonjs).
                                     (default: "cjs")
  -p, --proxy [mode]                 Proxy mode. In proxy mode, http-request-mock will start
                                     a proxy server which recives incoming requests on localhost.
                                     The mock files will be run in a nodejs environment.
                                     This feature is designed for browser, so do not use it in a nodjs project.
                                     Note: proxy mode is still under experimental stage, only for experts.
                                     [matched] All requests matched by @url will be proxied to a proxy server.
                                     [marked] All requests marked by @proxy will be proxied to a proxy server. (default: "none")
  --proto                            Generate mock files by proto files.
  -h, --help                         output usage information
```


## API


#### For HttpRequestMock


**setup() : Mocker**:

Auto detect request environment and set up request mock.

**setupForWx() : Mocker**:

Set up request mock for wx.request.

**setupForXhr() : Mocker**:

Set up request mock for XMLHttpRequest.

**setupForFetch() : Mocker**:

Set up request mock for fetch.

**setupForNode() : Mocker**:

Set up request mock for http.get, https.get, http.request and https.request in nodejs envrioment.

**setupForUnitTest() : Mocker**:

Set up request mock for unit test.

**enable() : Mocker**:

Enable mock function temporarily.

**disable() : Mocker**:

Disable mock function temporarily.

---
#### For Mocker

**setMockData(mockConfigData: MockConfigData)**

Set global mock data configuration.

**reset()**

Reset global mock data configuration.

**mock(mockItem: MockItemInfo)**

Check specified mock item & add it to global mock data configuration.

```javascript
interface MockItemInfo {
  url: RegExp | string;
  method?: Method; // GET, POST, PUT, PATCH, DELETE or HEAD
  header?: Header, // response header
  delay?: number;
  disable?: Disable; // yes or no
  times?: number;
  body?: any; // response body
  status?: number; // http status code
};
```

**get(url: RegExp | String, body: any, opts: MockItemExt)**

Make a mock item that matches an HTTP GET request.

```javascript
interface MockItemExt {
  header?: Header, // response header
  disable?: Disable; // yes or no
  delay?: number;
  times?: number;
  status?: number; // http status code
};
```

**post(url: RegExp | String, body: any, opts: MockItemExt)**

Make a mock item that matches an HTTP POST request.

**put(url: RegExp | String, body: any, opts: MockItemExt)**

Make a mock item that matches an HTTP PUT request.

**patch(url: RegExp | String, body: any, opts: MockItemExt)**

Make a mock item that matches an HTTP PATCH request.

**delete(url: RegExp | String, body: any, opts: MockItemExt)**

Make a mock item that matches an HTTP DELETE request.

**head(url: RegExp | String, opts: MockItemExt)**

Make a mock item that matches an HTTP HEAD request.

**any(url: RegExp | String, body: any, opts: MockItemExt)**

Make a mock item that matches an HTTP GET, POST, PUT, PATCH, DELETE or HEAD  request.


## Unit test

This library comes with built-in unit test capability and can be used in jest and mocha envrioment.
The unit tests of this library are also based on itself.

An example of jest：
```javascript
import axios from 'axios';
import xhrAdapter from 'axios/lib/adapters/xhr';
import HttpRequestMock from 'http-request-mock';

axios.defaults.adapter = xhrAdapter;
const mocker = HttpRequestMock.setupForUnitTest('xhr');

mocker.get('https://your.api.com/path', function() {
  return { abc: 123 };
});

it('should match object`', async () => {
  const res = await axios.get('https://your.api.com/path');
  expect(res.data).toMatchObject({abc: 123});
});
```


## Mock data file
```javascript
/**
 * Note: Only the first comments block will be parsed.
 *
 * The url to be mocked.
 * Both string and RegExp(which begins and ends with # or /) are supported.
 * RegExp example: #.*\/getUserInfo.*#
 * @url https://jsonplaceholder.typicode.com/todos/1
 *
 * The request method to be mocked.
 * One of http verb method get, post, put, patch, delete, head.
 * Default: any
 * @method any
 *
 * Response http status to be mocked.
 * Default: 200
 * @status 200
 *
 * Response http headers to be mocked.
 * It can be set repeatedly.
 * @header content-type: application/json
 *
 * Simulate network latency in milliseconds.
 * Default: 0
 * @delay 100
 *
 * Limited number of mocking.
 * It'll do a real network request after specified number of mocking.
 * Default: Infinity
 * @times 5
 *
 * Whether or not to enable this mock item.
 * 'yes' for real network request, 'no' for mock request.
 * Default: no
 * @disable no
 *
 * Remote mock data.
 * In browser, the specified remote url must conform to the cross-domain specification.
 * @remote https://remote.api.com/some/mock/data
 *
 * Marked proxy mode, which the mock definitions will be run in a nodejs environment.
 * This feature is designed for browser, so do not use it in a nodjs project.
 * Only available when proxy mode is enabled by webpack plugin(proxyMode=marked) or CLI(--proxy marked).
 * Note: this feature is still under experimental stage.
 * @proxy
 */
// Response body to be mocked.
// It supports to export an object, function, async function, sting or any other types.
// If a function is specified, the function accepts an argument with request information.
module.exports = (requestInfo) => {
  return 'Your response data';
};
```

## FAQ

1. Cannot assign to read only property 'exports' of object '#<Object>' at Module.eval
```
Solution 1: You can avoid this issue by setting sourceType: unambiguous in your babel config file:
  { // babel.config.js or .babelrc.js
    "presets": [...],
    "plugins": [...],
    sourceType: 'unambiguous'
  }

Solution 2: set [type] option to es6. Note: es6 can't work with proxy mode, don't use es6 and proxy mode together.
  a. If you are using cli to set up your http-request-mock:
    http-request-mock-cli -t es6 -w "vue-cli-service serve"
  b. If you are using webpack to set up your http-request-mock:
    new HttpRequestMockPlugin({
      ...
      type: 'cjs',
      ...
    }),
```

## License

http-request-mock is licensed under the MIT license.
