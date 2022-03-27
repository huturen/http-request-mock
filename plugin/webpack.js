/* eslint-env node */
const fs = require('fs');
const path = require('path');
const server = require('../bin/server');

const PLUGIN_NAME = 'HttpRequestMockMockPlugin';
module.exports = class HttpRequestMockMockPlugin {
  /**
   * http-request-mock parameters
   *
   * @param {RegExp} entry Required, entry file which mock dependencies will be injected into.
   * @param {string} dir Required, mock directory which contains all mock files & the runtime mock config entry file.
   *                     Must be an absolute path.
   * @param {function} watch Optional, callback when some mock file is changed.
   * @param {boolean} enable Optional, whether or not to enable this plugin. Default value depends: NODE_ENV.
   *                         The default value will depend on your environment variable NODE_ENV if not specified:
   *                         i.e.: It'll be true on a development environment(NODE_ENV=development) by default.
   * @param {string} type Optional, the module type of .runtime.js.. Defaults to 'cjs'.
   *                      Valid values are: es6, cjs(alias of commonjs).
   * @param {string} proxyMode Optional, proxy mode. In proxy mode, http-request-mock will start a proxy server which
   *                           recives incoming requests on localhost. Mock files will be run in a node environment.
   *                           [matched] Proxy requests which are matched your defined mock items.
   *                           [marked] Proxy requests which are marked by @proxy. (default: "marked")
   */
  constructor({
    entry,
    dir,
    watch,
    enable,
    type,
    proxyMode = 'none',
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
    this.enable = enable === undefined ? (process.env.NODE_ENV === 'development') : (!!enable);
    this.type = ['es6', 'commonjs', 'cjs'].includes(type) ? type : 'cjs';
    this.environment = ['NODE_ENV', 'development'];

    const isProxyMode = proxyMode === 'matched' || proxyMode === 'marked';
    if (this.type === 'es6' && isProxyMode) {
      throw new Error('[proxyMode] does not compatible with the [type] of es6.');
    }

    this.proxyServer = '';
    this.proxyMode  = isProxyMode ? proxyMode : '';
    this.runtimeFile = this.resolve(this.dir, '.runtime.js');
  }

  /**
   * Initialize webpack plugin & inject dependencies into entry.
   *
   * @param {Webpack Compiler Object} compiler
   */
  apply(compiler) {
    if (!this.enable) return;

    this.injectMockConfigFileIntoEntryByWebpackConfigEntry(compiler);
    this.setWatchCallback(compiler);
    this.addMockDependenciesToContext(compiler);
    this.initProxyServer();
  }

  /**
   * Initialize proxy server in a proxy mode.
   */
  async initProxyServer() {
    if (this.proxyMode === 'matched' || this.proxyMode === 'marked') {
      const address = await server.init({
        mockDir: this.dir,
        environment: this.environment ? this.environment.join('=') : '',
        proxyMode: this.proxyMode,
      });
      this.proxyServer = this.proxyMode + '@' + address;
    }
    this.setRuntimeConfigFile();
  }

  /**
   * Inject mock config file into entry by webpack config entry.
   * @param {Webpack Compiler Object} compiler
   */
  injectMockConfigFileIntoEntryByWebpackConfigEntry(compiler) {
    let injected = false;
    const runtimeFile = this.runtimeFile;
    const setMsg = entry => {
      injected = true;
      const dependency = path.relative(this.dir, runtimeFile);
      console.log(`\x1b[32m[http-request-mock]\x1b[0m Injected mock dependency[${dependency}] for ${entry}`);
    };
    const doInject = (entries, level = 0) => {
      if (injected) return;
      if (level >= 30) return;
      if (typeof entries === 'string' && this.testPath(this.entry, entries)) {
        compiler.options.entry = [runtimeFile, entries];
        return setMsg(entries);
      }
      for(let key in entries) {
        const entry = entries[key];
        if (typeof entry === 'string' && this.testPath(this.entry, entry)) {
          entries[key] = [runtimeFile, entry];
          setMsg(entry);
          injected = true;
          break;
        }
        if (Array.isArray(entry)) {
          const found = entry.find(e => this.testPath(this.entry, e));
          if (found) {
            entries[key] = [runtimeFile].concat(entry);
            setMsg(found);
            break;
          }
        } else if (entry && typeof entry === 'object') {
          doInject(entry, level + 1);
        }
      }
    };

    compiler.hooks.entryOption.tap(PLUGIN_NAME, (_, entries) => {
      if (typeof entries === 'function') {
        const getEntries = entries();
        if (typeof getEntries.then === 'function') {
          entries().then(entries => doInject(entries));
        } else {
          doInject(getEntries);
        }
      } else {
        doInject(entries);
      }
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
    compiler.hooks.watchRun.tap(PLUGIN_NAME, (comp) => {
      // https://stackoverflow.com/questions/43140501/can-webpack-report-which-file-triggered-a-compilation-in-watch-mode
      // https://github.com/webpack/webpack/issues/12507
      let changedFiles = [];
      if (comp.modifiedFiles) {
        changedFiles = Array.from(comp.modifiedFiles).map(this.formatPath);
      } else {
        changedFiles = this.getChangedFiles(compiler);
      }
      if (!changedFiles.length) {
        return;
      }

      const files = changedFiles.filter(file => {
        const name = path.basename(file);
        return file.indexOf(this.dir) === 0 && /^[\w][-\w]*\.js$/.test(name);
      });
      if (!files.length) return;
      this.setRuntimeConfigFile(); // update mock runtime config file

      if (this.proxyServer) {
        server.reload(files);
      }

      if (typeof this.watch === 'function') {
        this.watch(files);
      }
    });
  }

  /**
   * Add mock dependencies dir or files to webpack context.
   * @param {Webpack Compiler Object} compiler
   */
  addMockDependenciesToContext(compiler) {
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

    return Object.keys(watcher.mtimes || {}).map(this.formatPath);
  }

  /**
   * Get all files in the mock directory.
   * @param {array} level
   */
  getAllMockFiles(level = []){
    if (level.length > 5) return [];

    const dir = this.resolve(this.dir, ...level);
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const res = [];

    for (const file of files) {
      if (file.isFile() && /^[0-9A-Za-z][-\w]*\.js$/.test(file.name)) {
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
  setRuntimeConfigFile() {
    const isExisted = fs.existsSync(this.runtimeFile);
    const [files, codes] = this.getRuntimeFileContent();
    if (isExisted && fs.readFileSync(this.runtimeFile).toString() === codes) {
      return this.runtimeFile;
    }

    this.convertJsType(files);
    fs.writeFileSync(this.runtimeFile, codes);

    return this.runtimeFile;
  }

  convertJsType(files) {
    const isCjs = this.type === 'commonjs' || this.type === 'cjs';
    for(const file of files) {
      const content = fs.readFileSync(file, {encoding: 'utf8'});
      if (isCjs && (/\s*export\s+default\s+/.test(content) || /import[^\n]+from\s+/.test(content))) {
        fs.writeFileSync(file, this.covertES62CJS(content));
        continue;
      }
      if (!isCjs && /\s*module\.exports\s*=/.test(content)) {
        fs.writeFileSync(file, this.covertCJS2ES6(content));
      }
    }
  }

  covertES62CJS(codes) {
    return codes.replace(
      /^(\s*)import\s+(\w+)\s+from\s+('|")([.\w/-]+)\3\s*;?\s*$/gm,
      '$1const $2 = require(\'$4\');'
    ).replace(
      /^(\s*)export\s+default\s+(.*)$/gm,
      '$1module.exports = $2'
    );
  }

  covertCJS2ES6(codes) {
    return codes.replace(
      /^(\s*)(const|let)\s+(.*?)\s*?=\s*?require\s*\(\s*('|")(.*?)\4\s*?\)\s*;?\s*$/gm,
      '$1import $3 from \'$5\';'
    ).replace(
      /^(\s*)module\.exports\s+=\s*(.*)$/gm,
      '$1export default $2'
    );
  }

  /**
   * Get mock config file entry content codes.
   */
  getRuntimeFileContent() {
    const isCjs = this.type === 'commonjs' || this.type === 'cjs';
    const files = this.getAllMockFiles();
    const tpl = isCjs ? 'cjs' : 'es6';

    let codes = fs.readFileSync(path.resolve(__dirname, `../tpl/runtime.${tpl}.js`), {encoding: 'utf8'});
    codes = !this.environment ? codes : codes
      .replace('__hrm_environment_key__', this.environment[0])
      .replace('__hrm_environment_val__', this.environment[1])
      .replace(/\/\* __hrf_env_if__ \*\//g, '');

    codes = codes.replace('__hrm_proxy_server__', this.proxyServer ? `"${this.proxyServer}"` : '');

    const items = [];
    for (let i = 0; i < files.length; i += 1) {
      const tags = this.parseCommentTags(files[i]);

      if (!tags.url) continue;
      if (/yes|true|1/i.test(tags.disable)) continue;
      if (tags.times !== undefined && tags.times <= 0) continue;

      let file = path.relative(this.dir, files[i]);
      file = process.platform === 'win32' ? file.replace(/\\/g, '/') : file;
      file = /^\./.test(file) ? file : ('./'+file);

      const url = typeof tags.url === 'object' ? tags.url : `"${tags.url}"`;
      const { method, delay, status, header, times, remote, proxy } = tags;
      const mockItem = { url: '', method, body: '', delay, status, times, header, remote, proxy };

      const info = JSON.stringify(mockItem, null, 2)
        .replace(/"url": "",?/, `"url": ${url},`)
        .replace(/"body": "",?/, isCjs ? `"body": require("${file}"),` : `"body": require("${file}").default,` );
      items.push(`  mocker.mock(${info.replace(/\n/g, '\n  ')});`);
    }
    codes = codes.replace(/( {2})?__hrm_mock_items__/, items.join('\n'));
    return [
      files,
      this.environment ? codes : codes.replace(/\/\* __hrf_env_if__ \*\/.*\n/mg, '').replace(/^ {2}/gm, '')
    ];
  }

  /**
   * Extract meta information from comments in the specified file.
   * Meta information includes: @url, @method, @disable, @delay, @status and so on.
   * @param {string} file
   */
  parseCommentTags(file) {
    const tags = this.getFileCommentTags(file);
    const keys = ['url', 'method', 'disable', 'delay', 'status', 'header', 'times', 'remote', 'proxy'];
    const res = {};
    const header = {};

    for(const {tag, info}  of tags) {
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
    res.method = /^(get|post|put|patch|delete|head)$/i.test(res.method) ? res.method.toUpperCase() : undefined;
    res.delay = /^\d{0,15}$/.test(res.delay) ? +res.delay : undefined;
    res.times = /^-?\d{0,15}$/.test(res.times) ? +res.times : undefined;
    res.status = /^[1-5][0-9][0-9]$/.test(res.status) ? +res.status : undefined;
    res.disable = res.disable !== undefined && /^(yes|true|1|)$/i.test(res.disable) ? 'yes' : (res.disable || undefined);
    res.remote = /^((get|post|put|patch|delete|head)\s+)?https?:\/\/[^\s]+$/i.test(res.remote) ? res.remote : undefined;
    res.proxy = res.proxy !== undefined ? true : undefined;

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
    return  result === undefined ? defaultValue : result;
  }

  /**
   * Resolve path but treat '\' as '/' on windows
   * @param  {any} args
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
};
