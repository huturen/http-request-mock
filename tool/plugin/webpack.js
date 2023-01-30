/* eslint-env node */
const fs = require('fs');
const path = require('path');
const server = require('../bin/server');
const { parseCommentTags } = require('../lib/comment');
const { entryPoints, log, getAppRoot, resolve, formatPath } = require('../lib/misc');
const { convertJsType } = require('../lib/convertor');
const PLUGIN_NAME = 'HttpRequestMockMockPlugin';
module.exports = class HttpRequestMockMockPlugin {
  /**
   * http-request-mock parameters
   *
   * @param {regexp} entry Required, entry file into which mock dependencies will be injected.
   * @param {string} dir Required, mock directory which contains all mock files & the runtime mock config entry file.
   * @param {function} watch Optional, callback when some mock file is changed.
   * @param {boolean} enable Optional, whether or not to enable this plugin. Default value depends: NODE_ENV.
   *                         The default value will depend on your environment variable NODE_ENV if not specified:
   *                         i.e.: It'll be true on a development environment(NODE_ENV=development) by default.
   * @param {string} type Optional, the module type of .runtime.js.. Defaults to 'cjs'.
   *                      Valid values are: es6(alias of ESM), cjs(alias of commonjs).
   *
   * @param {string} index Optional, Index entry, automatic detection by default.
   *           Valid values are:
   *           [src/index.js] for commonJS
   *           [http-request-mock.js] for UMD
   *           [http-request-mock.pure.js] An alternative version without faker and cache plugins for UMD.
   *           [http-request-mock.esm.mjs] for ESM
   *           [http-request-mock.pure.esm.mjs] for ESM An alternative version without faker and cache plugins for ESM.
   *
   * @param {string} proxyMode Optional, proxy mode. In proxy mode, http-request-mock will use a proxy server to
   *                           receive incoming requests. Mock files will be run in a node environment.
   *                           [matched] Proxy requests which are matched your defined mock items.
   *                           [middleware] For the middleware plugin. (default: "none")
   */
  constructor({
    entry,
    dir,
    watch,
    enable,
    type,
    index,
    proxyMode = 'none',
  }) {
    if (!(entry instanceof RegExp)) {
      throw new Error('The HttpRequestMockWebpackPlugin expects [entry] to be a valid RegExp Object.');
    }

    this.dir = resolve(path.isAbsolute(dir) ? dir : path.resolve(getAppRoot(), dir));
    if (!dir || !fs.existsSync(this.dir)) {
      throw new Error('The HttpRequestMockWebpackPlugin expects [dir] to be a valid directory.');
    }

    this.entry = entry;
    this.watch = watch;
    this.enable = enable === undefined ? (process.env.NODE_ENV === 'development') : (!!enable);

    this.type = ['es6', 'esm', 'commonjs', 'cjs'].includes(type) ? type : 'cjs';

    const defaultIndexEntry = ['commonjs', 'cjs'].includes(this.type)
      ? 'http-request-mock.js'
      : 'http-request-mock.esm.mjs';

    this.getIndexEntry = entryPoints.includes(index)
      ? `http-request-mock/${index}`
      : `http-request-mock/${defaultIndexEntry}`;
    if (['commonjs', 'cjs'].includes(this.type) && this.getIndexEntry.includes('.esm.')) {
      throw new Error(`Invalid entry index, ${this.getIndexEntry} does not compatibility with "${this.type}"`);
    }

    this.environment = '';

    const isProxyMode = /^(matched|middleware)$/.test(proxyMode);
    if (['es6', 'esm'].includes(type) && isProxyMode) {
      throw new Error('[proxyMode] does not compatible with the type of es6(ESM).');
    }

    this.proxyServer = '';
    this.proxyMode  = isProxyMode ? proxyMode : '';
    this.runtimeFile = resolve(this.dir, '.runtime.js');
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
    if (this.proxyMode) {
      const address = this.proxyMode === 'middleware' ? '/' : await server.init({
        type: this.type,
        proxyMode: this.proxyMode,
        mockDir: this.dir,
        environment: this.environment ? this.environment.join('=') : ''
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
    const setMsg = entry => {
      injected = true;
      const dependency = path.relative(this.dir, this.runtimeFile);
      log(`Injected mock dependency[${dependency}] into ${entry}`);
    };
    const doInject = (entries, level = 0) => {
      if (injected) return;
      if (level >= 30) return;
      if (typeof entries === 'string' && this.testPath(this.entry, entries)) {
        compiler.options.entry = [this.runtimeFile, entries];
        return setMsg(entries);
      }
      for(let key in entries) {
        const entry = entries[key];
        if (typeof entry === 'string' && this.testPath(this.entry, entry)) {
          entries[key] = [this.runtimeFile, entry];
          setMsg(entry);
          injected = true;
          break;
        }
        if (Array.isArray(entry)) {
          const found = entry.find(e => this.testPath(this.entry, e));
          if (found) {
            entries[key] = [this.runtimeFile].concat(entry);
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
    return regexp.test(path) || (process.platform === 'win32' && regexp.test(formatPath(path)));
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
        changedFiles = Array.from(comp.modifiedFiles).map(formatPath);
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

    return Object.keys(watcher.mtimes || {}).map(formatPath);
  }

  /**
   * Get all files in the mock directory.
   * @param {array} level
   */
  getAllMockFiles(level = []){
    if (level.length > 5) return [];

    const dir = resolve(this.dir, ...level);
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const res = [];

    for (const file of files) {
      if (file.isFile() && /^[0-9A-Za-z][-\w]*\.js$/.test(file.name)) {
        res.push(resolve(dir, file.name));
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

    convertJsType(this.type, files);
    // It may throw an error when writing a file, which user cares.
    // So, no try-catch here, let it be.
    fs.writeFileSync(this.runtimeFile, codes);

    return this.runtimeFile;
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

    codes = codes.replace('__hrm_index_entry__', this.getIndexEntry);
    codes = codes.replace('__hrm_proxy_server__', this.proxyServer ? `"${this.proxyServer}"` : '');

    const items = [];
    for (let i = 0; i < files.length; i += 1) {
      const tags = parseCommentTags(files[i]);

      if (!tags.url) continue;
      if (/yes|true|1/i.test(tags.disable)) continue;
      if (tags.times !== undefined && tags.times <= 0) continue;

      let file = path.relative(this.dir, files[i]);
      file = process.platform === 'win32' ? file.replace(/\\/g, '/') : file;
      file = /^\./.test(file) ? file : ('./'+file);

      const url = typeof tags.url === 'object' ? tags.url : `"${tags.url}"`;
      const { method, delay, status, requestHeaders, headers, times, remote, deProxy } = tags;
      const mockItem = { url: '', method, body: '', delay, status, times, requestHeaders, headers, remote, deProxy };
      const info = JSON.stringify(mockItem, null, 2)
        .replace(/"url": "",?/, `"url": ${url},`)
        .replace(/"body": "",?/, isCjs ? `"body": require('${file}'),` : `"body": import('${file}'),` );
      items.push(`  mocker.mock(${info.replace(/\n/g, '\n  ')});`);
    }
    codes = codes.replace(/( {2})?__hrm_mock_items__/, items.join('\n'));
    return [
      files,
      this.environment ? codes : codes.replace(/\/\* __hrf_env_if__ \*\/.*\n/mg, '').replace(/^ {2}/gm, '')
    ];
  }
};
