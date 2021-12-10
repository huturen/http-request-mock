/* global Buffer: true */
import { expect } from '@jest/globals';
import http from 'http';
import https from 'https';
import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForNode();

describe('test node native http module request ', () => {
  it('http.get should be mocked.', (done) => {
    mocker.get('http://www.google.com/http-get', 'mock response');

    http.get('http://www.google.com/http-get', (res) => {
      expect(res.headers['x-powered-by']).toBe('http-request-mock');

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        expect(chunk).toBe('mock response');
      });
      res.on('end', () => {
        done();
      });
    });
  });

  it('https.get should be mocked.', (done) => {
    mocker.get('https://www.google.com/https-get', 'mock response');

    https.get('https://www.google.com/https-get', (res) => {
      expect(res.headers['x-powered-by']).toBe('http-request-mock');

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        expect(chunk).toBe('mock response');
      });
      res.on('end', () => {
        done();
      });
    });
  });

  it('http.request should be mocked.', (done) => {
    mocker.post('http://www.google.com/http-upload', 'mock response');

    const postData = JSON.stringify({ 'msg': 'Hello World!' });
    const req = http.request({
      hostname: 'www.google.com',
      port: 80,
      path: '/http-upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-powered-by']).toBe('http-request-mock');

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        expect(chunk).toBe('mock response');
      });
      res.on('end', () => {
        done();
      });
    });

    req.on('error', () => void(0));

    req.write(postData);
    req.end();
  });

  it('https.request should be mocked.', (done) => {
    mocker.post('https://www.google.com/https-upload', 'mock response');

    const postData = Buffer.from('{ \'msg\': \'Hello World!\' }');
    const req = https.request({
      protocol: 'https:',
      hostname: 'www.google.com',
      port: 443,
      path: '/https-upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-powered-by']).toBe('http-request-mock');

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        expect(chunk).toBe('mock response');
      });
      res.on('end', () => {
        done();
      });
    });

    req.on('error', () => void(0));

    req.write(postData, () => {
      expect(true).toBe(true); // to be called
    });
    req.end();
  });

  it('http.request should emit a error when writing a non-string and not-buffer data.', (done) => {
    mocker.post('http://www.google.com/error', 'mock response');

    const req = http.request({
      hostname: 'www.google.com',
      port: 80,
      path: '/error',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, (res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-powered-by']).toBe('http-request-mock');

      res.setEncoding('utf8');
      res.on('data', () => void(0));
      res.on('end', () => {
        done();
      });
    });

    req.on('error', (e) => {
      expect(e.message).toMatch('The first argument must be of type string or an instance of Buffer');
    });

    req.write(1234);
    req.end();
  });

  it('http.request should emit a error when destroying a request.', (done) => {
    mocker.post('http://www.google.com/error', 'mock response');

    const req = http.request({
      hostname: 'www.google.com',
      port: 80,
      path: '/error',
      method: 'POST',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        expect: '100-continue',
      }
    }, (res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-powered-by']).toBe('http-request-mock');

      res.setEncoding('utf8');
      res.on('data', () => void(0));
      res.on('end', () => {
        done();
      });
    });
    req.abort();
    expect(req.aborted).toBe(true);
    expect(req.destroyed).toBe(true);

    req.on('error', (e) => {
      expect(e.message).toMatch('The request has been aborted');
    });

    req.write('');
    req.end('test');
  });
});



