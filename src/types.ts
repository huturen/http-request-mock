/* eslint-disable @typescript-eslint/ban-types */
import { ClientRequest, IncomingMessage } from 'http';
import MockItem from './mocker/mock-item';

export interface AnyObject {
  [key: string]: unknown;
}

export interface Query {
  [key: string]: string | string[]
}

export interface Headers {
  [key: string]: string | string[] | undefined
}

export type MockRequestCallback = ((req: RequestInfo) => unknown) | ((req: RequestInfo) => Promise<unknown>);
export type MockResponseBody = MockRequestCallback | unknown;

/**
 * Represents the configuration for a mock request.
 */
export interface MockItemInfo {
  /**
   * The URL or pattern to match for the mock request.
   */
  url?: RegExp | string;

  /**
   * The HTTP method (e.g., GET, POST) for the mock request.
   */
  method?: HttpVerb;

  /**
   * The URL for the remote mock request, which enables the use of remote mock data.
   */
  remote?: string;

  /**
   * The headers for the remote mock request.
   */
  remoteRequestHeaders?: Headers;

  /**
   * The HTTP status code for the mock response.
   */
  status?: number;

  /**
   * The delay before responding, in milliseconds.
   */
  delay?: number;

  /**
   * The headers for the mock response.
   */
  headers?: Headers;

  /**
   * The body content of the mock response.
   */
  body?: MockResponseBody;

  /**
   * Flag to disable the mock item.
   */
  disable?: 'YES' | 'NO';

  /**
   * The number of times the mock request should be made.
   */
  times?: number;

  /**
   * Flag to determine if proxying should be disabled.
   */
  deProxy?: boolean;
}

export interface MockItemExt {
  /**
   * Headers for the remote mock request.
   */
  remoteRequestHeaders?: Headers;

  /**
   * Mock response headers.
   */
  headers?: Headers;

  disable?: 'YES' | 'NO';
  delay?: number;
  times?: number;

  /**
   * Mock HTTP status.
   */
  status?: number;
}

export interface MockConfigData {
  [key: string]: MockItem
}

/**
 * Represents the request information for the mock response callback.
 */
export interface RequestInfo {
  /**
   * The URL of the request.
   */
  url: string;

  /**
   * The HTTP method used for the request.
   */
  method: HttpVerb;

  /**
   * The URL search query parameters.
   */
  query?: Query;

  /**
   * The request headers.
   */
  headers?: Headers;

  /**
   * If the request is a POST, [body] or [rawBody] will be populated.
   * If the body is a JSON string or query string, it will be parsed into an object.
   * Otherwise, the raw post body content will be returned.
   */
  body?: unknown;

  /**
   * The raw body of the request. Depending on the context, the body can be:
   * - For Fetch API requests (see: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#body):
   *   string, ArrayBuffer, Blob, DataView, File, FormData, TypedArray, or URLSearchParams.
   * - For XMLHttpRequest (XHR) requests (see: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/send):
   *   string, Document, Blob, ArrayBuffer, TypedArray, DataView, FormData, URLSearchParams, or null.
   */
  rawBody?: unknown;

  /**
   * Function to perform the original call. Can only be called once.
   */
  doOriginalCall?: () => Promise<OriginalResponse>;
}

export interface OriginalResponse {
  /**
   * If the original call succeeds, the following fields will be populated:
   */
  /**
   * The HTTP response status code.
   */
  status: number | null;

  /**
   * The response headers.
   */
  headers: Headers;

  /**
   * The plain text response, if available.
   */
  responseText: string | null;

  /**
   * The JSON parsed response, if applicable.
   */
  responseJson: unknown | null;

  /**
   * The binary data response as an ArrayBuffer, if applicable.
   */
  responseBuffer: ArrayBuffer | null;

  /**
   * The binary data response as a Blob, if applicable.
   */
  responseBlob: Blob | null;

  /**
   * If the original call throws an exception, the error field will be populated:
   */
  /**
   * The error object representing the exception.
   */
  error: Error | null;
}

export interface RemoteResponse {
  status: number;

  /**
   * Remote response headers.
   */
  headers: Headers;

  response: unknown;
  responseText: string;
  responseJson: AnyObject;
}

export interface XMLHttpRequestInstance extends XMLHttpRequest {
  bypassMock: boolean;
  isMockRequest: string;
  mockItem: MockItem;
  mockResponse: unknown;
  requestInfo: RequestInfo;
  requestArgs: (HttpVerb | string | boolean | null)[];
  timeoutTimer: ReturnType<typeof setTimeout>;
  isTimeout: boolean;
}

// https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
export interface WxObject {
  request: Function;
}

export interface WxRequestOpts {
  url: string;
  method: HttpVerb;
  data: Record<string, string>;

  /**
   * Request header, according to the docs above, must be 'header' here.
   * @see https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
   */
  header: Headers;

  dataType: string;
  responseType: string;
  success: Function;
  fail: Function;
  complete: Function;
}

// https://developers.weixin.qq.com/miniprogram/dev/api/network/request/RequestTask.html
export interface WxRequestTask {
  abort: Function;
  onHeadersReceived: (callback: Function) => unknown;
  offHeadersReceived: (callback: Function) => unknown;
}

// https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
export interface WxResponse {
  data: unknown;
  statusCode: number;
  header: Record<string, string>;
  cookies: string[];
  profile: Record<string, unknown>;
}


export interface ClientRequestType extends ClientRequest{
  nativeInstance: null | ClientRequest;
  nativeReqestName: 'get' | 'request';
  nativeReqestMethod: Function;
  nativeRequestArgs: unknown[];

  response: IncomingMessage;
  requestBody: Buffer;
  mockItemResolver: Function;


  url: string;
  options: ClientRequestOptions;
  method: string;
  callback: ((...args: unknown[]) => unknown) | undefined;
  remoteUrl: string | undefined;

  init: Function;
  setOriginalRequestInfo: Function;
  setMockItemResolver: Function;
  sendResponseResult: Function;
  sendEndingEvent: Function;
  sendError: Function;
  getEndArguments: Function;
  getRemoteRequestHeaders: Function;
  bufferToString: Function;
  fallbackToNativeRequest: Function;
  getOriginalResponse: Function;
}

export interface NodeRequestOpts {
  isNodeRequestOpts: true,
  url: string;
  options: Record<string, string>;
  callback: Function;
}

export interface ClientRequestOptions {
  method: string;
  path: string;
  headers: Record<string, string>;
  timeout: number;
}

export interface DynamicImported {
  default?: unknown;
}


export interface FetchRequest {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
  signal?: AbortSignal
}

export interface FetchResponse {
  body: unknown;
  bodyUsed: boolean;
  headers: Headers,
  ok: boolean;
  redirected: false;
  status: number;
  statusText: string;
  url: string,
  type: string;
  // response data depends on prepared data
  json: () => Promise<AnyObject>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  blob: () => Promise<unknown>;
  formData: () => Promise<unknown>;
  text: () => Promise<string>;
  // other methods that may be used
  clone: () => FetchResponse,
  error: () => FetchResponse,
  redirect: () => FetchResponse,
}

export type HttpVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'ANY' |
  'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'any';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Logs = Array<number | string | Record<string, any> | Logs[]>;
