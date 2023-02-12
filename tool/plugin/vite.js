/* eslint-env node */
const path = require('path');
const fs = require('fs');
const { getAppRoot, resolve, formatPath } = require('../lib/misc');
const pluginName = 'vite-plugin-http-request-mock';

/**
 * Use regexp to test against path which treats '\' as '/' on windows.
 *
 * @param {RegExp} regexp
 * @param {string} assetFile
 */
const testPath = (regexp, assetFile) => {
  return regexp.test(assetFile) || (process.platform === 'win32' && regexp.test(formatPath(assetFile)));
};

/**
 * @param {regexp} appEntry Required, app entry file which mock dependencies will be injected into.
 * @param {string} mockDir Required, mock directory which contains all mock files & the runtime mock config entry file.
 * @param {boolean} enable Optional, whether or not to enable this plugin. Default: true
 * @param {boolean} debug Optional, output some debug logs. Default: false
 */
const vitePluginHttpRequestMock = ({ appEntry, mockDir, enable = true, debug = false}) => {
  if (!(appEntry instanceof RegExp)) {
    throw new Error(`${pluginName} expects [appEntry] to be a valid RegExp Object.`);
  }

  const absoluteDir = resolve(path.isAbsolute(mockDir) ? mockDir : path.resolve(getAppRoot(), mockDir));
  if (!mockDir || !fs.existsSync(absoluteDir)) {
    throw new Error(`${pluginName} expects [mockDir] to be a valid directory.`);
  }
  const runtimeFile = resolve(absoluteDir, '.runtime.js');
  if (!fs.existsSync(runtimeFile)) {
    throw new Error(`${pluginName} can not find the runtime mock config entry file: ${runtimeFile}.`);
  }

  return {
    name: pluginName,
    transform(code, id) {
      if (!enable) return;

      const match = testPath(appEntry, id);
      if (debug) {
        console.log(`${appEntry.toString()} -> ${id} ${match ? '-> hit!!!' : ''}`);
      }
      if (match) {
        return `import "${runtimeFile}"; // runtime mock config entry file.\n${code}`;
      }
    },
  };
};

module.exports = vitePluginHttpRequestMock;
