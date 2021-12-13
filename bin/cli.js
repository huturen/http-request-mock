#!/usr/bin/env node
/* eslint-env node */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const program = require('commander');
const pkg = require('../package.json');
const readline = require('readline');
const chokidar = require('chokidar');
const protoParser = require('./proto/parser');
const WebpackPlugin = require('../plugin/webpack');

const appRoot = (() => {
  if (!/\bnode_modules\b/.test(__dirname)) return process.cwd();

  const root = __dirname.split('node_modules')[0];
  const json = path.resolve(root, 'package.json');
  if (!fs.existsSync(json)) return process.cwd();

  return fs.readFileSync(json, 'utf8').includes('"http-request-mock"') ? root : process.cwd();
})();

const spaces = ' '.repeat(33);

program
  .name('npx http-request-mock-cli')
  .usage('[options]')
  .description([
    `Description: http-request-mock command line tool at version ${pkg.version}.`,
    'Glossary: [.runtime.js] A runtime mock entry configuration file.',
    `Current working directory: \x1b[32m${appRoot}\x1b[0m`,
    'Example: ',
    '    npx http-request-mock-cli -i',
    '    npx http-request-mock-cli -i -e MOCK=yes',
  ].join('\n'))
  .option('-d, --directory [directory]', 'The mock directory relatives to the working directory.', 'mock')
  .option(
    '-e, --enviroment [variable-pair]',
    'Enable mock function by enviroment variable for .runtime.js.\n'+spaces,
    'NODE_ENV=development'
  )
  .option('-i, --init', 'Initialize .runtime.js & samples(if necessary) in the mock directory.')
  .option(
    '-w, --watch [command]',
    'Watch mock directory & update .runtime.js. If a command is specified,\n'+spaces+
    ' ths specified command will be executed together with watching.'
  )
  .option(
    '-j, --inject <app-entry-file>',
    'Inject .runtime.js into app entry file\n'+spaces+
    ' which must be relative to the working directory.\n'+spaces+
    ' NOTE: this is an experimental option.'
  )
  .option(
    '-t, --type [module-type]',
    'The module type of .runtime.js.\n'+spaces+
    ' Valid values are: es6(alias of module), cjs(alias of commonjs).\n'+spaces,
    'es6'
  )
  .option(
    '-p, --proto',
    'Generate mock files from a .protorc config file.'
  )
  .parse(process.argv);

program.enviroment = program.enviroment && /^\w+=\w+$/.test(program.enviroment)
  ? program.enviroment
  : '';

(function main() {
  if (program.init) {
    return init();
  }
  if (program.inject) {
    return inject();
  }
  if (program.watch) {
    return watch();
  }
  if (program.proto) {
    return proto();
  }
  program.help();
})();



async function init() {
  const dir = path.resolve(appRoot, program.directory);
  if (fs.existsSync(dir) && fs.statSync(dir).isFile()) {
    return log(`${dir} already exists and is not directory.`);
  }

  if (!fs.existsSync(dir)) {
    log(`${dir} does not exist.`);
    if (/^(yes|y|)$/i.test(await askInput('Are you sure to create it? [Yes/no]'))) {
      fs.mkdirSync(dir, { recursive: true });
    } else {
      return log('Nothing was happened.');
    }
  }

  const webpack = new WebpackPlugin({
    dir,
    entry: /1/,
    enviroment: program.enviroment,
    type: program.type,
  });
  if (!fs.existsSync(path.resolve(dir, '.runtime.js'))) {
    await copySampleFiles(dir);
  }

  const runtime = webpack.getRuntimeConfigFile();
  log('A runtime mock entry configuration has been initialized:');
  log(runtime);
}

async function inject() {
  const appEntryFile = path.resolve(appRoot, program.inject);
  if (!fs.existsSync(appEntryFile)) {
    log(`The specified app entry file [\x1b[31m${appEntryFile}\x1b[0m] does not exist.`);
    return;
  }

  await init();
  const dir = path.resolve(appRoot, program.directory);

  let runtime = path.resolve(dir, '.runtime.js');
  runtime = path.relative(path.resolve(appEntryFile, '../'), runtime);
  runtime = process.platform === 'win32' ? runtime.replace(/\\/g, '/') : runtime;
  runtime = /^\./.test(runtime) ? runtime : ('./'+runtime);

  const codes = [
    '/* eslint-disable */',
    (program.type === 'commonjs' || program.type === 'cjs'
      ? `require('${runtime}');`
      : `import '${runtime}';`),
    '/* eslint-enable */',
  ].join('\n');

  const entryContent = fs.readFileSync(appEntryFile, 'utf8');
  if (/(\/|\\)\.runtime\.js('|")/.test(entryContent)) {
    log(`The specified application entry file [\x1b[32m${appEntryFile}\x1b[0m] already contains '.runtime.js'.`);
    log('Please check out your application entry file.');
    return;
  }
  fs.writeFileSync(appEntryFile, codes+'\n'+entryContent);
  log(`[.runtime.js] dependency has been injected into [\x1b[32m${appEntryFile}\x1b[0m].`);
  log('Please check out your application entry file.');
}

function watch() {
  const dir = path.resolve(appRoot, program.directory);
  if (!fs.existsSync(path.resolve(dir, '.runtime.js'))) {
    log(`There is no a .runtime.js file in the mock directory: ${dir}.`);
    log('Please use command(npx http-request-mock-cli -i) to initialize it.');
    return;
  }

  log(`Watching: ${dir}`);
  const webpack = new WebpackPlugin({
    dir,
    entry: /1/,
    enviroment: program.enviroment,
    type: program.type,
  });
  const set = new Set();
  let timer = null;
  webpack.getRuntimeConfigFile(); // update .runtime.js before watching

  chokidar.watch(dir, {ignoreInitial: true}).on('all', (event, filePath) => {
    const filename = path.basename(filePath);
    // Only watch file that matches /^[\w][-\w]*\.js$/
    if (event === 'addDir' || event === 'error') return;
    if(filename && !/^[\w][-\w]*\.js$/.test(filename)) return;

    if (set.has(filename)) return;
    set.add(filename);

    clearTimeout(timer);
    timer = setTimeout(() => {
      const runtime = webpack.getRuntimeConfigFile();

      console.log(' ');
      log(`The changes of \x1b[32m[${[...set]}]\x1b[0m have been applied to .runtime.js.`);
      log(`${runtime} has been updated.`);
      set.clear();
    }, 300);
  });

  if (typeof program.watch === 'string') {
    spawn(program.watch, {
      cwd: appRoot, // process.cwd()
      env: process.env,
      stdio: 'inherit',
      detached: false,
      shell: true
    });
  }
}

function proto() {
  const configFile = path.resolve(appRoot, program.directory, '.protorc.js');
  generateProtorcFile(configFile);

  const protorcConfig = require(configFile);
  if (!protorcConfig.protoEntry) {
    console.log('Please set [protoEntry] option in the file below and run this command again.');
    return console.log('.protorc config file: ' + configFile);
  }
  if (!fs.existsSync(protorcConfig.protoEntry)) {
    return console.log(`file: ${protorcConfig.protoEntry} does not exist.`);
  }

  const outputDir = path.resolve(appRoot, program.directory, 'proto');
  fs.mkdirSync(outputDir, { recursive: true});
  protoParser.generateMockFiles({ protorcConfig, outputDir });
}

function generateProtorcFile(filePath) {
  if (fs.existsSync(filePath)) {
    return;
  }

  try {
    const tpl = path.resolve(__dirname, './proto/.protorc.js');
    const content = fs.readFileSync(tpl).toString().split('\n');
    content.splice(0, 1, 'const faker = require(\'http-request-mock/plugin/faker.js\');');
    // content.splice(0, 1, 'const faker = require(\'../plugin/faker.js\');');

    fs.writeFileSync(filePath, content.join('\n'));
  } catch(err) {
    console.log('Failed to generate proto config file: ' + err.message);
  }
}

function askInput(question) {
  return new Promise(resolve => {
    const opts = { input: process.stdin, output: process.stdout };
    const rl = readline.createInterface(opts);
    rl.question(question, (answer) => {
      resolve(answer.trim());
      rl.close();
    });
  });
}

function copySampleFiles(mockDirectory) {
  const sample = file => path.resolve(__dirname, 'samples', file);
  const mock = file => path.resolve(mockDirectory, file);

  return new Promise(resolve => {
    let count = 0;
    const callback = (err) => {
      if (err) throw err;
      if (++count >= 3) {
        resolve(true);
      }
    };
    fs.copyFile(sample('sample-dynamic.js'), mock('sample-dynamic.js'), callback);
    fs.copyFile(sample('sample-static.js'), mock('sample-static.js'), callback);
    fs.copyFile(sample('sample-times.js'), mock('sample-times.js'), callback);
  });
}

function log(...args) {
  console.log(`\x1b[32m[${time()}]\x1b[0m`, ...args);
}

function time() {
  const now = new Date();
  const two = num => num > 9 ? num : ('0' + num);
  return [
    now.getFullYear(),
    two(now.getMonth()+1),
    two(now.getDate())
  ].join('-') + ' ' +
  [
    two(now.getHours()),
    two(now.getMinutes()),
    two(now.getSeconds())
  ].join(':');
}
