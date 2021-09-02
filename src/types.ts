import http from 'http';
import MockItem from './mocker/mock-item';

export enum Method {
  get = 'get',
  post = 'post',
  put = 'put',
  patch = 'patch',
  delete = 'delete',
  head = 'head',
  any = 'any'
};

export enum Disable {
  yes = 'yes',
  no = 'no',
};

export interface Query {
  [key: string]: string
};

export interface Header {
  [key: string]: string
};

// export interface MockItem {
//   url: RegExp | string;
//   regexp?: Array<string>; // ['abc.*xyz$', 'i'] => /abc.*xyz$/i
//   method?: Method;
//   header?: Header, // response header
//   delay?: number;
//   disable?: Disable;
//   times?: number;
//   response?: any; // response body
//   status?: number; // http status code
//   file?: string; // may be populated by webpack
//   bypass?: Function;
// };

export interface MockItemExt {
  header?: Header, // response header
  disable?: Disable;
  delay?: number;
  times?: number;
  status?: number; // http status code
};

export interface MockConfigData {
  [key: string]: MockItem
};
export interface RequestInfo {
  url: string;
  method: Method;
  query: object; // url search query
  headers?: object; // request header
  body?: any; // post body
}

export interface XMLHttpRequestInstance extends XMLHttpRequest {
  bypassMock: boolean;
  isMockRequest: string;
  mockItem: MockItem;
  mockResponse: any;
  requestInfo: RequestInfo;
  requestArgs: any[];
}

// https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
export interface WxRequestOpts {
  url: string;
  method?: Method | undefined;
  data?: any;
  header?: object; // request header
  success?: (info: any) => any;
  fail?: (info: any) => any;
  complete?: (info: any) => any;
};

export interface ClientRequestType extends http.ClientRequest{
  nativeInstance: null | http.ClientRequest;
  nativeReqestMethod: Function;
  nativeRequestArgs: any[];

  response: http.IncomingMessage;
  requestBody: Buffer;
  mockItemResolver: Function;


  url: string;
  options: { [key: string]: any };
  callback: ((...args: any[]) => any) | undefined;

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
