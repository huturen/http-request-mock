## xhr-response-mock
Utility for mocking by intercepting XMLHttpRequest raw request.
It's very convenient for development while your backend is not ready.

## Installation
```
npm install --save-dev xhr-response-mock
```

## Usage: More usage please refer to unit test.
```javascript
import XhrResonseMock from 'xhr-response-mock';
const mock = XhrResonseMock.setup();

// set a mock response for all GET requests matched /.*\/xyz/
mock.get(/.*\/xyz/, { ret: 0, msg: 'ok'});

// set a mock response for all POST requests matched http://www.xyz.com/abc/efg
mock.post('http://www.xyz.com/abc/efg', { ret: 0, msg: 'ok'});



// send a request based on XHR
import axios from 'axios';
axios.get('http://www.api.com/xyz', res => console.log(res.data));
```

## Webpack plugin
With this webpack plugin, it will automatically find your mock files and inject the page entry.

#### Options:
1. enable: Whether or not to enable this plugin.
2. entry: Page entry in which mock data will be injected.
3. dir: Mock directory in which mock files will be stored.
4. watch: Callback when a mock file changes.
5. inject: By default, mock dependency will be auto injected.
           If false is specified, nothing will be injected.
           If function is specified, you can custom inject your mock dependency.
```javascript
  // ...
  const WebpackPlugin = require('xhr-response-mock/plugin/Webpack');

  plugins: [
    new WebpackPlugin({
      enable: process.env.NODE_ENV === 'development',
      entry: /src\/pages\/[-\w]+\/index\.js$/,
      dir: path.resolve(__dirname, 'mock/'),
      inject: (source, runtimeDepsFile) => {
        console.log('source, runtimeDepsFile:', source, runtimeDepsFile);
        return `import '${runtimeDepsFile}';\n${source}`;
      },
    }),
  ],
  // ...
```

#### Example:
```javascript
// webpack.config.js
const WebpackPlugin = require('xhr-response-mock/plugin/Webpack');
module.exports = {
  // other plugins...
  plugins: [
    new WebpackPlugin({
      enable: process.env.NODE_ENV === 'development',
      entry: /src\/pages\/[-\w]+\/index\.js$/,
      dir: path.resolve(__dirname, 'mock/'),
      watch: (changedFile) => {
        console.log('mock file changed:', changedFile);
      },
    }),
  ],
  // other plugins...
}
```

#### Mock files
With this webpack plugin you can define you mock files like this:
```javascript
/**
 * @url http://some.api.com/getSample
 * @method get
 * @disable no
 */
module.exports = {
  ret: 0,
  msg: 'ok',
  data: 'sample-data',
};
```
Yes, this webpack plugin will parse mock files comments and extract tags(@url, @method, ...).
All your need is writing the corresponding mock files.



## API
#### .setup()

Setup to intercept XMLHttpRequest request.

#### .setupForUnitTest(fn)

Setup to intercept XMLHttpRequest request for unit test.

#### .reset()

Reset all the mock request config.

#### .get(url | regex, mock)

Register a mock response config for all GET requests to match the specific URL.

#### .post(url | regex, mock)

Register a mock response config for all POST requests to match the specific URL.

#### .put(url | regex, mock)

Register a mock response config for all PUT requests to match the specific URL.

#### .patch(url | regex, mock)

Register a mock response config for all PATCH requests to match the specific URL.

#### .delete(url | regex, mock)

Register a mock response config for all DELETE requests to match the specific URL.


## TODO
```
1. support fetch
2. support nodejs
3. support request params match
4. support http status mock
```
