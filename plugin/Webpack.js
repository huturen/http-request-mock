const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const { createLoader } = require('simple-functional-loader');
const { parse, tokenizers } = require('comment-parser/lib');

const PLUGIN_NAME = 'XhrResponseMockPlugin';
module.exports = class XhrResponseMockPlugin {
  constructor({ entry, dir, watch, enable = true, inject = true }) {
    if (!(entry instanceof RegExp)) {
      throw new Error('The XhrResponseMockPlugin expects [entry] to be a valid RegExp Object.');
    }
    if (!dir || typeof dir !== 'string' || !path.isAbsolute(dir)) {
      throw new Error('The XhrResponseMockPlugin expects [dir] to be a valid absolute dir.');
    }

    this.entry = entry;
    this.dir = dir;
    this.watch = typeof watch === 'function' ? watch : (() => {});
    this.enable = enable;
    this.inject = inject;

    this.matchedFiles = [];
    this.inited = false;
  }

  apply(compiler) {
    if (!this.enable) return;

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.normalModuleLoader.tap(PLUGIN_NAME, (_, module) => {
        if (this.inited) return;
        if (!this.entry.test(module.userRequest)) return;
        if (!module.loaders || !module.loaders.length) return;

        const last = module.loaders[module.loaders.length - 1];
        if (/simple-functional-loader\/index\.js/.test(last.loader)) return;

        const me = this;
        const runtimeFile = me.inject ? me.genRuntimeDepsFile() : undefined;
        module.loaders.push(createLoader(function(source) { // eslint-disable-line
          if (typeof me.inject === 'function') {
            const codes = me.inject(source, runtimeFile);
            return (codes && typeof codes === 'string') ? codes : source;
          }

          if (me.inject) {
            return [
              `/* eslint-disable */`,
              `import '${runtimeFile}';`,
              `/* eslint-enable */`,
              source,
            ].join('\n');
          }
          return source;
        }));
        this.inited = true;
        if (me.inject) {
          console.log(` Injected mock dependency[${runtimeFile}] for ${module.userRequest}`);
        }
      });
    });

    compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, async () => {
      const changedFile = this.getChangedFile(compiler);
      if (!changedFile.length) return Promise.resolve();

      const changedMatch = changedFile.filter(file => {
        const name = path.basename(file);
        return file.indexOf(this.dir) === 0 && /^[\w][-\w]*\.js$/.test(name)
      });
      if (!changedMatch.length) return Promise.resolve();

      return this.watch(changedMatch);
    });

    new webpack.DefinePlugin({
      'process.env.xhrResMockData': webpack.DefinePlugin.runtimeValue(() => {
        return JSON.stringify(this.genMockData());
      }, true), // this.matchedFiles
    }).apply(compiler);

    compiler.hooks.emit.tapPromise(PLUGIN_NAME, async (compilation) => {
      const matchedFiles = await this.getMatchedFiles();
      if (!matchedFiles.length) return Promise.resolve();

      matchedFiles.map(f => compilation.fileDependencies.add(f));
      return Promise.resolve();
    });
  }

  getChangedFile(compiler) {
    const { watchFileSystem } = compiler;

    const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher;

    return Object.keys(watcher.mtimes);
  }

  getMatchedFiles(level = []) {
    if (level.length > 3) return []; // support 3 levels

    const dir = path.join(this.dir, ...level);
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const res = [];
    for (const file of files) {
      if (file.isFile() && /^[\w][-\w]*\.js$/.test(file.name)) {
        res.push(path.join(dir, file.name));
      } else if (file.isDirectory()) {
        res.push(...this.getMatchedFiles(level.concat(file.name)));
      }
    }
    return res;
  }

  genMockData() {
    const res = {};
    this.matchedFiles = this.getMatchedFiles();
    for(let file of this.matchedFiles) {
      const tags = this.parseComment(file);
      if (!tags.url || tags.disable === 'yes') continue;

      try {
        delete require.cache[require.resolve(file)];
        res[`${tags.url}-${tags.method}`] = { ...tags, data: require(file) };
      } catch (e) { }
    }
    return res;
  }

  genRuntimeDepsFile() {
    const runtime = path.resolve(this.dir, '.runtime.js');
    if (fs.existsSync(runtime) && fs.readFileSync(runtime).toString().includes('xhr-response-mock')) {
      return runtime;
    }

    const codes = [
      `/* eslint-disable */`,
      `import XhrResMock from 'xhr-response-mock';`,
      `XhrResMock.init().setMockData(process.env.xhrResMockData || {});`,
      `/* eslint-enable */`,
    ];

    fs.writeFileSync(runtime, codes.join('\n'));
    return runtime;
  }

  genRuntimeDepsFile2() {
    this.matchedFiles = this.getMatchedFiles();
    const codes = ['/* eslint-disable */', `import XhrResMock from 'xhr-response-mock';`];
    const items = [];
    for (let i = 0; i < this.matchedFiles.length; i += 1) {
      const file = this.matchedFiles[i];
      const tags = this.parseComment(file);
      const method = /get|post|put|patch|delete/i.test(tags.method) ? tags.method : 'get';
      if (!tags.url || /yes|true|1/i.test(tags.disable)) {
        continue;
      }
      tags.url = this.isRegExp(tags.url) ? this.str2RegExp(tags.url) : tags.url;
      codes.push(`import data${i} from '${file}';`);
      items.push({ url: tags.url, method, index: i });
    }
    codes.push('const mock = new XhrResMock();');
    for (const item of items) {
      const response = `{\n  status: 200, body: data${item.index}\n}`;
      const url = typeof item.url === 'object' ? item.url : `'${item.url}'`;
      codes.push(`mock.${item.method}(${url}, ${response});`);
    }
    codes.push('/* eslint-enable */');

    const runtime = path.resolve(this.dir, '.runtime.js');
    fs.writeFileSync(runtime, codes.join('\n'));
    return runtime;
  }

  isRegExp(str) {
    if (/^\/[^/]/.test(str) && /\/[gim]*$/.test(str)) {
      return '/';
    }
    if (/^#[^#]/.test(str) && /#[gim]*$/.test(str)) {
      return '#';
    }
    return false;
  }

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

  parseComment(file) {
    const js = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const parsed = parse(js, {
      fence: '\n',
      spacing: 'preserve',
      tokenizers: [tokenizers.tag(), tokenizers.description('preserve')],
    });

    const res = {};
    const keys = ['url', 'method', 'disable', 'delay']; // 'status', 'sendData'
    const tags = this.simpleGet(parsed, '0.tags', []);
    for(let {tag,description}  of tags) {
      if (!keys.includes(tag)) continue;
      res[tag.trim()] = description.replace(/\n+.*/g, '').trim();
    }

    res.method = /get|post|put|patch|delete/i.test(res.method) ? res.method.toLowerCase() : 'any';
    res.delay = Math.max(0, /^\d+$/.test(res.delay) ? +res.delay : 0);
    res.disable = /yes|true|1/i.test(res.disable) ? 'yes' : 'no';
    if (this.isRegExp(res.url)) {
      res.regexp = this.str2RegExp(res.url, true);
    }
    return res;
  }

  // just like _.get in lodash
  simpleGet(object, path, defaultValue) {
    if (typeof object !== 'object' || object === null) {
      return defaultValue;
    }
    const arr = Array.isArray(path) ? path : path.split('.').filter(key => key);
    const keys = arr.map(val => `${val}`); // to string

    const result = keys.reduce((obj, key) => obj && obj[key], object);
    return  result === undefined ? defaultValue : result
  }
};
