/* eslint-disable */
require('./mock/.runtime.js');
/* eslint-enable */
const Koa = require('koa');
const https = require('https');
const app = new Koa();

const request = (url) => new Promise(resolve => {
  let buffer = '';
  https.get(url, (res) => {
    res.on('data', chunk => (buffer += chunk));
    res.on('end', () => resolve(buffer));
  }).on('error', (e) => {
    console.log('https.get error:', e);
    resolve(e.message);
  });
});

app.use(async ctx => {
  const result = await request('https://jsonplaceholder.typicode.com/todos/1');
  ctx.body = result;
});

app.listen(3500);
console.log('Listion at: http://localhost:3500');
