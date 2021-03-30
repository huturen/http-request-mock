const path = require('path');

module.exports = {
  entry: {
    index: './src/index.ts',
    plugin: './plugin/Webpack.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'umd2',
  },
  node: {
    child_process: 'empty',
    fs: 'empty',
    module: 'empty',
    path: 'empty'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  externals: {
    'simple-functional-loader': 'simple-functional-loader',
    'comment-parser': 'comment-parser',
    'webpack': 'webpack',
  },
  module: {
    rules: [
      {
        test: /.node$/,
        loader: 'node-loader',
      },
      {
        test: /\.js?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ]
  }
}
