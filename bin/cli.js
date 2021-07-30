#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const appRoot = require('app-root-path').path;
const pkg = require('../package.json');
const Webpack = require('../plugin/webpack');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('http-request-mock command line:');
console.log(`version: ${pkg.version}`);
console.log(`app root directory: ${appRoot}`);
console.log(' ');

const isExistedDirectory = (dir) => {
  try {
    stats = fs.lstatSync(dir);
    if (stats.isDirectory()) {
      return true;
    }
  } catch (e) { // eslint-disable-line
    return false;
  }
};

const generateRuntimeFile = () => {
  const webpack = new Webpack({
    dir: mockDir,
    entry: /fake-test/
  })
  const file = webpack.generateVerboseRuntimeDepsFile();
  console.log(`\nGenerate successfully: ${file}`);
};

const askToGenerate = (dir) => {
  console.log(`Mock directory: ${dir}`);
  rl.question(`Are you sure to generate a mock confguration file(.runtime.js) into it? [yes/NO]`, (answer) => {
    if (!/^\s*yes\s*$/i.test(answer)) {
      console.log('\nNothing happened.')
      return rl.close();
    }

    generateRuntimeFile();
    rl.close();
  });
};

const mockDir = [
  path.resolve(appRoot, './mock'),
  path.resolve(appRoot, './mocks'),
  path.resolve(appRoot, './src/mock'),
  path.resolve(appRoot, './src/mocks'),
].find(dir => isExistedDirectory(dir));

if (mockDir) {
  askToGenerate(mockDir);
} else {
  console.log(`It have failed to detect mock direcotry.`);

  const askToInput = () => {
    rl.question(`Please input mock directory:`, (dir) => {
      if (!isExistedDirectory(dir)) {
        console.log(`[${dir}] does not exist.`);
        return ask();
      }
      askToGenerate(dir);
    });
  }
  askToInput();
}
