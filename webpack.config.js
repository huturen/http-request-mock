/* eslint-env node */
// This file is used to generate UMD & ESM bundles.
const fs = require('fs');
const path = require('path');
const copyDir = require('copy-dir');
const WatchExternalFilesPlugin = require('webpack-watch-files-plugin').default;
const { convertJsType } = require('./tool/lib/convertor');


const resolve = file => path.resolve(__dirname, file);
const copyOpts = {
  utimes: true,  // keep add time and modify time
  mode: true,    // keep file mode
  cover: true    // cover file when exists, default is true
};

// build umd & esm versions for browser
// main: cjs -> nodejs
// module: esm -> vite & modern browsers
// browser: umd -> the majority browsers
module.exports = env => {
  const target = env.target === 'esm' ? 'esm' : 'umd';
  const entry = env.entry === 'pure' ? 'pure' : 'mixed';

  return {
    mode: 'production',  // development, production
    optimization: { minimize: false },
    devtool: 'source-map',
    entry: entry === 'pure' ? './src/browser.pure.ts' : './src/browser.ts',
    // devtool: 'inline-source-map',

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          options: { configFile: target === 'esm' ? 'tsconfig.esm.json' : 'tsconfig.json' },
        },
      ],
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
      // add js files in tool directory to watch list
      new WatchExternalFilesPlugin({
        files: [ './tool/**/*.js', ]
      }),
      // copy "tool" to dist
      {
        apply: (compiler) => {
          compiler.hooks.beforeCompile.tapAsync('Before', (_, callback) => {
            copyDir.sync(resolve('./tool'), resolve('./dist/tool'), copyOpts);
            copyDir.sync(resolve('./package.json'), resolve('./dist/package.json'), copyOpts);
            copyDir.sync(resolve('./README.MD'), resolve('./dist/README.MD'), copyOpts);
            copyDir.sync(resolve('./README-CN.MD'), resolve('./dist/README-CN.MD'), copyOpts);
            callback();
          });
        }
      },
      // generate ESM plugins
      {
        apply: (compiler) => {
          compiler.hooks.done.tap('After', () => {
            if (target !== 'esm') {
              // for backward compatibility
              const index = resolve('./dist/src/index.js');
              fs.writeFileSync(index, fs.readFileSync(index, 'utf8') + '\nmodule.exports = Index;');
              return;
            }

            console.log('Generating ESM plugins...');
            convertJsType('esm', {
              [resolve('./tool/plugin/faker.js')]: resolve('./dist/tool/plugin/faker.esm.mjs'),
              [resolve('./tool/plugin/cache.js')]: resolve('./dist/tool/plugin/cache.esm.mjs'),
              [resolve('./tool/plugin/vite.js')]: resolve('./dist/tool/plugin/vite.esm.mjs'),
              [resolve('./tool/plugin/webpack.js')]: resolve('./dist/tool/plugin/webpack.esm.mjs'),
            });

            // Copy a redundant plugin directory for backward compatibility.
            console.log('Copy a redundant plugin directory for backward compatibility.');

            fs.existsSync(resolve('./dist/plugin')) || fs.mkdirSync(resolve('./dist/plugin'));
            for(const name of fs.readdirSync(resolve('./dist/tool/plugin/'))) {
              const [dist, plugin] = [resolve('./dist/plugin/' + name), `'../tool/plugin/${name}'`];
              if (/\.js$/.test(name)) {
                fs.writeFileSync(dist, `module.exports = require(${plugin});`);
              } else if (/\.mjs/.test(name)) {
                fs.writeFileSync(dist, `import { default as mod } from ${plugin};\nexport default mod;`);
              }
            }
          });
        }
      },
    ],
    experiments: target === 'esm' ? { outputModule: true, } : undefined,

    target: 'web',
    output: target === 'esm'
      ? {
        filename: entry === 'pure' ? 'http-request-mock.pure.esm.mjs' : 'http-request-mock.esm.mjs',
        path: path.resolve(__dirname, 'dist'),
        library: {
          type: 'module'
        }
      }
      : {
        filename: entry === 'pure' ? 'http-request-mock.pure.js' : 'http-request-mock.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'HttpRequestMock',
        globalObject: 'typeof self !== \'undefined\' ? self : this',
        libraryTarget: 'umd',
        libraryExport: 'default'
      }
  };
};
