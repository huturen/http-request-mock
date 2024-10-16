import { IncomingMessage } from 'http';
/* eslint-disable @typescript-eslint/ban-types */
import http from 'http';
import { Socket } from 'net';
import { inherits } from 'util';
import Bypass from '../../common/bypass';
import simpleRequest, { parseResponseBody } from '../../common/request';
import { getQuery } from '../../common/utils';
import { HTTPStatusCodes } from '../../config';
import MockItem from '../../mocker/mock-item';
import Mocker from '../../mocker/mocker';
import { ClientRequestOptions, ClientRequestType, OriginalResponse, RequestInfo } from '../../types';
import { RemoteResponse } from './../../types';

/**
 * ClientRequest constructor
 * @param {string} url
 * @param {object} options options of http.get, https.get, http.request or https.request method.
 * @param {function} callback callback of http.get, https.get, http.request or https.request method.
 */
function ClientRequest(
  this: ClientRequestType,
  url: string,
  options: ClientRequestOptions,
  callback: undefined | ((...args: unknown[]) => unknown)
) {

  // http.OutgoingMessage serves as the parent class of http.ClientRequest and http.ServerResponse.
  // It is an abstract of outgoing message from the perspective of the participants of HTTP transaction.
  http.OutgoingMessage.call(this as ClientRequestType);

  this.requestBody = Buffer.alloc(0);
  this.url = url;
  this.options = options;
  this.callback = callback;
  this.nativeInstance = null;

  /**
   * Initialize socket & response object
   */
  this.init = () => {
    const [options, callback] = [this.options, this.callback];
    this.method = options.method || 'GET';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.path = options.path || '/';

    // The optional callback parameter will be added as
    // a one-time listener for the 'response' event.
    if (callback) {
      this.once('response', callback);
    }

    // outgoingMessage.headersSent
    if (!this.headersSent && options.headers) {
      for(const key in options.headers) {
        this.setHeader(key, options.headers[key]);
      }
    }

    // make an empty socket
    const emptySocket = new Socket();
    Object.assign(this, {
      socket: emptySocket, // for compatibility
      connection: emptySocket,
    });
    if (/^https/i.test(this.url)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.socket.authorized = true;
    }

    if (options.timeout) {
      this.setTimeout(options.timeout);
      this.socket?.setTimeout(options.timeout);
    }

    if (options.headers?.expect === '100-continue') {
      this.emit('continue');
    }

    this.response = new http.IncomingMessage(this.socket as Socket);

    this.emit('socket', this.socket);
    this.socket?.emit('connect');
  };
  this.init();

  /**
   * Set mock item resolver. 'mockItemResolver' will be used in end method.`
   * @param {Promise<MockItem>} mockItemResolver
   */
  this.setMockItemResolver = (mockItemResolver: Function) => {
    this.mockItemResolver = mockItemResolver;
    return this;
  };

  this.setOriginalRequestInfo = (
    getOrRequest: 'get' | 'request',
    nativeReqestMethod: Function,
    nativeRequestArgs: unknown[]
  ) => {
    this.nativeReqestName = getOrRequest; // get or request
    this.nativeReqestMethod = nativeReqestMethod;
    this.nativeRequestArgs = nativeRequestArgs;
  };

  /**
   * Destroy the request. Optionally emit an 'error' event, and emit a 'close' event.
   * Calling this will cause remaining data in the response to be dropped and the socket to be destroyed.
   */
  this.destroy = () => {
    if (this.aborted || this.destroyed) return this;

    this.aborted = true;
    this.destroyed = true;

    this.response.emit('close', { ...new Error(), code: 'aborted' });
    // socket.destroy()
    this.emit('abort');

    return this;
  };

  /**
   * We keep abort method for compatibility.
   * 'abort' has been Deprecated; Use request.destroy() instead.
   */
  this.abort = () => {
    this.destroy();
    return this;
  };

  /**
   * Send error event to the request.
   * @param {string} msg
   */
  this.sendError = (msg: string) => {
    process.nextTick(() => {
      this.emit('error', new Error(msg));
    });
  };

  /**
   * Sends a chunk of the body. This method can be called multiple times.
   * Simulation: request.write(chunk[, encoding][, callback])
   * @param {string | Buffer} chunk
   * @param {unknown[]} args
   */
  this.write = (chunk: string | Buffer, ...args: unknown[]) => {
    if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) {
      this.sendError('The first argument must be of type string or an instance of Buffer.');
      return false;
    }
    const callback = typeof args[1] === 'function' ? args[1] : args[2];
    if (this.aborted || this.destroyed) {
      this.sendError('The request has been aborted.');
    } else {
      if (chunk.length) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        this.requestBody = Buffer.concat([this.requestBody, buf]);
      }
      // The callback argument is optional and will be called when this
      // chunk of data is flushed, but only if the chunk is non-empty.
      if (chunk.length && typeof callback === 'function') {
        callback();
      }
    }

    setTimeout(() => this.emit('drain'), 1);
    return false;
  };

  /**
   * https://nodejs.org/api/http.html#http_request_end_data_encodingcallback
   *
   * Finishes sending the request. If any parts of the body are unsent, it will flush them to the stream.
   * Simulation: request.end([data[, encoding]][, callback])
   * @param {unknown[]} args
   */
  this.end = (...args: unknown[]) => {
    const [data, encoding, callback] = this.getEndArguments(args);
    // If data is specified, it is equivalent to calling
    // request.write(data, encoding) followed by request.end(callback).
    if (data) {
      this.write(data, encoding);
      this.end(callback);
      return this;
    }

    if (!this.response.complete) {
      this.sendResponseResult(callback, ...args);
      return this;
    }

    this.sendEndingEvent(callback);
    return this;
  };

  /**
   * It awaits mock item resolver & set response result.
   */
  this.sendResponseResult = (endCallback: Function, ...endArgs: unknown[]) => {
    const now = Date.now();
    this.mockItemResolver(async (mockItem: MockItem, mocker: Mocker) => {
      const method = this.options.method || 'GET';
      const requestInfo = <RequestInfo>{
        url: this.url,
        method,
        query: getQuery(this.url),
        headers: this.getRemoteRequestHeaders(),
        body: method === 'GET' ? undefined : this.bufferToString(this.requestBody)
      };

      requestInfo.doOriginalCall = async (): Promise<OriginalResponse> => {
        const res = await this.getOriginalResponse();
        requestInfo.doOriginalCall = undefined;
        return res;
      };

      let remoteResponse: RemoteResponse | null = null;
      const remoteInfo = mockItem?.getRemoteInfo(url);
      if (remoteInfo) {
        try {
          const { body, json, response } = await simpleRequest({
            url: remoteInfo.url,
            method: remoteInfo.method || this.options.method || 'GET',
            headers: {
              ...requestInfo.headers as Record<string, string>,
              ...mockItem.remoteRequestHeaders,
            },
            body: this.requestBody
          });
          remoteResponse = {
            status: response.statusCode as number,
            headers: response.headers,
            response: json || body,
            responseText: body,
            responseJson: json,
          };
        } catch(err) {
          this.sendError('Get remote result error: ' + (err as Error).message);
          return false;
        }
      }
      mockItem.sendBody(requestInfo, remoteResponse).then((responseBody) => {
        if (responseBody instanceof Bypass) {
          if (remoteResponse) {
            throw new Error('[http-request-mock] A request which is marked by @remote tag cannot be bypassed.');
          }
          return this.fallbackToNativeRequest(...endArgs);
        }
        const spent = Date.now() - now;
        mocker.sendResponseLog(spent, responseBody, requestInfo, mockItem);

        this.response.statusCode = mockItem.status;
        this.response.statusMessage = HTTPStatusCodes[this.response.statusCode] || '',
        this.response.headers = {
          ...mockItem.headers,
          ...(remoteResponse?.headers || {}),
          'x-powered-by': 'http-request-mock'
        };
        this.response.rawHeaders = Object.entries(this.response.headers).reduce((res, item) => {
          return res.concat(item as never);
        }, []);

        // push: The "chunk" argument must be of type string or an instance of Buffer or Uint8Array.
        if (typeof responseBody === 'string'
          || (responseBody instanceof Buffer)
          || (responseBody instanceof ArrayBuffer)
          || (responseBody instanceof SharedArrayBuffer)
          || (responseBody instanceof Uint8Array)
        ) {
          this.response.push(Buffer.from(responseBody as string));
        } else {
          this.response.push(JSON.stringify(responseBody));
        }
        this.sendEndingEvent(endCallback);
      }).catch(err => {
        console.warn('[http-request-mock] mock response error, ' + (err as Error).message);
        this.response.statusCode = mockItem.status;
        this.response.statusMessage = HTTPStatusCodes[this.response.statusCode] || '',
        this.response.headers = { ...mockItem.headers, 'x-powered-by': 'http-request-mock' };
        this.response.rawHeaders = Object.entries(this.response.headers).reduce((res, item) => {
          return res.concat(item as never);
        }, []);

        const responseBody = '';
        this.response.push(Buffer.from(responseBody));
        mocker.sendResponseLog(Date.now() - now, responseBody, requestInfo, mockItem);
        this.sendEndingEvent(endCallback);
      });
    });
  };

  /**
   * Send completed event.
   */
  this.sendEndingEvent = (callback: Function) => {
    if (typeof callback === 'function') {
      callback();
    }

    this.finished = true; // We keep the finish property for compatibility.
    this.emit('finish');
    this.emit('response', this.response);

    // The message.complete property will be true if a complete
    // HTTP message has been received and successfully parsed.
    this.response.push(null);
    this.response.complete = true;

    return this;
  };

  this.fallbackToNativeRequest = (...endArgs: never[]) => {
    this.nativeInstance = this.nativeReqestMethod(...this.nativeRequestArgs);
    Object.entries(this.getHeaders()).forEach((entry) => {
      if (entry[1] !== null && entry[1] !== undefined) {
        this.nativeInstance && this.nativeInstance.setHeader(entry[0], entry[1]);
      }
    });
    if (this.requestBody.length) {
      this.nativeInstance && this.nativeInstance.write(this.requestBody);
    }
    if (this.nativeInstance) {
      this.nativeInstance.on('connect', (...args) => this.emit('connect', ...args));
      this.nativeInstance.on('finish', (...args) => this.emit('finish', ...args));
      this.nativeInstance.on('abort', (...args) => this.emit('abort', ...args));
      this.nativeInstance.on('error', (error) => this.emit('error', error));
      this.nativeInstance.on('information', (...args) => this.emit('information', ...args));
      this.nativeInstance.on('response', (...args) => this.emit('response', ...args));
      this.nativeInstance.on('timeout', (...args) => this.emit('timeout', ...args));
      this.nativeInstance.end(...endArgs);
    }
    return this.nativeInstance;
  };

  this.getOriginalResponse = (): Promise<OriginalResponse> => {
    const callback = this.nativeRequestArgs[this.nativeRequestArgs.length - 1];

    const defaultResponse = {
      status: null,
      headers: {},
      responseText: null,
      responseJson: null,
      responseBuffer: null,
      responseBlob: null,
      error: null,
    };
    return new Promise((resolve) => {
      const newCallback = (res: IncomingMessage) => {
        parseResponseBody(res).then(data => {
          resolve(data);
        }).catch(err => {
          resolve({ ...defaultResponse, error: err });
        });
        if (typeof callback === 'function') {
          callback(res);
        }
      };
      const callbackIndex = typeof callback === 'function'
        ? this.nativeRequestArgs.length - 1
        : this.nativeRequestArgs.length;

      this.nativeRequestArgs[callbackIndex] = newCallback;

      // do original call
      const req = this.nativeReqestMethod(...this.nativeRequestArgs);
      req.on('error', (err: Error) => {
        resolve({ ...defaultResponse, error: err });
      });
      if (this.nativeReqestName = 'get') {
        req.end();
      }
    });
  };

  /**
   * https://nodejs.org/api/http.html#http_request_end_data_encodingcallback
   *
   * Get arguments of end method.
   * @param {unknown[]} args [data[, encoding]][, callback]
   * @returns
   */
  this.getEndArguments = (args: unknown[]) => {
    let data;
    let encoding;
    let callback;
    if (args.length === 3) {
      [data, encoding, callback] = args;
    } else if (args.length === 2) {
      [data, encoding] = args;
    } else if (args.length === 1) {
      data = typeof args[0] === 'function' ? undefined : args[0];
      callback = typeof args[0] === 'function' ? args[0] : undefined;
    }
    return [data, encoding, callback];
  };

  /**
   * Convert a buffer to a string.
   * @param {Buffer} buffer
   */
  this.bufferToString = (buffer: Buffer) => {
    const str = buffer.toString('utf8');
    return Buffer.from(str).equals(buffer) ? str : buffer.toString('hex');
  };

  /**
   * Get request headers.
   */
  this.getRemoteRequestHeaders = () => {
    return Object.entries({
      ...this.getHeaders(),
      ...this.options.headers
    }).reduce((res:Record<string, string>, [key, val]) => {
      if (val !== undefined && val !== null) {
        res[key.toLowerCase()] = Array.isArray(val)
          ? val.join('; ')
          : (val+'');
      }
      return res;
    }, {});
  };
}

// Note: 'class extends' is not work here.
// It'll trigger a default socket connection that we don't expect.
inherits(ClientRequest, http.ClientRequest);

export default ClientRequest;
