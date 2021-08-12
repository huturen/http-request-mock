const fs = require('fs');
const path = require('path');
const { createLoader } = require('simple-functional-loader');

const PLUGIN_NAME = 'HttpRequestMockMockPlugin';
module.exports = class HttpRequestMockMockPlugin {
  /**
   * http-request-mock parameters
   *
   * @param {RegExp} entry Required, entry file which mock dependencies will be injected into.
   * @param {string} dir Required, mock directory which contains all mock files & the runtime mock config entry file.
   *                     Must be an absolute path.
   * @param {function} watch Optional, callback when some mock file is changed.
   * @param {string} enviroment Enable mock function by specified enviroment variable for .runtime.js.
   * @param {boolean} enable Optional, whether or not to enable this plugin, default to true.
   * @param {boolean} monitor Optional, whether or not to monitor files in the mock directory, default to true.
   *                          If mock directory were in src/ that has configured to be monitored,
   *                          then set monitor to false. If this option would confuse you, let it be true.
   */
  constructor({
    entry,
    dir,
    watch,
    enviroment,
    enable = true,
    monitor = true,
  }) {
    if (!(entry instanceof RegExp)) {
      throw new Error('The HttpRequestMockMockPlugin expects [entry] to be a valid RegExp Object.');
    }

    if (!dir || !path.isAbsolute(dir) || !fs.existsSync(dir)) {
      throw new Error('The HttpRequestMockMockPlugin expects [dir] to be a valid absolute dir.');
    }

    this.entry = entry;
    this.dir = this.resolve(dir);
    this.watch = watch;
    this.enable = enable;
    this.monitor = monitor;
    this.enviroment = enviroment && /^\w+=\w+$/.test(enviroment) ? enviroment.split('=') : null;
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
        const entry = this.formatPath(module.userRequest);
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
    return regexp.test(path) || (process.platform === 'win32' && regexp.test(this.formatPath(path)));
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

    return Object.keys(watcher.mtimes).map(this.formatPath);
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
    const runtime = this.resolve(this.dir, '.runtime.js');

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
    ];
    const items = [];
    for (let i = 0; i < files.length; i += 1) {
      const tags = this.parseCommentTags(files[i]);
      if (!tags.url) continue;
      if (/yes|true|1/i.test(tags.disable)) continue;
      if (tags.times !== undefined && tags.times <= 0) continue;

      codes.push(`import data${i} from '${files[i]}';`);
      items.push({ ...tags, index: i });
    }

    let gap = '';
    if (this.enviroment) {
      gap = '  ';
      codes.push(`if (process.env.${this.enviroment[0]} === '${this.enviroment[1]}') {`);
    }

    codes.push(`${gap}const mocker = HttpRequestMock.setup();`);
    for (const item of items) {
      const method = `mocker.${item.method}`;
      const url = typeof item.url === 'object' ? item.url : `'${item.url}'`;
      const response = `data${item.index}`;

      const { delay, status, times, header } = item;
      if (delay || status || times || header) {
        const opts = gap
          ? JSON.stringify({ delay, status, times, header }, null, 2).replace(/\n/g, '\n  ')
          : JSON.stringify({ delay, status, times, header }, null, 2);
        codes.push(`${gap}${method}(${url}, ${response}, ${opts});`);
      } else {
        codes.push(`${gap}${method}(${url}, ${response});`);
      }
    }

    if (this.enviroment) {
      codes.push(`}`);
    }
    codes.push('/* eslint-enable */');
    return codes.join('\n');
  }

  /**
   * Extract meta information from comments in the specified file.
   * Meta information includes: @url, @method, @disable, @delay, @status and so on.
   * @param {string} file
   */
  parseCommentTags(file) {
    const tags = this.getFileCommentTags(file);
    const keys = ['url', 'method', 'disable', 'delay', 'status', 'header', 'times'];
    const res = {};
    const header = {};

    for(let {tag, info}  of tags) {
      if (!keys.includes(tag)) continue;

      if (tag === 'header') {
        if (!/^[\w.-]+\s*:\s*.+$/.test(info)) continue;

        const key = info.slice(0, info.indexOf(':')).trim().toLowerCase();
        const val = info.slice(info.indexOf(':')+1).trim();
        if (!key || !val) continue;
        header[key] = header[key] ? [].concat(header[key], val) : val;
      }
      res[tag] = info;
    }

    // status: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
    res.header = Object.keys(header).length > 0 ? header : undefined;
    res.method = /^(get|post|put|patch|delete|head)$/i.test(res.method) ? res.method.toLowerCase() : 'any';
    res.disable = /^(yes|true|1|no|false|0)$/i.test(res.disable) ? res.disable.toLowerCase() : undefined;
    res.delay = /^[1-9]\d{0,14}$/.test(res.delay) ? +res.delay : undefined;
    res.times = /^-?[1-9]\d{0,14}$/.test(res.times) ? +res.times : undefined;
    res.status = /^[1-5][0-9][0-9]$/.test(res.status) ? +res.status : undefined;

    if (this.isRegExp(res.url)) {
      res.regexp = this.str2RegExp(res.url, true);
      res.url = this.str2RegExp(res.url);
    }
    return res;
  }

  /**
   * Parse the first comment block of specified file and return meta tags.
   * @param {string} file
   */
  getFileCommentTags(file) {
    if (!fs.existsSync(file)) return [];

    const str = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    // We only parse the first comment block, so no 'g' modifier here
    const match = str.match(/\/\*\*\r?\n.*?\r?\n ?\*\//su);
    if (!match) return [];
    const comment = match[0];

    const tags = [];
    const reg = /^[ \t]*\*[ \t]*@(\w+)(?:[ \t]+(.*))?$/mg;
    let tag = reg.exec(comment);
    while(tag) {
        tags.push({ tag: tag[1], info: (tag[2] || '').trim() });
        tag = reg.exec(comment);
    }
    return tags;
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
    return this.formatPath(path.resolve(...args));
  }

  /**
   * Treat '\' as '/' on windows
   * @param  {string} path
   * @returns
   */
  formatPath(path) {
    return process.platform === 'win32' ? (path+'').replace(/\\/g, '/') : path;
  }
}
