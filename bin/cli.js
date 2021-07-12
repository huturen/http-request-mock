const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pkg = require('../package.json');
const Webpack = require('../plugin/webpack');

const root = path.dirname(require.main.filename);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('http-request-mock command line:');
console.log(`version: ${pkg.version}`);
console.log(`root: ${root}`);
console.log(' ');

console.log('global.__basedir:', global.__basedir);
console.log('require.main.filename:', require.main.filename);

const isExistedDirectory = (dir) => {
  try {
    stats = fs.lstatSync(dir);
    if (stats.isDirectory()) {
      return true;
    }
  } catch (e) { // eslint-disable-line
    return false;
  }
}

const mockDir = [
  path.resolve(root, './mock'),
  path.resolve(root, './mocks'),
  path.resolve(root, './src/mock'),
  path.resolve(root, './src/mocks'),
].find(dir => isExistedDirectory(dir));

if (mockDir) {
  console.log(`Mock directory: ${mockDir}`);
  rl.question(`Are you sure to generate a mock confguration file into it? [yes/NO]`, (answer) => {
    if (!/^\s*yes\s*$/i.test(answer)) return rl.close();

    const webpack = new Webpack({
      dir: mockDir,
      entry: /fake-test/
    })
    const file = webpack.generateCustomRuntimeDepsFile(true);
    console.log(`Generate successfully: ${file}`);
    rl.close();
  });
  return;
}
console.log(`It have failed to detect mock direcotry.`);

const ask = () => {
  rl.question(`Please input mock directory:`, (dir) => {
    if (!isExistedDirectory(dir)) {
      console.log(`[${dir}] does not exist.`);
      return ask();
    }

    console.log(`Mock directory: ${dir}`);
    rl.question(`Are you sure to generate a mock confguration file into it? [yes/NO]`, (answer) => {
      if (!/^\s*yes\s*$/i.test(answer)) {
        finish = true;
        return rl.close();
      }

      const webpack = new Webpack({
        dir: mockDir,
        entry: /fake-test/
      })
      const file = webpack.generateCustomRuntimeDepsFile(true);
      console.log(`Generate successfully: ${file}`);

      finish = true;
      rl.close();
    });
  });
}
ask();

