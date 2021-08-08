const path = require('path');
const HttpRequestMockPlugin = require('http-request-mock/plugin/webpack');

module.exports = {
  configureWebpack: {
    plugins: [
      new HttpRequestMockPlugin({
        enable: true,
        entry: /src\/main\.js$/,
        dir: path.resolve(__dirname, 'mock/'),
        watch: (changedFile) => {
          console.log('mock file changed:', changedFile);
        },
      }),
    ],
  },

  devServer: {
    disableHostCheck: true,
  },
}
