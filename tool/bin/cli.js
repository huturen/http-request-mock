#!/usr/bin/env node
/* eslint-env node */

const { spawn } = require('child_process');
const { Command } = require('commander');

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pkg = require('../../package.json');
const { entryPoints, log, getAppRoot, watchDir } = require('../lib/misc.js');
const WebpackPlugin = require('../plugin/webpack.js');
const server = require('./server.js');

const program = new Command();

module.exports = new class CommandToolLine {
  constructor() {
    this.appRoot = getAppRoot();
    this.opts = this.setOptions();

    this.opts.environment = this.opts.environment && /^\w+=\w+$/.test(this.opts.environment)
      ? this.opts.environment
      : '';
    this.opts.index = entryPoints.includes(this.opts.index) ? this.opts.index : '';
    this.main();
  }

  /**
   * Main control flow
   */
  main() {
    if (this.opts.init) {
      return this.init();
    }
    if (this.opts.inject) {
      return this.inject();
    }
    if (this.opts.watch) {
      return this.watch();
    }
    if (this.opts.proxy === 'matched') {
      return this.proxy();
    }
  }

  /**
   * -i, --init: Initialize some samples & a .runtime.js in the mock directory
   */
  async init() {
    const dir = path.resolve(this.appRoot, this.opts.directory);
    if (fs.existsSync(dir) && fs.statSync(dir).isFile()) {
      return log(`${dir} already exists and is not directory.`);
    }

    if (!fs.existsSync(dir)) {
      log(`${dir} does not exist.`);
      if (/^(yes|y|)$/i.test(await this.askInput('Are you sure to create it? [Yes/no]'))) {
        fs.mkdirSync(dir, { recursive: true });
      } else {
        return log('Nothing was happened.');
      }
    }

    const webpack = new WebpackPlugin({
      dir,
      entry: /1/,
      type: this.opts.type,
      index: this.opts.index,
    });
    webpack.environment = this.opts.environment ? this.opts.environment.split('=') : null;

    this.copySampleFiles(dir);

    const runtime = webpack.setRuntimeConfigFile();
    log('A runtime mock entry configuration has been initialized:');
    log(runtime);
  }

  /**
   * -j, --inject <app-entry-file>: Inject .runtime.js into the specified entry relative to the working directory.
   */
  async inject() {
    const appEntryFile = path.resolve(this.appRoot, this.opts.inject);
    if (!fs.existsSync(appEntryFile)) {
      log(`The specified app entry file [\x1b[31m${appEntryFile}\x1b[0m] does not exist.`);
      return;
    }

    await this.init();
    const dir = path.resolve(this.appRoot, this.opts.directory);

    let runtime = path.resolve(dir, '.runtime.js');
    runtime = path.relative(path.resolve(appEntryFile, '../'), runtime);
    runtime = process.platform === 'win32' ? runtime.replace(/\\/g, '/') : runtime;
    runtime = /^\./.test(runtime) ? runtime : ('./'+runtime);

    const entryContent = fs.readFileSync(appEntryFile, 'utf8');
    if (/(\/|\\)\.runtime\.js('|")/.test(entryContent)) {
      log(`The specified application entry file [\x1b[32m${appEntryFile}\x1b[0m] already contains '.runtime.js'.`);
      log('Please check your application entry file.');
      return;
    }

    const isCjs = /\brequire\s*\(/.test(entryContent) && !/\bimport /.test(entryContent);
    const codes = [
      '/* eslint-disable */',
      (isCjs ? `require('${runtime}');` : `import '${runtime}';`),
      '/* eslint-enable */',
    ].join('\n');

    // It may throw an error when writing a file, which user cares.
    // So, no try-catch here, let it be.
    fs.writeFileSync(appEntryFile, codes+'\n'+entryContent);
    log(`[.runtime.js] dependency has been injected into [\x1b[32m${appEntryFile}\x1b[0m].`);
    log('Please check your application entry file.');
  }

  /**
   * -w, --watch [command]:
   * Watch mock directory & update .runtime.js. If the [command] is specified,
   * ths specified command will be executed together with watching.'
   */
  async watch() {
    const dir = path.resolve(this.appRoot, this.opts.directory);
    if (!fs.existsSync(path.resolve(dir, '.runtime.js'))) {
      log(`There is no a .runtime.js file in the mock directory: ${dir}.`);
      log('Please use command(npx http-request-mock-cli -i) to initialize it.');
      return;
    }

    const proxyServer = this.opts.proxy === 'matched'
      ? await server.init({
        type: this.opts.type,
        mockDir: dir,
        environment: this.opts.environment,
        proxyMode: this.opts.proxy
      })
      : '';
    log(`Watching: ${dir}`);
    const webpack = new WebpackPlugin({
      dir,
      entry: /1/,
      type: this.opts.type,
      index: this.opts.index,
      proxyMode: this.opts.proxy
    });

    webpack.environment = this.opts.environment ? this.opts.environment.split('=') : null;
    if (proxyServer) {
      webpack.proxyServer = this.opts.proxy + '@' + proxyServer;
    }

    watchDir(webpack, dir, (files) => proxyServer && server.reload(files));

    if (typeof this.opts.watch === 'string') {
      spawn(this.opts.watch, { cwd: this.appRoot, env: process.env, stdio: 'inherit', detached: false, shell: true });
    }
  }

  /**
   * -p, --proxy [mode]:
   *'Proxy mode. In proxy mode, http-request-mock will start a proxy server which receives
   * incoming requests on localhost. The mock files will be run in a nodejs environment.
   * This feature is designed for browser, so do not use it in a nodjs project.
   * Note: proxy mode is still under experimental stage, only for experts.
   * [matched] All requests matched by @url will be proxied to a proxy server.
   */
  proxy() {
    if (/^(matched)$/.test(this.opts.proxy)) {
      const dir = path.resolve(this.appRoot, this.opts.directory);
      server.init({ type: this.opts.type, mockDir: dir, environment: this.opts.environment, proxyMode: this.opts.proxy });
    }
  }

  /**
   * Ask for input
   * @param {string} question
   */
  askInput(question) {
    return new Promise(resolve => {
      const opts = { input: process.stdin, output: process.stdout };
      const rl = readline.createInterface(opts);
      rl.question(question, (answer) => {
        resolve(answer.trim());
        rl.close();
      });
    });
  }

  /**
   * Copy some samples into the specified mock directory.
   * @param {string} mockDirectory
   */
  copySampleFiles(mockDirectory) {
    fs.mkdirSync(mockDirectory, { recursive: true });

    const sampleTpl = path.resolve(__dirname, '../tpl/sample.tpl.js');
    const mockFile = path.resolve(mockDirectory, './sample.js');

    if (!fs.existsSync(mockFile)) {
      fs.copyFileSync(sampleTpl, mockFile);
    }
  }

  /**
   * Set command line options
   */
  setOptions() {
    const spaces = ' '.repeat(34);
    program
      .name('npx http-request-mock-cli')
      .usage('[options]')
      .description([
        `Description: http-request-mock command line tool at version ${pkg.version}.`,
        'Glossary: [.runtime.js] A runtime mock configuration entry file.',
        `Current working directory: \x1b[32m${this.appRoot}\x1b[0m`,
        'Example: ',
        '    npx http-request-mock-cli -i',
      ].join('\n'))
      .option('-d, --directory [directory]', 'The mock directory relative to the working directory.', 'mock')
      .option(
        '-e, --environment [variable-pair]',
        'Enable mock function by environment variable for .runtime.js.\n'+spaces,
        'NODE_ENV=development'
      )
      .option('-i, --init', 'Initialize some samples & a .runtime.js in the mock directory.')
      .option(
        '-w, --watch [command]',
        'Watch mock directory & update .runtime.js. If the [command] is specified,\n'+spaces+
        ' ths specified command will be executed together with watching.'
      )
      .option(
        '-j, --inject <app-entry-file>',
        'Inject .runtime.js into the specified entry relative to the working directory.'
      )
      .option(
        '-t, --type [module-type]',
        'The module type of .runtime.js.\n'+spaces+
        ' Possible values are: es6(alias of ESM), cjs(alias of commonjs).\n'+spaces,
        'cjs'
      )
      .option(
        '--index [index-entry]',
        'Index entry, automatic detection by default.\n'+spaces+
        ' Possible values are: src/index.js, http-request-mock.js and http-request-mock.esm.mjs.\n'+spaces+
        ' [src/index.js] for commonJS\n'+spaces+
        ' [http-request-mock.js] for UMD\n'+spaces+
        ' [http-request-mock.pure.js] An alternative version without faker and cache plugins for UMD.\n'+spaces+
        ' [http-request-mock.esm.mjs] for ESM\n'+spaces+
        ' [http-request-mock.pure.esm.mjs] An alternative version without faker and cache plugins for ESM.\n'
      )
      .option(
        '-p, --proxy [mode]',
        'Proxy mode. In proxy mode, http-request-mock will start\n'+spaces+
        ' a proxy server which receives incoming requests on localhost.\n'+spaces+
        ' The mock files will be run in a nodejs environment.\n'+spaces+
        ' This feature is designed for browser, so do not use it in a nodjs project.\n'+spaces+
        ' Note: proxy mode is still under experimental stage, only for experts.\n'+spaces+
        ' [matched] All requests matched by @url will be proxied to a proxy server.',
        'none'
      )
      .parse(process.argv);
    return program.opts();
  }
};
