/* eslint-disable @typescript-eslint/ban-types */
import http from 'http';
import MockItem from './mocker/mock-item';

// enums
export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  ANY = 'ANY'
}

export enum Disable {
  YES = 'YES',
  NO = 'NO',
}

// interfaces:


export interface AnyObject {
  [key: string]: unknown;
}

export interface Query {
  [key: string]: string | string[]
}

export interface Header {
  [key: string]: string
}

export interface MockItemInfo {
  url?: RegExp | string;
  method?: HttpVerb;
  requestHeaders?: Header, // request headers, only available for @remote config
  header?: Header; // response header, the same as headers, just for backward compatibility
  headers?: Header; // response header
  delay?: number;
  body?: unknown; // response body
  response?: unknown; // response body, for backward compatibility
  remote?: string; // url of remote mock data
  status?: number; // http status code
  disable?: 'YES' | 'NO';
  times?: number;
  deProxy?: boolean;
}

export interface MockItemExt {
  requestHeaders?: Header, // request headers, only available for @remote config
  header?: Header, // response headers, the same as headers, just for backward compatibility
  headers?: Header, // response headers
  disable?: Disable;
  delay?: number;
  times?: number;
  status?: number; // http status code
}

export interface MockConfigData {
  [key: string]: MockItem
}
export interface RequestInfo {
  url: string;
  method: HttpVerb;
  query?: object; // url search query
  headers?: object; // request header
  header?: object; // request header
  body?: unknown; // post body
  rawBody?: unknown; // post body
  doOriginalCall?: () => Promise<OriginalResponse>; // can only be called once
}

export interface OriginalResponse {
  // if the original call is returned successfully, the following fields will be populated
  status: number | null; // http response status
  headers: Record<string, string | string[]>; // response headers
  responseText: string | null;
  responseJson: unknown | null;
  responseBuffer: ArrayBuffer | null;
  responseBlob: Blob | null;

  // if the original call throws an exception, the error field will be populated
  error: Error | null;
}

export interface RemoteResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>; // remote response headers
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
  header: Record<string, string>; // request header
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
  header: Record<string, string>,
  cookies: string[],
  profile: Record<string, unknown>,
}

export interface ClientRequestType extends http.ClientRequest{
  nativeInstance: null | http.ClientRequest;
  nativeReqestName: 'get' | 'request';
  nativeReqestMethod: Function;
  nativeRequestArgs: unknown[];

  response: http.IncomingMessage;
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
  getRequestHeaders: Function;
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
  headers: Record<string, string>;
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
