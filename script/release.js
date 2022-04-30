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
  encoding: 'utf8'
};

const res = spawnSync('npm config get registry', opts);
const output = String(res.stdout).trim().replace(/\/+$/g, '');
if (output !== 'https://registry.npmjs.org') {
  console.log('Invalid npm registry: ' + output);
  process.exit(1);
}

const packageLock = fs.readFileSync(path.resolve(__dirname, '../package-lock.json'), 'utf8');
if (packageLock.includes(Buffer.from('dGVuY2VudA==', 'base64').toString())) {
  console.log('Invalid host envrionment.');
  process.exit(1);
}

console.log('Building...');
const build = spawnSync('npm run build', opts);
if (build.status !== 0) {
  console.log('Build error, exit code: ' + build.status);
  process.exit(0);
}
spawnSync('sleep 1', opts);

const publishCmd = `npm publish ${path.resolve(__dirname, '../dist')}`;
// just echo, do nothing
console.log('cmd:', publishCmd);



