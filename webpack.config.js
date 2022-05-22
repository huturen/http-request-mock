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
      // add js files in tool direcotry to watch list
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
              [resolve('./tool/plugin/faker.js')]: resolve('./dist/tool/plugin/faker.mjs'),
              [resolve('./tool/plugin/cache.js')]: resolve('./dist/tool/plugin/cache.mjs'),
            });

            // Copy a redundant plugin directory for backward compatibility.
            console.log('Copy a redundant plugin directory for backward compatibility.');
            copyDir.sync(resolve('./dist/tool/plugin'), resolve('./dist/plugin'), copyOpts);

            const middlewareJs = resolve('./dist/plugin/middleware.js');
            const webpackJs = resolve('./dist/plugin/webpack.js');
            const replaceRegs = [/(['"`])..\/(bin|tpl|lib)\//g, '$1../tool/$2/'];
            fs.writeFileSync(middlewareJs, fs.readFileSync(middlewareJs, 'utf8').replace(...replaceRegs));
            fs.writeFileSync(webpackJs, fs.readFileSync(webpackJs, 'utf8').replace(...replaceRegs));
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
