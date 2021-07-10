const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const { createLoader } = require('simple-functional-loader');
const { parse, tokenizers } = require('comment-parser/lib');

const PLUGIN_NAME = 'HttpRequestMockMockPlugin';
module.exports = class HttpRequestMockMockPlugin {
  /**
   * http-mock-request parameters
   *
   * @param {RegExp} entry Required, entry file which mock dependencies will be injected into.
   * @param {string} dir Required, mock directory which contains all mock files & the runtime mock configure file.
   *                     Must be an absolute path.
   * @param {function} watch Optional, callback when some mock file is changed.
   * @param {boolean} enable Optional, whether or not to enable this plugin, default to true.
   * @param {string} runtime Optional, the style of mock configure entry file, one of [internal external custom],
   *                         default to 'internal' which use the build-in mock configure entry file.
   * @param {boolean} transpile Optional, whether or not to transpile files in the mock directory, default to true.
   *                            If mock directory were in src/ or other directory that has configured to be transpiled,
   *                            then set transpile to false. If this option would confuse you, let it be true.
   */
  constructor({
    entry,
    dir,
    watch,
    enable = true,
    runtime = 'internal', // internal external customized
    transpile = true,
  }) {
    if (!(entry instanceof RegExp)) {
      throw new Error('The HttpRequestMockMockPlugin expects [entry] to be a valid RegExp Object.');
    }

    if (!dir || !path.isAbsolute(dir) || !fs.existsSync(dir)) {
      throw new Error('The HttpRequestMockMockPlugin expects [dir] to be a valid absolute dir.');
    }

    if (!['internal', 'external', 'custom'].includes(runtime)) {
      throw new Error('The HttpRequestMockMockPlugin expects [runtime] to be one of [internal, external, custom].');
    }

    this.entry = entry;
    this.dir = path.resolve(dir);
    this.watch = watch;
    this.enable = enable;
    this.runtime = runtime;
    this.transpile = transpile;

    this.useFileDependencies = false;
  }

  /**
   * The plugin logic.
   *
   * @param {Webpack Compiler Object} compiler
   */
  apply(compiler) {
    if (!this.enable) return;

    // this.injectMockConfigFileIntoEntryByWebpackConfigEntry(compiler);
    this.injectMockConfigFileIntoEntryByChangingSource(compiler);
    this.setWatchCallback(compiler);
    this.setMockEnviroment(compiler);
    this.addMockDependenciesToContext(compiler);
  }

  /**
   * Inject mock config file into entry by changing source.
   * @param {Webpack Compiler Object} compiler
   */
  injectMockConfigFileIntoEntryByChangingSource(compiler) {
    let injected = false;
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.normalModuleLoader.tap(PLUGIN_NAME, (_, module) => {
        if (injected) return;
        if (!this.entry.test(module.userRequest)) return;
        if (!module.loaders || !module.loaders.length) return;

        // simple-functional-loader has been added.
        const last = module.loaders[module.loaders.length - 1];
        if (/simple-functional-loader\/index\.js/.test(last.loader)) return;

        const runtimeFile = this.getRuntimeConfigFile();
        module.loaders.push(createLoader(function(source) { // function is required here
          return [`/* eslint-disable */`, `import '${runtimeFile}';`, `/* eslint-enable */`, source,].join('\n')
        }));

        injected = true;
        console.log(`Injected mock dependency[${runtimeFile}] for ${module.userRequest}`);
      });
    });
  }

  /**
   * Inject mock config file into entry by webpack config entry.
   * @param {Webpack Compiler Object} compiler
   */
  injectMockConfigFileIntoEntryByWebpackConfigEntry(compiler) {
    const runtimeFile = this.getRuntimeConfigFile();

    const doInject = (entries) => {
      // To be test it.
      if (typeof entries === 'string' && this.entry.test(entries)) {
        console.log('string entry: ', entries);
        compiler.options.entry = [runtimeFile, entries];
        console.log(`Injected mock dependency[${runtimeFile}] for ${entries}`);
        return;
      }
      for(let key in entries) {
        const entry = entries[key];
        if (typeof entry === 'string' && this.entry.test(entry)) {
          entries[key] = [runtimeFile, entry];
          console.log(`Injected mock dependency[${runtimeFile}] for ${entry}`);
          break;
        }
        if (Array.isArray(entry) && entry.find(e => this.entry.test(e))) {
          entries[key] = [runtimeFile].concat(entry);
          console.log(`Injected mock dependency[${runtimeFile}] for ${entry}`);
          break;
        }
      }
    };

    compiler.hooks.entryOption.tap(PLUGIN_NAME, (_, entries) => {
      if (typeof entries === 'function') {
        const getEntries = entries();
        if (typeof getEntries.then === 'function') {
          entries().then(entries => doInject(entries));
        } else {
          doInject(getEntries)
        }
      } else {
        doInject(entries);
      }
    });
  }

  /**
   * Set watch callback if specified.
   * @param {Webpack Compiler Object} compiler
   */
  setWatchCallback(compiler) {
    if (typeof this.watch !== 'function') return;

    compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async () => {
      const changedFiles = this.getChangedFiles(compiler);
      if (!changedFiles.length) {
        return Promise.resolve();
      }

      const files = changedFiles.filter(file => {
        const name = path.basename(file);
        return file.indexOf(this.dir) === 0 && /^[\w][-\w]*\.js$/.test(name)
      });
      if (!files.length) return Promise.resolve();

      return this.watch(files);
    });
  }

  /**
   * Set mock enviroment.
   * @param {Webpack Compiler Object} compiler
   */
  setMockEnviroment(compiler) {
    new webpack.DefinePlugin({
      'process.env.HRM_MOCK_DIR': JSON.stringify(this.dir),
      'process.env.HRM_MOCK_DATA': webpack.DefinePlugin.runtimeValue(() => {
        return JSON.stringify(this.generateMockData());
      }, true),
    }).apply(compiler);
  }

  /**
   * Add mock dependencies dir or files to webpack context.
   * @param {Webpack Compiler Object} compiler
   */
  addMockDependenciesToContext(compiler) {
    if (!this.transpile) return;

    compiler.hooks.emit.tapPromise(PLUGIN_NAME, async (compilation) => {
      if (this.useFileDependencies) {
        const files = await this.getAllMockFiles();
        if (!files.length) {
          return Promise.resolve();
        }

        files.map(f => compilation.fileDependencies.add(f));
        return Promise.resolve();
      } else {
        compilation.contextDependencies.add(this.dir);
        return Promise.resolve();
      }
    });
  }

  /**
   * Get changed files in the mock directory.
   * @param {Webpack Compiler Object} compiler
   */
  getChangedFiles(compiler) {
    const { watchFileSystem } = compiler;

    const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher;

    return Object.keys(watcher.mtimes);
  }

  /**
   * Get all files in the mock directory.
   * @param {array} level
   */
  getAllMockFiles(level = []){
    if (level.length > 3) return [];

    const dir = path.join(this.dir, ...level);
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const res = [];

    for (const file of files) {
      if (file.isFile() && /^[\w][-\w]*\.js$/.test(file.name)) {
        res.push(path.join(dir, file.name));
      } else if (file.isDirectory()) {
        res.push(...this.getAllMockFiles(level.concat(file.name)));
      }
    }

    return res;
  }

  /**
   * Generate mock infomation.
   * @param {Webpack Compiler Object} compiler
   */
  generateMockData() {
    const res = {};
    const files = this.getAllMockFiles();
    for(let file of files) {
      const tags = this.parseComment(file);
      if (!tags.url || tags.disable === 'yes') {
        continue;
      }

      try {
        const resolvedFile = require.resolve(file).replace(this.dir + '/', '');

        res[`${tags.url}-${tags.method}`] = { ...tags, file: resolvedFile };
      } catch (e) { }
    }
    return res;
  }

  /**
   * Get mock config file entry.
   */
  getRuntimeConfigFile() {
    let runtimeFile = undefined;
    if (this.runtime === 'internal') {
      runtimeFile = path.resolve(__dirname, './runtime.js');
    }
    else if (this.runtime === 'external') {
      runtimeFile = this.generateExternalRuntimeDepsFile();
    }
    else if (this.runtime === 'custom') {
      runtimeFile = this.generateCustomRuntimeDepsFile();
    }
    return runtimeFile;
  }

  /**
   * Generate external mock config file entry.
   */
  generateExternalRuntimeDepsFile() {
    const runtime = path.resolve(this.dir, '.runtime.js');
    const isExisted = fs.existsSync(runtime);
    const codes = [
      `/* eslint-disable */`,
      // `import HttpRequestMock from 'xhr-response-mock';`,
      `import HttpRequestMock from '/Users/hu/web/xhr-response-mock-github/dist/index.js';`,
      `HttpRequestMock.setup().setMockData(process.env.HRM_MOCK_DATA || {});`,
      `/* eslint-enable */`,
    ].join('\n');

    if (isExisted && fs.readFileSync(runtime).toString() === codes) {
      return runtime;
    }

    fs.writeFileSync(runtime, codes);
    return runtime;
  }

  /**
   * Generate customized mock config file entry.
   */
  generateCustomRuntimeDepsFile() {
    const runtime = path.resolve(this.dir, '.runtime.js');
    if (fs.existsSync(runtime)) return runtime;

    const files = this.getAllMockFiles();
    const codes = [
      '/* eslint-disable */',
      // `import HttpRequestMock from 'xhr-response-mock';`
      `import HttpRequestMock from '/Users/hu/web/xhr-response-mock-github/dist/index.js';`,
    ];
    const items = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const tags = this.parseComment(file);
      const method = /get|post|put|patch|delete|any/i.test(tags.method) ? tags.method : 'get';
      const delay = tags.delay || 0;
      const status = tags.status || 200;
      const header = tags.header;

      if (!tags.url || /yes|true|1/i.test(tags.disable)) {
        continue;
      }

      tags.url = this.isRegExp(tags.url) ? this.str2RegExp(tags.url) : tags.url;
      codes.push(`import data${i} from '${file}';`);
      items.push({ url: tags.url, method, index: i, delay, status, header, });
    }
    codes.push('const mocker = HttpRequestMock.setup();');
    for (const item of items) {
      const response = `data${item.index}`;
      const url = typeof item.url === 'object' ? item.url : `'${item.url}'`;
      const header = JSON.stringify(item.header, null, 2);
      codes.push(`mocker.${item.method}(${url}, ${response}, ${item.delay}, ${item.status}, ${header});`);
    }
    codes.push('/* eslint-enable */');

    fs.writeFileSync(runtime, codes.join('\n'));
    return runtime;
  }

  /**
   * Whether or not 'str' is a RegExp object like string.
   * @param {string} str
   */
  isRegExp(str) {
    if (/^\/[^/]/.test(str) && /\/[gim]*$/.test(str)) {
      return '/';
    }
    if (/^#[^#]/.test(str) && /#[gim]*$/.test(str)) {
      return '#';
    }
    return false;
  }

  /**
   * Whether or not 'str' is a RegExp object like string.
   * @param {string} str
   * @param {boolean} returnRegStrWithOpts
   */
  str2RegExp(str, returnRegStrWithOpts = false) {
    let opts = '';
    str = str.replace(/^(#|\/)/g, '').replace(/(#|\/)([gim]*)$/, (match) => {
      opts = match.slice(1);
      return '';
    });

    if (returnRegStrWithOpts) {
      return [new RegExp(str, opts).toString().replace(/^\/|\/\w*$/g, ''), opts];
    }
    return new RegExp(str, opts);
  }

  /**
   * Extract meta information from comments in the specified file.
   * Meta information includes: @url, @method, @disable, @delay, @status.
   * @param {string} file
   */
  parseComment(file) {
    const js = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const parsed = parse(js, {
      fence: '\n',
      spacing: 'preserve',
      tokenizers: [tokenizers.tag(), tokenizers.description('preserve')],
    });

    const res = {};
    const keys = ['url', 'method', 'disable', 'delay', 'status', 'header'];
    const tags = this.simpleGet(parsed, '0.tags', []);
    const header = {};

    for(let {tag,description}  of tags) {
      if (!keys.includes(tag)) {
        continue;
      }

      const key = tag.trim();
      const val = description.replace(/\n+.*/g, '').trim();
      if (key === 'header') {
        if (/^[\w.-]+\s*:\s*.+$/.test(val)) {
          header[val.slice(0, val.indexOf(':')).trim().toLowerCase()] = val.slice(val.indexOf(':')+1).trim();
        }
        continue;
      }
      res[key] = val;
    }

    res.header = header;
    res.method = /get|post|put|patch|delete/i.test(res.method) ? res.method.toLowerCase() : 'any';
    res.delay = Math.max(0, /^\d+$/.test(res.delay) ? +res.delay : 0);
    res.disable = /yes|true|1/i.test(res.disable) ? 'yes' : 'no';

    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
    res.status = /^[1-5][0-9][0-9]$/.test(res.status) ? +res.status : 200;

    if (this.isRegExp(res.url)) {
      res.regexp = this.str2RegExp(res.url, true);
    }
    return res;
  }

  /**
   * Just like _.get in lodash
   * @param {object} object
   * @param {string} path
   * @param {any} defaultValue
   */
  simpleGet(object, path, defaultValue) {
    if (typeof object !== 'object' || object === null) {
      return defaultValue;
    }
    const arr = Array.isArray(path) ? path : path.split('.').filter(key => key);
    const keys = arr.map(val => `${val}`); // to string

    const result = keys.reduce((obj, key) => obj && obj[key], object);
    return  result === undefined ? defaultValue : result
  }
}
