import axios from 'axios';
import xhrAdapter from 'axios/lib/adapters/xhr';
import https from 'https';
import HttpRequestMock from '../src/index';

describe('do original call', () => {
  it('requestInfo should have doOriginalCall method for "xhr"', async () => {
    let doOriginalCall;
    const mocker = HttpRequestMock.setupForUnitTest('xhr');
    axios.defaults.adapter = xhrAdapter; // use xhr adapter

    mocker.mock({
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      response: async function(requestInfo) {
        doOriginalCall = requestInfo.doOriginalCall;
        return { data: 'fake' };
      }
    });


    const res = await axios('https://jsonplaceholder.typicode.com/todos/1?test=1').then((response) => {
      return response.data;
    });
    expect(res).toMatchObject({ data: 'fake' });
    expect(typeof doOriginalCall).toBe('function');
  });

  it('requestInfo should have doOriginalCall method for "fetch"', async () => {
    let doOriginalCall;
    const mocker = HttpRequestMock.setupForUnitTest('fetch'); // fetch on node
    mocker.mock({
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      response: async function(requestInfo) {
        doOriginalCall = requestInfo.doOriginalCall;
        // console.log('original response:', await requestInfo.doOriginalCall());
        return { data: 'fake' };
      }
    });

    const res = await global.fetch('https://jsonplaceholder.typicode.com/todos/1?test=1')
      .then((response) => response.json())
      .then((data) => data);
    expect(res).toMatchObject({ data: 'fake' });
    expect(typeof doOriginalCall).toBe('function');
  });

  it('requestInfo should have doOriginalCall method for "wx.request"', async () => {
    let doOriginalCall;
    const mocker = HttpRequestMock.setupForUnitTest('wx');

    mocker.mock({
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      response: async function(requestInfo) {
        doOriginalCall = requestInfo.doOriginalCall;
        return { data: 'fake' };
      }
    });

    const res = await new Promise(resolve => {
      // eslint-disable-next-line no-undef
      wx.request({
        url: 'https://jsonplaceholder.typicode.com/todos/1?test=1',
        success(res) {
          resolve(res.data);
        }
      });
    });

    expect(res).toMatchObject({ data: 'fake' });
    expect(typeof doOriginalCall).toBe('function');
  });


  it('requestInfo should have doOriginalCall method for "https.get"', async () => {
    let doOriginalCall;
    const mocker = HttpRequestMock.setupForUnitTest('node');

    mocker.mock({
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      response: async function(requestInfo) {
        doOriginalCall = requestInfo.doOriginalCall;
        // console.log('original response:', await requestInfo.doOriginalCall());
        return { data: 'fake' };
      }
    });

    const res = await new Promise(resolve => {
      let buffer = '';
      https.get('https://jsonplaceholder.typicode.com/todos/1', (res) => {
        res.on('data', chunk => (buffer += chunk));
        res.on('end', () => resolve(JSON.parse(buffer)));
      });
    });

    expect(res).toMatchObject({ data: 'fake' });
    expect(typeof doOriginalCall).toBe('function');
  });
});
