#!/usr/bin/env node
/* eslint-env node */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const opts = {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'pipe',
  detached: false,
  shell: true,
  encoding: 'utf8',
  // https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options
  maxBuffer: Number.MAX_SAFE_INTEGER,
};

const res = spawnSync('npm config get registry', opts);
const output = String(res.stdout).trim().replace(/\/+$/g, '');
if (output !== 'https://registry.npmjs.org') {
  console.log('Invalid npm registry: ' + output);
  process.exit(1);
}

const packageLock = path.resolve(__dirname, '../package-lock.json');
const sensitiveWord = Buffer.from('dGVuY2VudA==', 'base64').toString('utf8');
if (fs.readFileSync(packageLock, 'utf8').includes(sensitiveWord)) {
  console.log('Invalid host environment.');
  spawnSync(`grep '${sensitiveWord}' ${packageLock}`, opts);
  process.exit(1);
}

spawnSync('sleep 1', opts);

console.log('Building...');
const build = spawnSync('npm run build', opts);
if (build.status !== 0) {
  console.log('Build error, exit code: ' + build.status);
  process.exit(1);
}
spawnSync('sleep 1', opts);

const publishCmd = `npm publish ${path.resolve(__dirname, '../dist')}`;
// just echo, do nothing
console.log('cmd:', publishCmd);



