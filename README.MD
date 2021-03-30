## xhr-response-mock
Utility for mocking by intercepting XMLHttpRequest raw request.
It's very convenient for development while your backend is not ready.

## Installation
```
npm install --save-dev xhr-response-mock
```

## Usage: More usage please refer to unit test.
```javascript
// mockConfig.js
import XhrResonseMock from 'xhr-response-mock';

const xhrResonseMock = new XhrResonseMock(mockData);
xhrResonseMock.mock({
  url: 'http://www.xyz.com/abc/efg?xx=yy',
  method: 'get',
  data: { ret: 0, msg: 'ok'}
});

// or:
xhrResonseMock.get('http://www.xyz.com/efg', { ret: 0, msg: 'ok'});

// business.js
import axios from 'axios';

axios({
  url: 'http://www.xyz.com/abc/efg?xx=yy',
  method: 'get',
}).then(res => {
  console.log('mock res:', res.data);
}).catch(err => {
  console.log('mock err:', err);
});
```

## Webpack plugin
#### Options:
1. enable: Whether or not to enable this plugin.
2. entry: Page entry in which mock data will be injected.
3. dir: Mock directory in which mock files will be stored.
4. watch: Callback when a mock file changes.
5. inject: By default, mock dependency will be auto injected.
           If specified, you can custom inject your mock dependency.

#### Example:
```javascript
// webpack.config.js
const XhrResponseMockWebpackPlugin = require('xhr-response-mock/WebpackPlugin');
module.exports = {
  // other plugins...
  plugins: [
    new XhrResponseMockWebpackPlugin({
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


## API
```
To be continuted...
```


## TODO
```
1. support fetch mock
2. support nodejs
3. support request params match
4. support http status mock
```
