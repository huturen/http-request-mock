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
const server = require('./server');

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
    ' Possible values are: es6, cjs(alias of commonjs).\n'+spaces,
    'cjs'
  )
  .option(
    '-p, --proxy [mode]',
    'Proxy mode. In proxy mode, http-request-mock will start\n'+spaces+
    ' a proxy server which recives incoming requests on localhost.\n'+spaces+
    ' The module type of .runtime.js will be changed to cjs and\n'+spaces+
    ' mock files will be run in a node enviroment.\n'+spaces+
    ' Note: proxy mode is still under experimental stage, only for experts.\n'+spaces+
    ' [matched] Proxy requests which are matched your defined mock items.\n'+spaces+
    ' [all] Proxy all incoming requests.\n'+spaces+
    ' [none] Do not start a proxy server.',
    'none'
  )
  .option(
    '--proto',
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
  if (program.proxy === 'matched' && program.proxy === 'all') {
    return proxy();
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
  await copySampleFiles(dir);

  const runtime = webpack.setRuntimeConfigFile();
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

async function watch() {
  const dir = path.resolve(appRoot, program.directory);
  if (!fs.existsSync(path.resolve(dir, '.runtime.js'))) {
    log(`There is no a .runtime.js file in the mock directory: ${dir}.`);
    log('Please use command(npx http-request-mock-cli -i) to initialize it.');
    return;
  }

  const proxyServer = program.proxy === 'matched' || program.proxy === 'all'
    ? await server.init({ proxyMode: program.proxy, mockDir: dir, enviroment: program.enviroment, })
    : null;
  log(`Watching: ${dir}`);
  const webpack = new WebpackPlugin({
    dir,
    entry: /1/,
    enviroment: program.enviroment,
    type: program.type,
    proxyMode: program.proxy
  });
  if (proxyServer) {
    webpack.proxyServer = proxyServer;
  }

  const pathsSet = new Set();
  let timer = null;
  webpack.setRuntimeConfigFile(); // update .runtime.js before watching

  chokidar.watch(dir, {ignoreInitial: true}).on('all', (event, filePath) => {
    const filename = path.basename(filePath);
    // Only watch file that matches /^[\w][-\w]*\.js$/
    if (event === 'addDir' || event === 'error') return;
    if(filename && !/^[\w][-\w]*\.js$/.test(filename)) return;

    if (pathsSet.has(filePath)) return;
    pathsSet.add(filePath);

    clearTimeout(timer);
    timer = setTimeout(() => {
      const runtime = webpack.setRuntimeConfigFile();
      proxyServer && server.reload([...pathsSet]);

      console.log(' ');
      log(`${runtime} has been updated.`);
      pathsSet.clear();
    }, 100);
  });

  if (typeof program.watch === 'string') {
    spawn(program.watch, { cwd: appRoot, env: process.env, stdio: 'inherit', detached: false, shell: true });
  }
}

function proxy() {
  if (program.proxy === 'matched' && program.proxy === 'all') {
    const dir = path.resolve(appRoot, program.directory);
    server.init({ mockDir: dir, enviroment: program.enviroment, });
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
  protoParser.generateMockFiles(protorcConfig, outputDir);
}

function generateProtorcFile(filePath) {
  if (fs.existsSync(filePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true});
  try {
    const tpl = path.resolve(__dirname, './proto/.protorc.js');
    const content = fs.readFileSync(tpl).toString().split('\n');
    content.splice(0, 1, 'const faker = require(\'http-request-mock/plugin/faker.js\').shadow;');
    // content.splice(0, 1, 'const faker = require(\'../plugin/faker.js\').shadow;');

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
  const samplesDirectory = path.resolve(mockDirectory, 'samples');
  const sample = file => path.resolve(__dirname, '../tpl/samples', file);
  const mock = file => path.resolve(samplesDirectory, file);
  fs.mkdirSync(samplesDirectory, { recursive: true });

  if (!fs.existsSync(mock('dynamic.js'))) {
    fs.copyFileSync(sample('dynamic.js'), mock('dynamic.js'));
  }
  if (!fs.existsSync(mock('static.js'))) {
    fs.copyFileSync(sample('static.js'), mock('static.js'));
  }
  if (!fs.existsSync(mock('times.js'))) {
    fs.copyFileSync(sample('times.js'), mock('times.js'));
  }
}

function log(...args) {
  console.log('\x1b[32m[http-request-mock]\x1b[0m', ...args);
}

