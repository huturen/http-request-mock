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
export interface Query {
  [key: string]: string
}

export interface Header {
  [key: string]: string
}

export interface MockItemExt {
  header?: Header, // response header
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
  method: Method;
  query: object; // url search query
  headers?: object; // request header
  body?: unknown; // post body
}

export interface MixedRequestInfo {
  url: string;
  method: Method;
  query?: object; // url search query
  headers?: object; // request header
  header?: object; // request header
  body?: unknown; // post body
}

export interface XMLHttpRequestInstance extends XMLHttpRequest {
  bypassMock: boolean;
  isMockRequest: string;
  mockItem: MockItem;
  mockResponse: unknown;
  requestInfo: RequestInfo;
  // requestArgs: any[];
  requestArgs: (Method | string | boolean | null)[],
}

// https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
export interface WxRequestOpts {
  url: string;
  method: Method;
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
export interface ClientRequestType extends http.ClientRequest{
  nativeInstance: null | http.ClientRequest;
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


// types:
export type FetchRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Logs = Array<number | string | Record<string, any> | Logs[]>;
