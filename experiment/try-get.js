
const https = require('https');

const request = (url) => new Promise(resolve => {
  let buffer = '';
  https.get(url, (res) => {
    res.on('data', chunk => (buffer += chunk));
    res.on('end', () => resolve(buffer));
  }).on('error', (e) => {
    console.log('https.get error:', '[', e, ']');
    resolve(e.message);
  });
});

const main = async () => {
  const res = await request('https://jsonplaceholder.typicode.com/todos/1');
  console.log('res:', res);
};

main();
