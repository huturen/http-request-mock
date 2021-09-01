import http from 'http';
import { Socket } from 'net';
import { inherits } from 'util';
import Bypass from '../../common/bypass';
import { getQuery } from '../../common/utils';
import { HTTPStatusCodes } from '../../config';
import MockItem from '../../mocker/mock-item';
import { ClientRequestType, RequestInfo } from '../../types';

/**
 * ClientRequest constructor
 * @param {string} url
 * @param {object} options options of http.get, https.get, http.request or https.request method.
 * @param {function} callback callback of http.get, https.get, http.request or https.request method.
 */
function ClientRequest(
  this: ClientRequestType,
  url: string,
  options: { [key: string]: any },
  callback: undefined | ((...args: any[]) => any),
) {

  // http.OutgoingMessage serves as the parent class of http.ClientRequest and http.ServerResponse.
  // It is an abstract of outgoing message from the perspective of the participants of HTTP transaction.
  http.OutgoingMessage.call(this as any);

  this.requestBody = Buffer.alloc(0);
  this.url = url;
  this.options = options;
  this.callback = callback;
  this.originalInstance = null;

  /**
   * Initialize socket & response object
   */
  this.init = () => {
    const [options, callback] = [this.options, this.callback];
    this.method = options.method || 'GET';
    this.path = options.path || '/';

    // The optional callback parameter will be added as
    // a one-time listener for the 'response' event.
    if (callback) {
      this.once('response', callback);
    }

    // outgoingMessage.headersSent
    if (!this.headersSent && options.headers) {
      for(let key in options.headers) {
        this.setHeader(key, options.headers[key])
      }
    }

    // make an empty socket
    this.socket = new Socket();
    this.connection = this.socket; // for compatibility
    if (/^https/i.test(this.url)) {
      // @ts-ignore
      this.socket.authorized = true;
    }

    if (options.timeout) {
      this.setTimeout(options.timeout);
      this.socket.setTimeout(options.timeout);
    }

    process.nextTick(() => {
      this.emit('socket', this.socket);
      this.socket?.emit('connect');
    });

    if (options.headers?.expect === '100-continue') {
      this.emit('continue');
    }

    this.response = new http.IncomingMessage(this.socket);
  }
  this.init();

  /**
   * Set mock item resolver. 'mockItemResolver' will be used in end method.`
   * @param {Promise<MockItem>} mockItemResolver
   */
  this.setMockItemResolver = (mockItemResolver: Promise<MockItem>) => {
    this.mockItemResolver = mockItemResolver;
    return this;
  }

  this.setOriginalRequestInfo = (originalReqestMethod: Function, originalRequestArgs: any[]) => {
    this.originalReqestMethod = originalReqestMethod;
    this.originalRequestArgs = originalRequestArgs;
  }

  /**
   * Destroy the request. Optionally emit an 'error' event, and emit a 'close' event.
   * Calling this will cause remaining data in the response to be dropped and the socket to be destroyed.
   */
  this.destroy = () => {
    if (this.aborted || this.destroyed) return;

    this.aborted = true;
    this.destroyed = true;

    const error = new Error() as any;
    error.code = 'aborted'

    this.response.emit('close', error);
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
  }

  /**
   * Send error event to the request.
   * @param {string} msg
   */
  this.sendError = (msg: string) => {
    process.nextTick(() => {
      this.emit('error', new Error(msg));
    });
  }

  /**
   * Sends a chunk of the body. This method can be called multiple times.
   * Simulation: request.write(chunk[, encoding][, callback])
   * @param {string | Buffer} chunk
   * @param {any[]} args
   */
  this.write = (chunk: string | Buffer, ...args: any[]) => {
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
        callback()
      }
    }

    setTimeout(() => this.emit('drain'), 1);
    return false
  }

  /**
   * https://nodejs.org/api/http.html#http_request_end_data_encodingcallback
   *
   * Finishes sending the request. If any parts of the body are unsent, it will flush them to the stream.
   * Simulation: request.end([data[, encoding]][, callback])
   * @param {any[]} args
   */
  this.end = async (...args: any[]) => {
    const [data, encoding, callback] = this.getEndArguments(args);
    // If data is specified, it is equivalent to calling
    // request.write(data, encoding) followed by request.end(callback).
    if (data) {
      this.write(data, encoding);
      this.end(callback);
      return this;
    }

    if (!this.response.complete) {
      const res = await this.setResponseResult();
      if (res instanceof Bypass) {
        return this.fallbackToOriginalRequest(...args);
      }
    }

    this.sendEndingEvent(callback);
    return this;
  }

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
    this.response.complete = true

    return this;
  }

  /**
   * It awaits mock item resolver & set response result.
   */
  this.setResponseResult = async () => {
    const mockItem: MockItem = await this.mockItemResolver;

    const responseBody = await mockItem.sendBody(<RequestInfo>{
      url: this.url,
      method: this.options.method || 'GET',
      query: getQuery(this.url),
      headers: this.getRequestHeaders(),
      body: this.bufferToString(this.requestBody)
    });

    if (responseBody instanceof Bypass) {
      return responseBody;
    }

    this.response.statusCode = mockItem.status;
    this.response.statusMessage = HTTPStatusCodes[this.response.statusCode] || '',
    this.response.headers = { ...mockItem.header!, 'x-powered-by': 'http-request-mock' };
    this.response.rawHeaders = Object.entries(this.response.headers).reduce((res, item) => {
      return res.concat(item as any)
    }, []);

    // push: The "chunk" argument must be of type string or an instance of Buffer or Uint8Array.
    if (typeof responseBody === 'string'
      || (responseBody instanceof Buffer)
      || (responseBody instanceof ArrayBuffer)
      || (responseBody instanceof SharedArrayBuffer)
      || (responseBody instanceof Uint8Array)
    ) {
      this.response.push(Buffer.from(responseBody as any));
    } else {
      this.response.push(JSON.stringify(responseBody));
    }
    return true;
  }

  this.fallbackToOriginalRequest = (...endArgs: any[]) => {
    this.originalInstance = this.originalReqestMethod(...this.originalRequestArgs);
    console.log(this.originalReqestMethod, this.originalRequestArgs, this.originalInstance);
    // @ts-ignore
    Object.entries(this.getHeaders()).forEach((entry) => {
      if (entry[1] !== null && entry[1] !== undefined) {
        this.originalInstance!.setHeader(entry[0], entry[1]);
      }
    });
    if (this.requestBody.length) {
      // @ts-ignore
      this.originalInstance.write(this.requestBody);
    }
    // @ts-ignore
    this.originalInstance.on('connect', (...args) => this.emit('connect', ...args));
    // @ts-ignore
    this.originalInstance.on('finish', (...args) => this.emit('finish', ...args));
    // @ts-ignore
    this.originalInstance.on('abort', (...args) => this.emit('abort', ...args));
    // @ts-ignore
    this.originalInstance.on('error', (error) => this.emit('error', error));
    // @ts-ignore
    this.originalInstance.on('information', (...args) => this.emit('information', ...args));
    // @ts-ignore
    this.originalInstance.on('response', (...args) => this.emit('response', ...args));
    // @ts-ignore
    this.originalInstance.on('timeout', (...args) => this.emit('timeout', ...args));

    // @ts-ignore
    this.originalInstance.end(...endArgs);

    return this.originalInstance;
  }

  /**
   * https://nodejs.org/api/http.html#http_request_end_data_encodingcallback
   *
   * Get arguments of end method.
   * @param {any[]} args [data[, encoding]][, callback]
   * @returns
   */
  this.getEndArguments = (args: any[]) => {
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
  }

  /**
   * Convert a buffer to a string.
   * @param {Buffer} buffer
   */
  this.bufferToString = (buffer: Buffer) => {
    const str = buffer.toString('utf8');
    return Buffer.from(str).equals(buffer) ? str : buffer.toString('hex');
  }

  /**
   * Get request headers.
   */
  this.getRequestHeaders = () => {
    return Object.entries({
      ...this.getHeaders(),
      ...this.options.headers
    }).reduce((res:any, [key, val]) => {
      if (val !== undefined && val !== null) {
        res[key.toLowerCase()] = Array.isArray(val)
          ? val.join('; ')
          : (val+'');
      }
      return res
    }, {});
  }
}

// Note: 'class extends' is not work here.
// It'll trigger a default socket connection that we don't expect.
inherits(ClientRequest, http.ClientRequest);

export default ClientRequest;
