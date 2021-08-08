# http-request-mock

无侵入mock，模拟http, https网络请求，再也不需要修改你的源代码来模拟网络请求返回了。
支持 XMLHttpRequest， fetch， wx.request(小程序)，Axios, jQuery, SuperAgent。

## 目录

* [简介](#简介)
* [特性](#特性)
* [安装](#安装)
* [例子](#例子)
    - [使用](#使用)
    - [静态响应](#静态响应)
    - [动态响应](#动态响应)
    - [延迟响应](#延迟响应)
    - [状态码及头信息模拟](#状态码及头信息模拟)
    - [完整示例](#完整示例)
* [目录结构](#目录结构)
* [webpack插件](#webpack插件)
* [命令行工具](#命令行工具)
* [API文档](#API文档)
* [单元测试](#单元测试)
* [License](#License)



## 简介

在后台接口未开发好或接口挂掉，甚至无网络环境的情况下，这个库可以让你不受干扰的继续开发，以快速构建产品原型。
此外，我们还提供了一个额外webpack插件，进行简单配置后，可以不侵入源代码，来完成网络请求的模拟处理。



本库基于拦截 `XHR(XMLHttpRequest)`,  `fetch` ,  `wx.request`实现。

如果请求有匹配到mock配置，则返回mock配置数据，否则走真实的网络请求。

因为是通过拦截实现，较之其他mock库，提供了更可靠的稳定性。



目前现存的mock库，存在以下这些问题：
1. 使用mock时，需要修改源代码，在mock完毕后可能需要再把代码改回来

2. 配置复杂，需要使用这样或者那样的本地服务，或者代理

3. 不能随着应用打包

4. 模拟请求 与 真实网络请求不能混合使用



## 特性

本库提供了以下特性:

* **配置简单**: 免去了格式样的本地服务，代理或其他复杂的配置。
* **无侵入**: 支持不侵入源代码来实现mock处理。
* **自动拆卸**: 自动拆卸，启动跟关闭mock功能均不需要修改源码。
* **丰富的请求库支持**: Axios, jQuery, SuperAgent, fetch, XHR, wx.request。
* **支持测试库及Node环境**: 支持jest，mocha测试库运行环境，甚至裸node运行环境。
* **动态内容响应**: 基于请求信息，如url，查询参数，post请求包体，来动态模拟返回内容。
* **URL局部匹配及正则匹配**: 支持URL局部匹配及RegExp正则匹配。
* **网络延迟模拟**: 支持模拟网络请求的时延，精确到毫秒级别。
* **http状态码模拟**: 支持http状态码模拟。
* **http响应头模拟**: http响应头模拟。
* **可和真实网络请求混用**: 部分接口使用模拟请求，部分接口使用真实请求。
* **随应用打包**: 支持mock数据可随应用打包，以快速交付产品原型。
* **mock文件依赖自动查找&动态引入**: 自动匹配拦截请求，并匹配mock依赖文件，并动态引入。
* **丰富的单元测试验证**: 具有较完整的单元测试。
* **支持跨域请求**: 支持跨域请求模拟。



## 安装

`npm install --save-dev http-request-mock`



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
  response: 'some response data'
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
// requestInfo 请参考 src/types.ts 中的 < XhrRequestInfo | FetchRequestInfo | WxRequestInfo>
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

#### 完整示例
```javascript
mocker.mock({
  url: 'www.api.com/tmp',
  status: 200,
  delay: 1000,
  header: {
    'content-type': 'application/text',
    'some-header': 'some-header-value',
  },
  response(requestInfo) {
    console.log('requestInfo:', requestInfo);
    return 'test response';
  }
});

let time = Date.now();
axios.get('https://www.api.com/tmp?abc=1234&efg=xxx').then(res => {
  console.log('spent:', Date.now() - time);
  console.log('response body:', res.data);
  console.log('response header:', res.headers);
});

// 以上会输出以下类似的内容：
// requestInfo: {
//   url: 'https://www.api.com/tmp?abc=1234&efg=xxx',
//   method: 'GET',
//   async: true,
//   user: null,
//   password: null,
//   header: { Accept: 'application/json, text/plain, */*' },
//   query: { abc: '1234', efg: 'xxx' },
//   body: null
// }
// spent: 1015
// response body: test response
// response header: {
//   'content-type': 'application/text',
//   'some-header': 'some-header-value',
//   'x-powered-by': 'http-request-mock'
// }
```


## 目录结构
本项目没有统一的目录结构，但推荐按以下目录结构来安排代码：
```
App
├─── mock/
|   ├─── .runtime.js (mock配置入口文件，可加入到.gitignore文件)
|   ├─── config.js
|   ├─── detail.js
|   ├─── (...其他mock文件)
├─── src/
|   ├─── index.js (业务入口文件)
|   ├─── (...其他业务代码)
```

mock配置入口文件 mock/.runtime.js：
```javascript
import configInfo from './config.js';
import userDetail from './user.js';

import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

mocker.get('https://some.api.com/config', configInfo);
mocker.post('https://some.api.com/user', userDetail);
```


注意：注释中的 @url, @method 等标签信息，会被webpack插件所解析并使用
```javascript
// mock文件 config.js：
/**
 * @url https://some.api.com/config
 * @method post
 */
export default {
  enable: false,
  title: 'Some Title',
  ...
};

// mock文件 user.js：
/**
 * @url https://some.api.com/user
 * @method post
 */
export default {
  name: 'John',
  age: 25,
  ...
};
```

业务入口文件 src/index.js：
```javascript
import '../mock/.runtime.js'; // 在顶部引入即可
import Vue from 'vue';
import App from './App.vue';
...
```


### webpack插件

为避免修改你的业务源码入口文件（如，src/index.js）。

我们额外提供了一个内置webpack插件，引入方式如下：

在你的 `webpack` 配置文件中：
```javascript

const path = require('path');
const HttpRequestMockWebpackPlugin = require('http-request-mock/plugin/webpack.js');
module.exports = {
  // ...
  plugins: [
    // ...
    new HttpRequestMockWebpackPlugin(
      enable: process.env.DO_MOCK === 'yes', // 这里环境变量DO_MOCK为yes时，才启用插件
      entry: /src\/index\.js$/,
      dir: path.resolve(__dirname, 'mock/'),
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
    "mock-dev": "DO_MOCK=yes npm run serve"
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
| **runtime** | 可选   | mock配置文件入口类型，合法的值有 internal, external, verbose |
| **watch** | 可选   | 回调函数，mock配置文件修改是触发，回调参数为变更的mock文件 |
| **transpile** | 可选   | 是否转译选项mock目录下的文件，默认为true   |

* transpile: 如果你对这个选项感到困惑，请使用默认值

* runtime:
    - internal: (默认值) 使用插件自带的入口文件 *plugin/runtime.js*
    - external: 在用户定义的mock目录中， 动态生成mock入口文件 *.runtime.js*
    - verbose: 和 external 类似，只是生成的 *.runtime.js* 文件内容，具有每个mock项的详细内容





## 命令行工具



如果你不使用webpack，可以使用自带的命令，生成mock配置入口文件。

在项目目录下运行 `npx http-request-mock-cli` 然后跟着提示走。

这个命令，会在mock目录下面，根据你的mock目录下面的文件，自动生成mock入口配置文件。



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

Set up request mock for http.get, https.get, http.request and https.request in node envrioment.

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

**get(url: RegExp | String, response: any, delay = 0, status = 200, header = {})**

Make a mock item that matches an HTTP GET request.

**post(url: RegExp | String, response: any, delay = 0, status = 200, header = {})**

Make a mock item that matches an HTTP POST request.

**put(url: RegExp | String, response: any, delay = 0, status = 200, header = {})**

Make a mock item that matches an HTTP PUT request.

**patch(url: RegExp | String, response: any, delay = 0, status = 200, header = {})**

Make a mock item that matches an HTTP PATCH request.

**delete(url: RegExp | String, response: any, delay = 0, status = 200, header = {})**

Make a mock item that matches an HTTP DELETE request.

**any(url: RegExp | String, response: any, delay = 0, status = 200, header = {})**

Make a mock item that matches an HTTP GET, POST, PUT, PATCH or DELETE  request.


## 单元测试

本库支持常用单元测试库，支持jest， mocha，或其他 node测试环境。

本库的单元测试，也是基于本库自带的库完成的验证测试。

jest测试环境：
```javascript
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setupForUnitTest('xhr');

describe('mock axios request', () => {
  it('url config item should support partial matching', (done) => {
    mocker.get('www.api.com/some-path', 'your fake response content');

    axios.get('https://www.api.com/some-path', 'get').then(res => {
      expect(res.data).toBe('your fake response content');
    }),
  });
});
```

2. mocha测试环境, 请参考： `experiment/mocha.js`


3. 其他node测试环境，请参考： `experiment/node.js`


## License

http-request-mock is licensed under the MIT license.
