/* eslint-env node */
// This file is used to generate UMD & ESM bundles.
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
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
// module: esm -> vite, modern browsers
// browser: umd -> other legacy browsers
module.exports = env => {
  const target = env.target === 'esm' ? 'esm' : 'umd';
  return {
    mode: 'production',  // development, production
    optimization: { minimize: false },
    devtool: 'source-map',
    entry: './src/index.ts',
    // devtool: 'inline-source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      fallback: {
        'fs': false,
        'tls': false,
        'net': false,
        'util': false,
        'path': false,
        'zlib': false,
        'http': false,
        'https': false,
        'stream': false,
        'crypto': false,
        'url': false,
      }
    },
    plugins: [
      // add js files in tool direcotry to watch list
      new WatchExternalFilesPlugin({
        files: [ './tool/**/*.js', ]
      }),
      // ignore some dependencies of nodejs
      new webpack.IgnorePlugin({
        checkResource(resource) {
          return /dummy\/(fetch|wx-request|xhr)/.test(resource) || /\/node\/http-and-https/.test(resource);
        },
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
            if (target !== 'esm') return;

            console.log('Generating http-request-mock.esm.mjs...');
            fs.writeFileSync(resolve('dist/http-request-mock.esm.mjs'), [
              'import \'./http-request-mock.__esm_raw__.js\'',
              'const __MODULE_DEFAULT_EXPORT__ = window.__MODULE_DEFAULT_EXPORT__',
              'delete window.__MODULE_DEFAULT_EXPORT__',
              'export default __MODULE_DEFAULT_EXPORT__',
            ].join('\n'));

            console.log('Generating ESM plugins...');
            convertJsType('esm', {
              [resolve('./tool/plugin/faker.js')]: resolve('./dist/tool/plugin/faker.mjs'),
              [resolve('./tool/plugin/cache.js')]: resolve('./dist/tool/plugin/cache.mjs'),
              [resolve('./tool/plugin/webpack.js')]: resolve('./dist/tool/plugin/webpack.mjs'),
            });
            // Copy a redundant plugin directory for backward compatibility.
            console.log('Copy a redundant plugin directory for backward compatibility.');
            copyDir.sync(resolve('./dist/tool/plugin'), resolve('./dist/plugin'), copyOpts);

            const webpackJs = resolve('./dist/plugin/webpack.js');
            const webpackMjs = resolve('./dist/plugin/webpack.mjs');
            const replaceRegs = [/(['"`])..\/(bin|tpl|lib)\//g, '$1../tool/$2/'];
            fs.writeFileSync(webpackJs, fs.readFileSync(webpackJs, 'utf8').replace(...replaceRegs));
            fs.writeFileSync(webpackMjs, fs.readFileSync(webpackMjs, 'utf8').replace(...replaceRegs));
          });
        }
      },
    ],
    output: target === 'esm'
      ? {
        filename: 'http-request-mock.__esm_raw__.js',
        path: path.resolve(__dirname, 'dist'),
        library: '__MODULE_DEFAULT_EXPORT__',
        libraryTarget: 'window',
        libraryExport: 'default'
      }
      : {
        filename: 'http-request-mock.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'HttpRequestMock',
        libraryTarget: 'umd',
        libraryExport: 'default'
      }
  };
};
