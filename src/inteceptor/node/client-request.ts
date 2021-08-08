import http from 'http';
import { Socket } from 'net';
import { inherits } from 'util';
import { HTTPStatusCodes } from '../../config';
import { MockItemInfo } from '../../types';


/**
 * http.OutgoingMessage serves as the parent class of http.ClientRequest and http.ServerResponse.
 * It is an abstract of outgoing message from the perspective of the participants of HTTP transaction.
 */
class ClientRequest extends http.OutgoingMessage {
  private response: http.IncomingMessage;
  private requestBody: Buffer = Buffer.alloc(0);
  private mockItemResolver: Promise<MockItemInfo>;

  private url: string = '';
  private options: { [key: string]: any } = {};
  private callback: ((...args: any[]) => any) | undefined;

  // necessary properties in http.ClientRequest
  private method: string;
  private host: string;
  private path: string;
  private aborted: boolean;

  /**
   * constructor
   * @param {string} url
   * @param {object} options options of http.get, https.get, http.request or https.request method.
   * @param {function} callback callback of http.get, https.get, http.request or https.request method.
   */
  constructor(
    url: string,
    options: { [key: string]: any },
    callback?: (...args: any[]) => any
  ) {
    super();

    this.url = url;
    this.options = options;
    this.callback = callback;


    this.init();
  }

  /**
   * Initialize socket & response object
   */
  private init() {
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

  /**
   * Set mock item resolver. 'mockItemResolver' will be used in end method.`
   * @param {Promise<MockItemInfo>} mockItemResolver
   */
  public setMockItemResolver(mockItemResolver: Promise<MockItemInfo>) {
    this.mockItemResolver = mockItemResolver;
    return this;
  }

  /**
   * Destroy the request. Optionally emit an 'error' event, and emit a 'close' event.
   * Calling this will cause remaining data in the response to be dropped and the socket to be destroyed.
   */
  public destroy() {
    if (this.aborted || this.destroyed) return;

    this.aborted = true;
    this.destroyed = true;

    const error = new Error() as any;
    error.code = 'aborted'

    this.response.emit('close', error);
    // socket.destroy()
    this.emit('abort')
  };

  /**
   * We keep abort method for compatibility.
   * 'abort' has been Deprecated; Use request.destroy() instead.
   */
  public abort() {
    this.destroy();
  }

  /**
   * Send error event to the request.
   * @param {string} msg
   */
  private sendError(msg: string) {
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
  public write(chunk: string | Buffer, ...args: any[]) {
    if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) {
      this.sendError('The first argument must be of type string or an instance of Buffer.');
      return false;
    }
    const callback = typeof args[1] === 'function' ? args[1] : args[2];
    if (this.aborted) {
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
  public async end(...args: any[]) {
    const [data, encoding, callback] = this.getEndArguments(args);
    // If data is specified, it is equivalent to calling
    // request.write(data, encoding) followed by request.end(callback).
    if (data) {
      this.write(data, encoding);
      this.end(callback);
      return this;
    }

    if (!this.response.complete) {
      const mockItem: MockItemInfo = await this.mockItemResolver;

      this.response.statusCode = mockItem.status || 200;
      this.response.statusMessage = HTTPStatusCodes[mockItem.status!] || '',
      this.response.headers = { ...mockItem.header!, 'x-powered-by': 'http-request-mock' };
      this.response.rawHeaders = Object.entries(this.response.headers).reduce((res, item) => {
        return res.concat(item as any)
      }, []);

      const responseBody: any = typeof mockItem.response === 'function'
        ? mockItem.response({
          url: this.url,
          method: this.options.method || 'GET',
          headers: this.getRequestHeaders(),
          body: this.bufferToString(this.requestBody)
        })
        : mockItem.response;

      // push: The "chunk" argument must be of type string or an instance of Buffer or Uint8Array.
      if (typeof mockItem.response === 'string'
        || (mockItem.response instanceof Buffer)
        || (mockItem.response instanceof ArrayBuffer)
        || (mockItem.response instanceof SharedArrayBuffer)
        || (mockItem.response instanceof Uint8Array)
      ) {
        this.response.push(Buffer.from(responseBody));
      } else {
        this.response.push(JSON.stringify(responseBody));
      }
    }

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
   * https://nodejs.org/api/http.html#http_request_end_data_encodingcallback
   *
   * Get arguments of end method.
   * @param {any[]} args [data[, encoding]][, callback]
   * @returns
   */
  private getEndArguments(args: any[]) {
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
  private bufferToString(buffer: Buffer) {
    const str = buffer.toString('utf8');
    return Buffer.from(str).equals(buffer) ? str : buffer.toString('hex');
  }

  /**
   * Get request headers.
   */
  private getRequestHeaders() {
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

// Note: extends is not work here.
inherits(ClientRequest, http.ClientRequest);

export default ClientRequest;