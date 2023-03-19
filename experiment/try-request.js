
const https = require('https');

const request = (url, callback) => new Promise(resolve => {
  let buffer = '';
  const options = {};
  const req = https
    .request(url, options, async res => {

      // log the data
      res.on('data', d => {
        buffer += d;
      });
      res.on('end', () => {
        resolve(buffer);
        console.log('end: ', buffer);
      });
      await callback(res);
    })
    .on('error', err => {
      console.log('Error: ' + err.message);
    });
  req.end();
});

const main = async () => {
  let buffer = '';
  const data = await request('https://jsonplaceholder.typicode.com/todos/1', async res => {
    res.on('data', d => {
      buffer += d;
    });
    res.on('end', () => {
      console.log('end2: ', buffer);
    });
  });
  console.log('res:', data);
};

main();
