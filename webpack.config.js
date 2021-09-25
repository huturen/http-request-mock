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
let env = 'full';
for(let i = 0; i < process.argv.length; i++) {
  if (/^--env=\w+$/.test(process.argv[i])) {
    env = process.argv[i].split('=')[1];
  } else if (process.argv[i] === '--env' && process.argv[i+1]) {
    env = process.argv[i+1];
  }
}

if (env === 'pure') {
  bundle = 'http-request-mock.pure.js';
  externals['faker/locale/en'] = 'commonjs faker/locale/en';
}


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
