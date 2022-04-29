import { expect, jest } from '@jest/globals';
import http from 'http';
import https from 'https';
// Use * as simpleRequest" to simplify codes
import * as simpleRequest from '../src/common/request';
import { isArrayBuffer, str2arrayBuffer } from '../src/common/utils';
import dummyFetch from '../src/dummy/fetch';
import dummyWxRequest from '../src/dummy/wx-request';
import dummyXhr from '../src/dummy/xhr';

const originalSimpleRequestDefaultObject = simpleRequest.default;
let times = 0;
const xhrRequest = (url, method, body = null, opts = {}) => {
  return new Promise((resolve, reject) => {
    const xhr = new dummyXhr();
    const openLeftArgs = { // for coverage
      1: [true],
      2: [true, 'abc'],
      3: [true, 'abc', '123'],
    }[++times] || [];
    xhr.open(url, method, ...openLeftArgs);
    xhr.setRequestHeader('abc', 'xyz');
    xhr.dispatchEvent = opts.dispatchEvent
      ? () => {
        opts.dispatchEvent();
        resolve(xhr);
      }
      : (() => void(0));
    xhr.onerror = opts.onerror || ((err) => {
      reject(err);
    });
    xhr.responseType = opts.responseType || 'json';
    xhr.onloadend = opts.onloadend || (() => {
      resolve(xhr);
    });
    xhr.onload = opts.onloadend || (() => void(0));
    xhr.onreadystatechange = opts.onreadystatechange || (() => void(0));
    xhr.send(body);
  });
};

const wxRequest = (opts) => {
  return new Promise((resolve, reject) => {
    dummyWxRequest({
      url: 'http://www.example.com',
      method: 'post',
      dataType: 'json',
      data: '{"abc":123}',
      success(res) {
        resolve(res);
      },
      fail(err) {
        reject(err);
      },
      complete() {
        void(0);
      },
      ...opts,
    });
  });
};

// axios.defaults.adapter = httpAdapter; //
describe('test fake request object', () => {
  it('dummyFetch method should simulate capabilities of fetch request object', async () => {
    const fakeResponse = {
      body: {msg:'fake-body'},
      response: {
        statusMessage: 'OK',
        headers: { abc: 'xyz' }
      }
    };
    // eslint-disable-next-line no-import-assign
    simpleRequest.default = jest.fn().mockResolvedValue(fakeResponse);
    const res = await dummyFetch(new URL('http://www.example.com'));
    const body = await res.text();
    expect((res.headers instanceof Headers) && res.headers.get('abc') === 'xyz').toBe(true);
    expect(body).toContain('fake-body');
    expect(res.json().then).toBeTruthy();
    expect(res.arrayBuffer().then).toBeTruthy();
    expect(res.blob().then).toBeTruthy();
    expect(res.formData().then).toBeTruthy();
    expect(res.text().then).toBeTruthy();
    expect(res.clone()).toBeTruthy();
    expect(res.error()).toBeTruthy();
    expect(res.redirect()).toBeTruthy();

    fakeResponse.body = str2arrayBuffer('{"msg": "fake-body"}');
    const res1 = await dummyFetch('http://www.example.com').then(res => res.arrayBuffer());
    expect(isArrayBuffer(res1)).toBe(true);

    fakeResponse.body = '{"msg": "fake-body"}';
    const res2 = await dummyFetch('http://www.example.com').then(res => res.arrayBuffer());
    expect(isArrayBuffer(res2)).toBe(true);

    fakeResponse.body = {msg:'fake-body'};
    global.Headers = undefined;
    const res3 = await dummyFetch({url: 'http://www.example.com' });
    const body3 = await res3.text();
    expect(res3.headers.abc === 'xyz').toBe(true);
    expect(body3).toContain('fake-body');

    global.Response = function(){
      void(0);
    };
    global.Blob = undefined;
    const res4 = await dummyFetch('http://www.example.com');
    expect(res4).toBeInstanceOf(global.Response);

    simpleRequest.default.mockRestore();
  });

  it('dummyXhr method should simulate capabilities of XMLHttpRequest request object', async () => {
    const fakeResponse = {
      body: '{"msg":"fake-body"}',
      response: {
        statusMessage: 'OK',
        headers: { abc: 'xyz' }
      }
    };
    // eslint-disable-next-line no-import-assign
    simpleRequest.default = jest.fn().mockResolvedValue(fakeResponse);
    const xhr = await xhrRequest('http://www.example.com', 'post', {abc: 123});
    expect(xhr.response).toMatchObject({msg:'fake-body'});
    expect(typeof xhr.getAllResponseHeaders() === 'string').toBe(true);
    expect(xhr.getResponseHeader('abc')).toBe('xyz');
    expect(xhr.getResponseHeader('efg')).toBe(null);

    // body: object
    fakeResponse.body = {msg:'fake-body'};
    fakeResponse.response.headers = undefined;
    const xhr2 = await xhrRequest('http://www.example.com', 'post', {abc: 123});
    expect(xhr2.response).toMatchObject({msg:'fake-body'});

    // body: json string
    fakeResponse.body = '{"msg": "fake-body"}',
    fakeResponse.response.headers = { abc: 'xyz' };
    const xhr3 = await xhrRequest('http://www.example.com', 'post', {abc: 123});
    expect(xhr3.response).toMatchObject({msg:'fake-body'});

    // body: bad json string
    fakeResponse.body = '{"msg":"fake-body"';
    const xhr4 = await xhrRequest('http://www.example.com', 'post', {abc: 123});
    expect(xhr4.response).toBe(null);

    // arraybuffer
    fakeResponse.body = {msg:'fake-body'};
    const xhr5 = await xhrRequest('http://www.example.com', 'post', {abc: 123}, {
      responseType: 'arraybuffer'
    });
    expect(isArrayBuffer(xhr5.response)).toBe(true);
    expect(xhr5.responseText).toContain('fake-body');

    fakeResponse.body = str2arrayBuffer('{msg:"fake-body"}');
    const xhr6 = await xhrRequest('http://www.example.com', 'post', {abc: 123}, {
      responseType: 'arraybuffer'
    });
    expect(isArrayBuffer(xhr6.response)).toBe(true);

    fakeResponse.body = '{msg:"fake-body"}';
    const xhr7 = await xhrRequest('http://www.example.com', 'post', {abc: 123}, {
      responseType: 'arraybuffer'
    });
    expect(isArrayBuffer(xhr7.response)).toBe(true);
    expect(xhr7.responseText).toBe('{msg:"fake-body"}');

    // dispatchEvent
    const dispatchEvent = jest.fn();
    await xhrRequest('http://www.example.com', 'post', '', {
      dispatchEvent,
      onreadystatechange: 1, // not a function
      onload: 1, // not a function
      onloadend: 1, // not a function
    });
    expect(dispatchEvent).toBeCalled();

    // abort
    const xhr8 = await xhrRequest('http://www.example.com', 'post', '');
    xhr8.abort();
    expect(xhr8.status).toBe(0);

    // eslint-disable-next-line no-import-assign
    simpleRequest.default = jest.fn().mockRejectedValue(new Error('fake'));
    const xhr9 = await xhrRequest('http://www.example.com', 'post').catch(e => e);
    expect(xhr9 instanceof Error).toBe(true);

    simpleRequest.default.mockRestore();
  });

  it('dummyWxRequest method should simulate capabilities of wx.request object', async () => {
    const fakeResponse = {
      body: {msg:'fake-body'},
      response: {
        statusMessage: 'OK',
        headers: { abc: 'xyz' }
      }
    };
    // eslint-disable-next-line no-import-assign
    simpleRequest.default = jest.fn().mockResolvedValue(fakeResponse);
    const res = await wxRequest({ data: '{"abc":123}' });
    expect(res.data).toMatchObject({msg:'fake-body'});

    fakeResponse.body = {msg:'fake-body'};
    const res2 = await wxRequest({ dataType: '', responseType: 'text' });
    expect(typeof res2.data === 'string').toBe(true);

    fakeResponse.body = '{"msg":"fake-body"}';
    const res3 = await wxRequest({ dataType: '', responseType: 'text' });
    expect(typeof res3.data === 'string').toBe(true);

    fakeResponse.body = {msg:'fake-body'};
    const res4 = await wxRequest({ dataType: '', responseType: 'arraybuffer' });
    expect(isArrayBuffer(res4.data)).toBe(true);

    fakeResponse.body = '{"msg":"fake-body"}';
    const res5 = await wxRequest({ dataType: '', responseType: 'arraybuffer' });
    expect(isArrayBuffer(res5.data)).toBe(true);

    fakeResponse.body = str2arrayBuffer('{"msg":"fake-body"}');
    const res6 = await wxRequest({ dataType: '', responseType: 'arraybuffer' });
    expect(isArrayBuffer(res6.data)).toBe(true);

    fakeResponse.body = '{"msg": str}'; // bad json string
    const err = await wxRequest({}).catch(e => e);
    expect(err).toBeInstanceOf(Error);

    // eslint-disable-next-line no-import-assign
    simpleRequest.default = jest.fn().mockRejectedValue(new Error('fake'));
    const err2 = await wxRequest({url: 'https://www.example.com'}).catch(e => e);
    expect(err2 instanceof Error).toBe(true);

    expect(dummyWxRequest({url: 'https://www.example.com'}).abort()).toBe(undefined);
    simpleRequest.default.mockRestore();
  });

  it('request method should trigger a fallback request using nodejs native http/https module', async () => {
    const on = jest.fn((key, fn) => {
      (key === 'error') && fn(new Error('fake'));
    });
    const end = jest.fn();
    const emit = jest.fn((key) => {
      (key === 'error') && on('error', (() => void(0)));
    });
    const request = jest.fn((url, opts, callback) => {
      const response = {
        headers:{},
        once(key, fn){
          (key === 'end') && fn();
          if (url === 'http://www.example.com') {
            (key === 'error') && fn(new Error('fake'));
          }
        },
        on(key, fn){
          (key === 'data') && fn('fake-body');
        },
        pipe(){
          void(0);
        },
        removeAllListeners() {
          void(0);
        }
      };
      callback(response);

      return { on, end, emit };
    });
    const [oriHttpsRequest, oriHttpRequest] = [https.request, http.request];
    https.request = request;
    http.request = request;

    await originalSimpleRequestDefaultObject({ url: 'https://www.example.com', body: 'abc=123' }).catch(() => void(0));
    expect(https.request).toBeCalled();

    await originalSimpleRequestDefaultObject({
      url: 'http://www.example.com',
      method: 'get',
      header: {},
      body: '123'
    }).catch(e => {
      expect(e instanceof Error).toBe(true);
    });
    expect(http.request).toBeCalled();
    [https.request, http.request] = [oriHttpsRequest, oriHttpRequest];
  });
});
