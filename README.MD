# http-mock-request

无侵入mock，模拟http, https网络请求，再也不需要修改你的源代码来模拟数据返回了。

## 目录

* [特性](#feature)
* [安装](#setup)
* [使用](#usage)
* [例子](#example)
    - [静态响应](#static-response)
    - [动态响应](#dynamic-response)
    - [延迟响应](#delay-response)
* [目录结构](#directory-structure)
* [webpack 插件](#webpack-plugin)
* [命令行工具](#command-line)
* [API文档](#api)
* [其他](#other)
* [License](#license)


<a name="feature"></a>
## 特性

在后台接口未开发好或接口挂掉，甚至无网络环境的情况下，这个库可以让你不受干扰的继续开发，以快速构建产品原型。
此外，我们还提供了一个额外webpack插件，进行简单配置后，使得可以修改任何一行源代码，来完成网络请求的模拟处理。

目前现存的mock库，存在以下这些问题：
1. 使用mock时，需要修改源代码，在mock完毕或者使用真实网络请求时，改需要把代码改回来
2. 配置复杂，需要使用这样或者那样的本地服务，或者代理
3. 不能随着应用打包
4. 模拟请求 与 真实网络请求不能混合使用


本库提供了以下特性:

* **无侵入**: 不需要修改源代码，不需要再源码中倒腾来倒腾去。
* **配置简单**: 免去了格式样的本地服务，代理或其他复杂的配置，mock数据支持一次配置多次复用。
* **丰富的请求库支持**: Axios(基于XHR), jQuery(基于XHR), SuperAgent(基于XHR), fetch, XHR, wx.request.
* **动态内容响应模拟**: 基于请求信息，如url，查询参数，post请求包体，来动态模拟返回内容
* **URL局部匹配及正则匹配**: 支持URL局部及RegExp正则匹配
* **网络延迟模拟**: 支持模拟网络请求的时延，精确到毫秒级别
* **http状态码模拟**: 支持http状态码模拟
* **http响应头模拟**: http响应头模拟
* **可和真实网络请求混用**: 部分接口使用模拟请求，部分接口使用真实请求
* **自动拆卸**: 可配置环境变量是否启用mock（如DO_MOCK=yes npm run serve）启动，mock文件支持单独禁用或启用
* **随应用打包**: 支持mock数据随应用打包，快速交付产品原型
* **mock文件依赖自动查找&动态引入**: 自动匹配拦截请求，并匹配mock依赖文件，并动态引入，mock文件全局范围内共享
* **丰富的单元测试及单元测试支持**: 具有较完整的单元测试，并且，本库支持单元测试（可再jest，mocha下跑）
* **支持跨域请求**: 支持跨域请求

<a name="setup"></a>
## 安装

`npm install --save-dev http-mock-request`


<a name="usage"></a>
## 使用

本库基于拦截 `XHR(XMLHttpRequest)`, `fetch`, wx.request实现。
如果请求有匹配到mock配置，则返回mock配置数据，否则走真实的网络请求。

<a name="example"></a>
## 例子


<a name="static-response"></a>
### 静态响应

#### 配置

要模拟一个请求，只需简单调用`mock`或者 `get`,`post`,`put`,`patch`,`delete` 就可以了。

mock配置文件（如果你使用webpack插件，可免去这个文件的配置）
```javascript
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

mocker.get('https://www.api.com/text-response', '<html>mock response content</html>');
mocker.get('https://www.api.com/json-response', { ret: 0, msg: 'ok' });
```

你的业务文件
```javascript
...
const text = await axios({ url: 'https://www.api.com/text-response?arg=xxx' });
const json = await axios({ url: 'https://www.api.com/json-response?arg=yyy', responseType: 'json' });
console.log(text); // <html>mock response content</html>
console.log(json); // { ret: 0, msg: 'ok' }
...
```

<a name="dynamic-response"></a>
### 动态响应

本插件支持动态返回响应内容，以模拟真实网络请求。

mock配置文件
```javascript
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

let times = 0;
// requestInfo 请参考 src/types.ts 中的 < XhrRequestInfo | FetchRequestInfo | WxRequestInfo>
mocker.get('https://www.api.com/dynamic-response', (requestInfo) => {
  times = times + 1;
  return { msg: 'times: ' + times, url: requestInfo.url };
});
```

你的业务文件
```javascript
...
const res1 = await axios({ url: 'https://www.api.com/dynamic-response?a=1', responseType: 'json' });
const res2 = await axios({ url: 'https://www.api.com/dynamic-response?b=2', responseType: 'json' });
console.log(res1); // { msg: 'times: 1', url: 'https://www.api.com/dynamic-response?a=1' }
console.log(res2); // { msg: 'times: 2', url: 'https://www.api.com/dynamic-response?b=2' }
...
```

<a name="delay-response"></a>
### 延迟响应
#### 延迟模拟响应

配置文件内容：
```javascript
import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();
mocker.mock({
  url: 'https://some.api.com/name',
  method: 'get',
  delay: 3000 // 如果匹配到请求，3秒后执行返回响应内容
});
```

业务代码:
```javascript
let time = Date.now();
axios.get('https://some.api.com/name').then(() => {
  console.log(Date.now() - time); // >= 3000
});
```


<a name="directory-structure"></a>
## 目录结构
本项目没有统一的目录结构，但推荐按以下目录结构来安排代码：
```
App
├─── mock/
|   ├─── .runtime.js (mock配置入口文件，可加入到.gitignore文件)
|   ├─── config-info.js
|   ├─── user-detail.js
|   ├─── (...其他mock文件)
├─── src/
|   ├─── index.js (业务入口文件)
|   ├─── (...其他业务代码)
```

mock配置入口文件 mock/.runtime.js：
```javascript
import configInfo from './config-info.js';
import userDetail from './user-detail.js';

import HttpRequestMock from 'http-request-mock';
const mocker = HttpRequestMock.setup();

mocker.get('https://some.api.com/get-config', configInfo);
mocker.post('https://some.api.com/get-user', userDetail);
```

mock文件 user-detail.js：
注意：注释中的 @url, @method 会被webpack插件所使用并解析
```javascript
/**
 * @url https://some.api.com/get-user
 * @method post
 */
export default {
  id: 1234,
  name: 'John',
  age: 25,
  ...
};
```

业务入口文件 src/index.js：
```javascript
import Vue from 'vue';
import App from './App.vue';

if (process.env.DO_MOCK === 'yes') {
  import '../mock/.runtime.js';
}

启动开发命令时，设置 `DO_MOCK=yes npm run serve`
```

<a name="webpack-plugin"></a>
### webpack 插件

为避免修改你的入口文件（如，src/index.js）。我们额外提供了一个内置webpack插件，引入方式如下：

```javascript
// webpack配置文件
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
      watch: (changedFile) => {
        console.log('mock file changed:', changedFile);
      },
    ),
    // ...
  ]
};
```
此插件，会自动注入mock入口文件并自动转译相关代码，然后启动mock。
注意之类根据环境变量 DO_MOCK 来决定是否启动插件，这意味着配置后再更改配置文件。
可以再package.json中，配置script命令，起到自动拆卸的mock的功能。
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
* entry     必填，正则对象，用于匹配入口文件
* dir       必填，绝对路径，mock文件夹用于存放mock配置文件，
* watch     可选，回调函数，mock配置文件修改是触发
* enable    可选，是否启用该插件，默认 true
* transpile 可选，是否转译选项mock目录下的文件，默认为true，如果你对这个选项感到困惑，请使用默认值
* runtime   可选，mock配置文件入口类型，合法的值有 [internal， external, custom]
                internal: (默认值) 使用插件自带的入口文件 plugin/runtime.js
                external: 动态生成入口文件，并存放于用户的mock目录下的 .runtime.js 文件中
                custom: 和 external 类似，只是不会覆盖已经存在的 .runtime.js 文件

<a name="command-line"></a>
### 命令行工具

TODO: 待完善...


<a name="api"></a>
## API文档

### For HttpRequestMock

**.setup**:
Auto detect request enviroment and setup request mock.

**.setupForWx**:
Setup request mock for wx.request.

**.setupForXhr**:
Setup request mock for XMLHttpRequest.

**.setupForFetch**:
Setup request mock for fetch.

**.setupForUnitTest**:
Setup request mock for unit test.

### For Mocker
##### setMockData(mockConfigData: MockConfigData)
Set global mock data configuration.

##### reset()
Reset global mock data configuration.

##### mock(mockItem: MockItemInfo)
Check specified mock item & add it to global mock data configuration.


##### get(url: RegExp | String, response, delay = 0, status = 200, header: object = {})
Make a mock item that matches an HTTP GET request.


##### post(url: RegExp | String, response, delay = 0, status = 200, header: object = {})
Make a mock item that matches an HTTP POST request.

##### put(url: RegExp | String, response, delay = 0, status = 200, header: object = {})
Make a mock item that matches an HTTP PUT request.

##### patch(url: RegExp | String, response, delay = 0, status = 200, header: object = {})
Make a mock item that matches an HTTP PATCH request.

##### delete(url: RegExp | String, response, delay = 0, status = 200, header: object = {})
Make a mock item that matches an HTTP DELETE request.

##### any(url: RegExp | String, response, delay = 0, status = 200, header: object = {})
Make a mock item that matches an HTTP GET, POST, PUT, PATCH or DELETE  request.


<a name="other"></a>
## 其他

<a name="license"></a>
## License

http-request-mock is licensed under the MIT license.
