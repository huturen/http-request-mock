import http from 'http';

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

export interface MockItemInfo {
  url: RegExp | string;
  regexp?: Array<string>; // ['abc.*xyz$', 'i'] => /abc.*xyz$/i
  method?: Method;
  header?: Header, // response header
  delay?: number;
  disable?: Disable;
  times?: number;
  response?: any; // response body
  status?: number; // http status code
  file?: string; // may be populated by webpack
};

export interface MockItemExt {
  header?: Header, // response header
  disable?: Disable;
  delay?: number;
  times?: number;
  status?: number; // http status code
};

export interface MockConfigData {
  [key: string]: MockItemInfo
};
export interface RequestInfo {
  url: string;
  method: Method;
  query: object; // url search query
  headers?: object; // request header
  body?: any; // post body
}

export interface XMLHttpRequestInstance extends XMLHttpRequest {
  isMockRequest: boolean;
  mockRequestInfo: MockItemInfo
  xhrRequestInfo: RequestInfo
  mockResponse: any,
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
  response: http.IncomingMessage;
  requestBody: Buffer;
  mockItemResolver: Promise<MockItemInfo>;

  url: string;
  options: { [key: string]: any };
  callback: ((...args: any[]) => any) | undefined;

  init: Function;
  setMockItemResolver: Function;
  sendError: Function;
  getEndArguments: Function;
  getRequestHeaders: Function;
  bufferToString: Function;
}
