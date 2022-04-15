#!/usr/bin/env node
/* eslint-env node */
const path = require('path');
const { spawn } = require('child_process');

const opts = {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
  detached: false,
  shell: true
};

spawn('tsc -w', opts);
spawn('webpack --watch --stats-error-details --env target=umd', opts);
spawn('webpack --watch --stats-error-details --env target=esm', opts);
