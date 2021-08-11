const fs = require('fs');
const path = require('path');
const { createLoader } = require('simple-functional-loader');
const { parse, tokenizers } = require('comment-parser');

const PLUGIN_NAME = 'HttpRequestMockMockPlugin';
module.exports = class HttpRequestMockMockPlugin {
  /**
   * http-request-mock parameters
   *
   * @param {RegExp} entry Required, entry file which mock dependencies will be injected into.
   * @param {string} dir Required, mock directory which contains all mock files & the runtime mock configure file.
   *                     Must be an absolute path.
   * @param {function} watch Optional, callback when some mock file is changed.
   * @param {boolean} enable Optional, whether or not to enable this plugin, default to true.
   * @param {string} runtime Optional, the style of mock configure entry file, one of [internal, external],
   *                         default to 'internal' which use the build-in mock configure entry file.
   * @param {boolean} monitor Optional, whether or not to monitor files in the mock directory, default to true.
   *                          If mock directory were in src/ that has configured to be monitored,
   *                          then set monitor to false. If this option would confuse you, let it be true.
   */
  constructor({
    entry,
    dir,
    watch,
    enable = true,
    runtime = 'internal', // internal external
    monitor = true,
  }) {
    if (!(entry instanceof RegExp)) {
      throw new Error('The HttpRequestMockMockPlugin expects [entry] to be a valid RegExp Object.');
    }

    if (!dir || !path.isAbsolute(dir) || !fs.existsSync(dir)) {
      throw new Error('The HttpRequestMockMockPlugin expects [dir] to be a valid absolute dir.');
    }

    if (!['internal', 'external'].includes(runtime)) {
      throw new Error('The HttpRequestMockMockPlugin expects [runtime] to be one of [internal, external].');
    }

    this.entry = entry;
    this.dir = this.resolve(dir);
    this.watch = watch;
    this.enable = enable;
    this.runtime = runtime;
    this.monitor = monitor;
  }

  /**
   * The plugin logic.
   *
   * @param {Webpack Compiler Object} compiler
   */
  apply(compiler) {
    if (!this.enable) return;

    this.injectMockConfigFileIntoEntryByChangingSource(compiler);
    this.setWatchCallback(compiler);
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

        if (!this.testPath(this.entry, module.userRequest)) return;
        if (!module.loaders || !module.loaders.length) return;

        // simple-functional-loader has been added.
        const last = module.loaders[module.loaders.length - 1];
        if (this.testPath(/simple-functional-loader\/index\.js/, last.loader)) return;

        const runtimeFile = this.getRuntimeConfigFile();
        module.loaders.push(createLoader(function(source) { // function is required here
          return [`/* eslint-disable */`, `import '${runtimeFile}';`, `/* eslint-enable */`, source,].join('\n')
        }));

        injected = true;
        const entry = process.platform === 'win32'
          ? module.userRequest.replace(/\\/g, '/')
          : module.userRequest;
        console.log(`\nInjected mock dependency[${runtimeFile}] for ${entry}`);
      });
    });
  }

  /**
   * Use regexp to test against path which treats '\' as '/' on windows.
   *
   * @param {RegExp} regexp
   * @param {string} path
   */
  testPath(regexp, path) {
    return regexp.test(path)
      // treat '\' as '/' on windows.
      || (process.platform === 'win32' && regexp.test((path+'').replace(/\\/g, '/')));
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

      this.getRuntimeConfigFile(); // update mock runtime config file
      return this.watch(files);
    });
  }

  /**
   * Add mock dependencies dir or files to webpack context.
   * @param {Webpack Compiler Object} compiler
   */
  addMockDependenciesToContext(compiler) {
    if (!this.monitor) return;
    compiler.hooks.emit.tapPromise(PLUGIN_NAME, async (compilation) => {
      compilation.contextDependencies.add(this.dir);
      return Promise.resolve();
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

    const dir = this.resolve(this.dir, ...level);
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const res = [];

    for (const file of files) {
      if (file.isFile() && /^[\w][-\w]*\.js$/.test(file.name)) {
        res.push(this.resolve(dir, file.name));
      } else if (file.isDirectory()) {
        res.push(...this.getAllMockFiles(level.concat(file.name)));
      }
    }
    return res;
  }

  /**
   * Get mock config file entry.
   */
  getRuntimeConfigFile() {
    const runtime = this.runtime === 'internal'
      ? this.resolve(__dirname, './runtime.js')
      : this.resolve(this.dir, '.runtime.js');

    const isExisted = fs.existsSync(runtime);
    const codes = this.getRuntimeFileContent();
    if (isExisted && fs.readFileSync(runtime).toString() === codes) {
      return runtime;
    }

    fs.writeFileSync(runtime, codes);
    return runtime;
  }

  /**
   * Get mock config file entry content codes.
   */
  getRuntimeFileContent() {
    const files = this.getAllMockFiles();
    const codes = [
      '/* eslint-disable */',
      `import HttpRequestMock from 'http-request-mock';`,
      'const mocker = HttpRequestMock.setup();'
    ];
    const items = [];
    for (let i = 0; i < files.length; i += 1) {
      const tags = this.parseComment(files[i]);
      if (!tags.url) continue;
      if (/yes|true|1/i.test(tags.disable)) continue;
      if (tags.times !== undefined && tags.times <= 0) continue;

      codes.push(`import data${i} from '${files[i]}';`);
      items.push({ ...tags, index: i });
    }
    for (const item of items) {
      const method = `mocker.${item.method}`;
      const url = typeof item.url === 'object' ? item.url : `'${item.url}'`;
      const response = `data${item.index}`;

      const { delay, status, times, header } = item;
      if (delay || status || times || header) {
        const opts = JSON.stringify({ delay, status, times, header }, null, 2);
        codes.push(`${method}(${url}, ${response}, ${opts});`);
      } else {
        codes.push(`${method}(${url}, ${response});`);
      }
    }
    codes.push('/* eslint-enable */');
    return codes.join('\n');
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
    const keys = ['url', 'method', 'disable', 'delay', 'status', 'header', 'times'];
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

    // status: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
    res.header = Object.keys(header).length > 0 ? header : undefined;
    res.method = /^(get|post|put|patch|delete|head)$/i.test(res.method) ? res.method.toLowerCase() : 'any';
    res.disable = /^(yes|true|1|no|false|0)$/i.test(res.disable) ? res.disable.toLowerCase() : undefined;
    res.delay = /^[1-9]\d{0,14}$/.test(res.delay) ? +res.delay : undefined;
    res.times = /^-?[1-9]\d{0,14}$/.test(res.times) ? +res.times : undefined;
    res.status = /^[1-5][0-9][0-9]$/.test(res.status) ? +res.status : undefined;

    if (this.isRegExp(res.url)) {
      res.url = this.str2RegExp(res.url);
      res.regexp = this.str2RegExp(res.url, true);
    }
    return res;
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

  /**
   * Resolve path but treat '\' as '/' on windows
   * @param  {...any} args
   * @returns
   */
  resolve(...args) {
    return process.platform === 'win32'
      ? path.resolve(...args).replace(/\\/g, '/')
      : path.resolve(...args);
  }
}
