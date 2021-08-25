// You can require this file to update .runtime.js as your need.
const path = require('path');
const fs = require('fs');
const WebpackPlugin = require('../webpack');

function copySampleFiles(mockDirectory) {
  const sample = file => path.resolve(__dirname, '../bin/samples', file);
  const mock = file => path.resolve(mockDirectory, file);

  fs.copyFileSync(sample('sample-dynamic.js'), mock('sample-dynamic.js'));
  fs.copyFileSync(sample('sample-static.js'), mock('sample-static.js'));
  fs.copyFileSync(sample('sample-times.js'), mock('sample-times.js'));
}

module.exports = function update(mockDirectory, enviroment = 'NODE_ENV=development') {
  const dir = path.resolve(mockDirectory);
  if (fs.existsSync(dir) && fs.statSync(dir).isFile()) {
    throw new Error(`${dir} already exists and is not directory.`);
  }

  if (!fs.existsSync(dir)) {
    throw new Error(`${dir} does not exist.`);
  }

  const webpack = new WebpackPlugin({ entry: /1/, dir, enviroment });
  if (!fs.existsSync(path.resolve(dir, '.runtime.js'))) {
    copySampleFiles(dir);
  }

  const runtime = webpack.getRuntimeConfigFile();
  return runtime;
};
