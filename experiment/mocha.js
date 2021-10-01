// run `npm run build` before running the command below
// npm run build && npx mocha experiment/mocha.js
const HttpRequestMock = require('../dist/index');
const mocker = HttpRequestMock.setupForUnitTest('all');

const axios = require('axios');
const assert = require('assert');

let times = 0;
mocker.get('www.api.com/mocha', (requestInfo) => {
  times = times + 1;
  return { url: requestInfo.url, times };
});

describe('mocha enviroment test', function() {
  it('the response of XHR request should match expected result', function(done) {
    const url = 'https://www.api.com/mocha?type=xhr';
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
    const url = 'https://www.api.com/mocha?type=fetch';
    fetch(url).then(res => res.json()).then(result => {
      assert.strictEqual(result.url, url);
      assert.strictEqual(result.times, 2);
      done();
    });
  });

  it('the response of wx.request should match expected result', function(done) {
    const url = 'https://www.api.com/mocha?type=wx';
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
    const url = 'https://www.api.com/mocha?type=axios';
    axios.get(url, { responseType: 'json' }).then(res => {
      const result = res.data;
      assert.strictEqual(result.url, url);
      assert.strictEqual(result.times, 4);
      done();
    });
  });
});
