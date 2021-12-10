// run `npm run build` before running the command below
// npm run build && node experiment/node.js
const HttpRequestMock = require('../dist/index');
// const HttpRequestMock = require('http-request-mock');
const mocker = HttpRequestMock.setupForUnitTest('all');

const axios = require('axios');
const assert = require('assert');

let times = 0;
mocker.get('www.api.com/node', (requestInfo) => {
  times = times + 1;
  return { url: requestInfo.url, times };
});

const describe = (title, callback) => {
  console.log(title);
  callback();
};

const it = (title, callback) => {
  try {
    callback(() => {
      console.log('  \x1b[32mpassed\x1b[0m: ' + title);
    });
  } catch(e) {
    console.log('  \x1b[31mfailed\x1b[0m: ' + title);
    console.log('    ' + e.message.replace(/\n/g, '\n    '));
  }
};


describe('node enviroment test', function() {
  it('the response of XHR request should match expected result', function(done) {
    const url = 'https://www.api.com/node?type=xhr';
    const xhr = new XMLHttpRequest();
    xhr.open('get', url);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function () {
      const result = xhr.response;
      assert.strictEqual(result.url, url);
      assert.strictEqual(result.times, 1);
      done();
    };
    xhr.send();
  });

  it('the response of fetch request should match expected result', function(done) {
    const url = 'https://www.api.com/node?type=fetch';
    fetch(url).then(res => res.json()).then(result => {
      assert.strictEqual(result.url, url);
      assert.strictEqual(result.times, 2);
      done();
    });
  });

  it('the response of wx.request should match expected result', function(done) {
    const url = 'https://www.api.com/node?type=wx';
    /* global wx: true */
    wx.request({
      url,
      success: (res) => {
        const result = res.data;
        assert.strictEqual(result.url, url);
        assert.strictEqual(result.times, 3);
        done();
      }
    });
  });

  it('the response of axios request should match expected result', function(done) {
    const url = 'https://www.api.com/node?type=axios';
    axios.get(url, { responseType: 'json' }).then(res => {
      const result = res.data;
      assert.strictEqual(result.url, url);
      assert.strictEqual(result.times, 4);
      done();
    });
  });
});
