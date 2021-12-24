/* eslint-env node */
// This file is used to generate UMD bundles.
const path = require('path');
const externals = {
  http: 'http',
  https: 'https',
  zlib: 'zlib',
  net: 'net',
  util: 'util',
  url: 'url',
};

let bundle = 'http-request-mock.js';

module.exports = {
  mode: 'production',  // development, production
  entry: './src/index.ts',
  // devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  // make node modules external
  externals,
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [],
  output: {
    filename: bundle,
    path: path.resolve(__dirname, 'dist'),
    library: 'HttpRequestMock',
    libraryTarget: 'umd',
    libraryExport: 'default'
  },
};
