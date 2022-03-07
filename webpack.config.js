/* eslint-env node */
// This file is used to generate UMD bundles.
const path = require('path');
const webpack = require('webpack');


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
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      'fs': false,
      'tls': false,
      'net': false,
      'util': false,
      'path': false,
      'zlib': false,
      'http': false,
      'https': false,
      'stream': false,
      'crypto': false,
      'url': false,
    }
  },
  plugins: [
    new webpack.IgnorePlugin({
      checkResource(resource) {
        return /dummy\/(fetch|wx-request|xhr)/.test(resource) || /\/node\/http-and-https/.test(resource);
      },
    })
  ],
  output: {
    filename: 'http-request-mock.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'HttpRequestMock',
    libraryTarget: 'umd',
    libraryExport: 'default'
  },
};
