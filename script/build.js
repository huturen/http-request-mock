#!/usr/bin/env node
/* eslint-env node */
const path = require('path');
const { spawnSync } = require('child_process');

function execute(cmd) {
  console.log(cmd + '...');
  const res = spawnSync(cmd, {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
    detached: false,
    shell: true
  });

  if (res.status !== 0) {
    console.log(`[${cmd}] failed, exit code: ${res.status}.`);
    process.exit(1);
  }
}


execute('npm run clean');

execute('tsc');

console.log('---------------------------------');

execute('webpack --env target=umd --env entry=mixed');
execute('webpack --env target=umd --env entry=pure');

console.log('=================================');

execute('webpack --env target=esm --env entry=mixed');
execute('webpack --env target=esm --env entry=pure');

