[![Latest version](https://img.shields.io/npm/v/http-request-mock.svg?style=flat)](https://www.npmjs.com/package/http-request-mock)
[![Coverage Status](https://coveralls.io/repos/github/huturen/http-request-mock/badge.svg)](https://coveralls.io/github/huturen/http-request-mock)
![License](https://img.shields.io/npm/l/http-request-mock)

**中文** | [English](https://github.com/huturen/http-request-mock/blob/main/README.MD)

# http-request-mock ![Logo](https://huturen.github.io/http-request-mock-homepage/imgs/logo-small.png)

完整文档： [https://huturen.github.io/http-request-mock-homepage/](https://huturen.github.io/http-request-mock-homepage/)

简短演示： [https://huturen.github.io/http-request-mock-homepage/plain-html/](https://huturen.github.io/http-request-mock-homepage/plain-html/)

本库通过拦截 XMLHttpRequest, fetch, wx.request 及 Nodejs 原生HTTP/HTTPS模块请求，来实现网络请求mock处理。

1. XMLHttpRequest
2. fetch
3. https.request, https.get (nodejs原生请求对象)
4. http.request, http.get (nodejs原生请求对象)
5. wx.request (微信小程序)

由于基于底层拦截，因此基于以上请求的第3方请求库，也能得到支持，如：

`axios`, `jquery`, `superagent`, `ky`, `node-fetch`, `got`, `request` ...

![layers-design](https://huturen.github.io/http-request-mock-homepage/imgs/layers-design.png)

区别于其他mock库，为把mock数据从你的业务代码中分离出去，本库提供webpack及cli命令行整合工具，可真正做到无侵入mock，只配置一次，后续无需修改任何业务代码。

## 目录

* [简介和动机](#简介和动机)
* [特性](#特性)
* [安装](#安装)
* [例子](#例子)
    - [使用](#使用)
    - [静态响应](#静态响应)
    - [动态响应](#动态响应)
    - [延迟响应](#延迟响应)
    - [状态码及头信息模拟](#状态码及头信息模拟)
    - [单独禁用mock](#单独禁用mock)
    - [mock次数限制](#mock次数限制)
    - [请求信息](#请求信息)
* [目录结构](#目录结构)
* [webpack插件](#webpack插件)
* [命令行工具](#命令行工具)
* [API文档](#API文档)
* [单元测试](#单元测试)
* [mock数据文件配置说明](#mock数据文件配置说明)
* [常见问题](#FAQ)
* [License](#License)



## 简介和动机

在后台接口未开发好或接口挂掉，甚至无网络环境的情况下，这个库可以让你不受干扰的继续开发，以快速构建产品原型。


设计本库的初衷是为了在开发及测试过程中从后端解耦。我们找了一堆库，但是基本不能满足我们的要求。
一些库占据了最直观可读的名字，但是却提供了相对较弱的功能，甚至不提供后续的版本更新。


目前现存的mock库，可能存在以下这些问题：
1. 必须侵入修改源码来进行mock， mock完毕后还得再改回来。
2. 时常陷入复杂的配置，比如各种各样的代理， 复杂的服务器配置等等。
3. mock功能不全，有些只能mock XMLHttpRequest，有些只能fetch。
4. 不提供后续版本更新， 配置困难，以及太多的bug以至于不能用。

## 特性

本库提供了以下特性:

* **配置简单**: 免去了复杂的服务器，代理配置；更没有请求URL替换。
* **跨域**: 开箱，零配置, 支持跨域请求。
* **无侵入**: 不侵入源代码来实现mock处理。
* **拦截器**: 可以做为请求拦截器使用，你来决定怎么处理请求。
* **多合一**: XMLHttpRequest, fetch, https.get, http.get, https.request, http.request, wx.request.
* **更多的第3方请求库支持**: 支持主流第3方请求库，如：axios, jquery, superagent, ky, node-fetch, got, request...
* **单元测试能力支持**: 支持jest，mocha, ava测试库运行环境，甚至裸node运行环境。
* **动态响应模拟**: 基于请求信息，如url，查询参数，post请求包体，来动态模拟返回内容。
* **灵活的路由匹配**: 支持URL局部匹配及RegExp正则匹配。
* **网络延迟模拟**: 支持模拟网络请求的时延，精确到毫秒级别。
* **假数据生成**: 支持海量的假数据生成, 假数据生成具备可编程性。
* **完备的单元测试**: 本库具有完整的单元测试，甚至对第3方请求库也做了完整的单元测试。
* **根据protobuf协议生成mock数据**: 支持通过proto文件自动生成mock数据.。

## 安装

**NPM**:

`npm install --save-dev http-request-mock`

```javascript
// using ES6 modules
import HttpRequestMock from 'http-request-mock';

// using CommonJS modules
const HttpRequestMock = require('http-request-mock');
```

**CDN**:

也可在浏览器中直接引用, 提供了`unpkg` 和 `cdnjs` 的CDN做为备选:


```html
<!-- unpkg -->
<script src="https://unpkg.com/http-request-mock/dist/http-request-mock.js"></script>

<!-- cdnjs -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/http-request-mock/1.2.45/http-request-mock.js"></script>
```


配置对象可以在 window.HttpRequestMock 中找到。


## 例子

#### 使用

要模拟一个请求，只需简单调用`mock`或者 `get`,`post`,`put`,`patch`,`delete`：
```javascript
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

mocker.mock({
  url: 'www.api.com/some-api' // 或者使用正则 /.*\/some-api$/
  method: 'get', // get post put patch delete
  delay: 0,
  status: 200,
  header: { // 模拟响应头
    'content-type': 'application/json',
    'some-header': 'value',
  },
  body: 'some response data'
});

// 或者只调用指定method进行模拟:
mocker.get('www.api.com/some-api', 'some response data');
```

#### 静态响应

```javascript
// mock配置文件：
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

mocker.get('https://www.api.com/text-response', '<html>mock response content</html>');
mocker.post('https://www.api.com/json-response', { ret: 0, msg: 'ok' });

// 然后在你的业务文件，使用请求库请求对于的链接就可以了：
...
const text = await axios.get('https://www.api.com/text-response');
const json = await axios.post('https://www.api.com/json-response', null, { responseType: 'json' });
console.log(text); // <html>mock response content</html>
console.log(json); // { ret: 0, msg: 'ok' }
...
```


#### 动态响应

可以动态返回响应内容，以更真实的模拟网络请求。

```javascript
// mock配置文件
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

let times = 0;
// requestInfo 请参考 src/types.ts 中的 < RequestInfo >
mocker.get('https://www.api.com/dynamic-response', (requestInfo) => {
  times = times + 1;
  return { times: 'times: ' + times, url: requestInfo.url };
});

// 你的业务文件, 注意 times 及 url 内容， 前后两次请求调用返回的是不一样的内容
...
const res1 = await axios({ url: 'https://www.api.com/dynamic-response?a=1', responseType: 'json' });
const res2 = await axios({ url: 'https://www.api.com/dynamic-response?b=2', responseType: 'json' });
console.log(res1); // { times: 'times: 1', url: 'https://www.api.com/dynamic-response?a=1' }
console.log(res2); // { times: 'times: 2', url: 'https://www.api.com/dynamic-response?b=2' }
...
```


#### 延迟响应
```javascript
// 配置文件内容：
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();
mocker.mock({
  url: 'https://some.api.com/name',
  method: 'get',
  delay: 3000 // 如果匹配到请求，3秒后执行返回响应内容
});

// 业务代码:
let time = Date.now();
axios.get('https://some.api.com/name').then(() => {
  console.log(Date.now() - time); // >= 3000
});
```

#### 状态码及头信息模拟
```javascript
// 配置文件内容：
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

// 业务代码, 注意：如果请求返回404时，axios会抛异常
axios.get('https://www.api.com/status404').catch(err => {
  console.log(err.message); // Request failed with status code 404
  console.log(err.response.status); // 404
  console.log(err.response.headers['some-header']); // header-value
});
```


#### 单独禁用mock

详细，请参考项目中 `experiment/disable.js` 例子。

```javascript
// 配置文件内容：
const mocker = HttpRequestMock.setup();
const mockItem = mocker.mock({
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  method: 'any',
  body: {mock: 'some response data'}
});

(async () => {
  const res1 = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  console.log('res1:', res1.data); // 返回mock内容

  mockItem.disable = 'yes';

  const res2 = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
  console.log('res2:', res2.data); // 返回真实网络返回
})();

// res1: { mock: 'some response data' }
// res2: { userId: 1, id: 1, title: 'delectus aut autem', completed: false }
```


#### mock次数限制

详细，请参考项目中 `experiment/times.js` 例子。

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


#### 请求信息
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

// 以上会输出以下类似的内容：
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


## 目录结构
运行`npx http-request-mock-cli -i` 它将会生成类似如下的目录结构:

**注意**： mock/ 目录下的文件名符合 `/[\w][-\w]*\.js/` 正则的才被视为mock数据配置文件。
```
App
├─── mock/
|   ├─── .runtime.js   (mock入口配置文件)
|   ├─── config.js      (mock数据配置文件)
|   ├─── detail.js     (mock数据配置文件)
|   ├─── ...           (其他mock数据配置文件)
├─── src/
|   ├─── index.js      (业务入口文件)
|   ├─── ...           (其他业务代码)
```
```javascript
// mock文件 config.js：
// 以下注释中的 @url, @method 等标签信息，会被webpack插件或cli工具所解析并使用。
/**
 * @url https://some.api.com/config
 * @method get
 */
module.exports = {
  enable: false,
  title: 'Some Title',
  ...
};

// mock文件 user.js：
/**
 * @url https://some.api.com/user
 * @method post
 */
module.exports = {
  name: 'John',
  age: 25,
  ...
};
```

webpack插件或cli工具会解析mock目录下面的mock文件，
并生成类似如下mock配置入口文件 `.runtime.js`：
```javascript
import data0 from './config.js';
import data1 from './user.js';

import HttpRequestMock from 'http-request-mock';
if (process.env.NODE_ENV === 'development') { // depends on webpack or cli configuration
  const mocker = HttpRequestMock.setup();
  mocker.get('https://some.api.com/config', data0);
  mocker.post('https://some.api.com/user', data1);
}

```

---

## webpack插件
简单来说，只要在入口引入`http-request-mock`并配置就可以用mock了, 以vue项目为例：
```javascript
import { createApp } from 'vue'
import App from './App.vue'
import HttpRequestMock from 'http-request-mock'

if (process.env.NODE_ENV === 'development') { // as you need
  const mocker = HttpRequestMock.setup()
  mocker.get('https://some.api.com/some-path', ...)
  ...
}

createApp(App).mount('#app')
```
取决于你的需要，对与小项目，这样做是ok的。

---

但是这样的方式，仍具有一定的侵入性。增，删mock数据时，仍然需要反复修
改业务入口文件。为避免修改你的业务源码入口文件（如，src/index.js）。

我们额外提供了一个内置webpack插件，使用方式如下：

1. 运行 `npx http-request-mock-cli -i` 初始化 .runtime.js（mock配置入口）
2. 在你的 `webpack` 配置文件中：
```javascript

const path = require('path');
const HttpRequestMockWebpackPlugin = require('http-request-mock/plugin/webpack.js');
module.exports = {
  // ...
  plugins: [
    // ...
    new HttpRequestMockWebpackPlugin(
      enable: process.env.NODE_ENV === 'development', // 根据环境变量启用插件
      entry: /src\/index\.js$/, // 入口页面
      dir: path.resolve(__dirname, 'mock/'), // mock文件目录
    ),
    // ...
  ]
  // ...
};
```

此插件，会自动解析mock目录下面的文件，并从文件的注释内容中提取：

"@url, @method, @delay, @status, @header" 等标签信息，

并自动注入到 entry 匹配到的入口文件中，免去了修改入口文件的必要。

注意：enable选项，根据环境变量自动拆卸，启动跟关闭mock均不需要修改源码。


可以在package.json中，配置script命令，来启动自动拆卸mock功能。
```json
...
  "scripts": {
    "dev": "npm run serve",
    "mock-dev": "NODE_ENV=development npm run serve"
  },
}
...
```

#### webpack 插件选项

| 选项      | 配置   | 说明                                                     |
| :-----    | :---- | :----                                                   |
| **entry** | 必填   | 正则对象，用于匹配入口文件                                  |
| **dir**   | 必填   | 绝对路径，mock文件夹用于存放mock配置文件                     |
| **enable** | 可选   | 是否启用该插件，默认 true                                  |
| **watch** | 可选     | 回调函数，mock配置文件修改是触发，回调参数为变更的mock文件 |


## 命令行工具
`npx http-request-mock-cli -h`:

```
Usage: npx http-request-mock-cli [options]

Description: http-request-mock command line tool at version 1.1.30.
Glossary: [.runtime.js] A runtime mock entry configuration file.
Current working directory: /web/your_project_root_directory
Example:
    npx http-request-mock-cli -i
    npx http-request-mock-cli -i -e MOCK=yes

Options:
  -d, --directory [directory]       The mock directory relatives to the working directory. (default: "mock")
  -e, --enviroment [variable-pair]  Enable mock function by enviroment variable for .runtime.js.
                                    (default: "NODE_ENV=development")
  -i, --init                        Initialize .runtime.js & samples(if necessary) in the mock directory.
  -w, --watch [command]             Watch mock directory & update .runtime.js. If a command is specified,
                                    ths specified command will be executed together with watching.
  -j, --inject <app-entry-file>     Inject .runtime.js into app entry file
                                    which must be relative to the working directory.
                                    NOTE: this is an experimental option.
  -h, --help                        output usage information
```

如果你的项目不使用webpack，可以使用以下命令行工具代替，步骤如下:

1. 运行 `npx http-request-mock-cli -j src/xx.js` 初始化.runtime.js，把依赖注入到指定的业务入口
2. 运行 `npx http-request-mock-cli -w` 监控文件修改并自动更新 .runtime.js

`npx http-request-mock-cli -w` 可能需要经常用，在package.json中添加script命令：

```json
...
"scripts": {
  "serve": "vue-cli-service serve",
  "mock": "http-request-mock-cli -w",
},
...
```
如果希望只使用一个命令启动开发，我们也也提供了启动整合方案：

`npx http-request-mock-cli -w "vue-cli-service serve"`

可以添加到scripts里面，详细请参考 `examples/vue-with-cli`:
```json
...
// 传入到 `http-request-mock-cli -w` 中的命令需要用双引号转译。
"scripts": {
  "serve": "vue-cli-service serve",
  "mock-dev": "http-request-mock-cli -w \"vue-cli-service serve\"",
},
...
```


***注意：***

如果不指定 `-e --enviroment` 默认的会根据 `NODE_ENV=development` 来开启mock。

如果需要其他环境变量来开启mock，可指定其他变量，如: `-e MOCK=yes`.

如果想去掉环境变量判断，直接指定 `-e none` 就可以了。




## API文档


### For HttpRequestMock


**setup() : Mocker**:

Auto detect request enviroment and set up request mock.

**setupForWx() : Mocker**:

Set up request mock for wx.request.

**setupForXhr() : Mocker**:

Set up request mock for XMLHttpRequest.

**setupForFetch() : Mocker**:

Set up request mock for fetch.

**setupForNode() : Mocker**:

Set up request mock for http.get, https.get, http.request and https.request in nodejs envrioment.

**setupForUnitTest('wx' | 'xhr' | 'fetch' | 'all') : Mocker**:

Set up request mock for unit test.

**enable() : Mocker**:

Enable mock function temporarily.

**disable() : Mocker**:

Disable mock function temporarily.

---
### For Mocker

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
  response?: any; // response body
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


## 单元测试

本库支持常用单元测试库，支持jest， mocha，或其他 node测试环境。

本库的单元测试，也是基于本库自带的库完成的验证测试。

jest测试环境：
```javascript
import HttpRequestMock from 'http-request-mock';
import axios from 'axios';
const mocker = HttpRequestMock.setupForUnitTest('xhr');

describe('mock axios request', () => {
  it('url config item should support partial matching', (done) => {
    mocker.get('www.api.com/some-path', 'your fake response content');

    axios.get('https://www.api.com/some-path', 'get').then(res => {
      expect(res.data).toBe('your fake response content');
      done();
    }),
  });
});
```

2. mocha测试环境, 请参考： `experiment/mocha.js`


## mock数据文件配置说明
```javascript
/**
 * 注意： 只会解析第一个注释块中的标签信息
 * 请求的url，支持正则，如果是正则，请使用 / 或者 # 做为正则的起始分割字符，
 * 如： #.*\/getUserInfo.*#
 * @url https://jsonplaceholder.typicode.com/todos/1
 *
 * http请求方法，支持 get, post, put, patch, delete, head, any 默认，any
 * @method any
 *
 * http响应状态码，默认200
 * @status 200
 *
 * http响应头信息，支持重复配置
 * @header content-type: application/json
 *
 * http响应延迟，模拟网络延时，单位毫秒，默认0
 * @delay 100
 *
 * 执行指定次数mock后，回退到真实网络请求，默认 Infinity
 * @times 5
 *
 * 是否禁用这个mock配置项，如果是yes，则走真实网络请求，默认no
 * @disable no
 */
// http响应内容，支持静态对象，函数，或者 异步函数,
// 如果导出的的是函数，入参数为请求对象信息，返回内容即为模拟响应内容。
module.exports = (requestInfo) => {
  return 'Your response data';
};
```

## 常见问题

1. Cannot assign to read only property 'exports' of object '#<Object>' at Module.eval
```
解法方法1: 在babel配置中设置 sourceType: unambiguous
  { // babel.config.js or .babelrc.js
    "presets": [...],
    "plugins": [...],
    sourceType: 'unambiguous'
  }

解法方法2: 把 [type] 选项设置为 es6。注意，es6 不能和代理模式一起使用。
  a. 命令行启动 http-request-mock:
    http-request-mock-cli -t es6 -w "vue-cli-service serve"
  b. webpack启动 http-request-mock:
    new HttpRequestMockPlugin({
      ...
      type: 'cjs',
      ...
    }),

```

## License

http-request-mock is licensed under the MIT license.
