
export enum Method {
  get = 'get',
  post = 'post',
  put = 'put',
  patch = 'patch',
  delete = 'delete',
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
  response?: any; // response body
  status?: number; // http status code
  file?: string; // to be populated by webpack
};

export interface MockConfigData {
  [key: string]: MockItemInfo
};

// https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
export interface WxRequestInfo {
  url: string;
  data?: any;
  method?: Method | undefined;
  query?: object; // not wx.requests standard, just for response function
  header?: object; // request header
  success?: (info: any) => any;
  fail?: (info: any) => any;
  complete?: (info: any) => any;
};

// https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest
// https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/open
export interface XhrRequestInfo {
  url: string;
  method?: Method | undefined;
  async?: boolean;
  user?: string;
  password?: string;
  query?: object; // not XHR standard, just for response function
  header?: object; // request header
  body?: any; // not XHR standard, for post request
};

export interface XMLHttpRequestInstance extends XMLHttpRequest {
  isMockRequest: boolean;
  mockRequestInfo: MockItemInfo
  xhrRequestInfo: XhrRequestInfo
  mockResponse: any,
}


// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
export interface FetchRequestInfo {
  url: string;
  method?: Method | undefined;
  mode?: string;
  cache?: string;
  credentials?: string;
  query?: object; // not fetch standard, just for response function
  headers?: object; // request header
  redirect?: string;
  referrer?: string;
  integrity?: string;
  keepalive?: boolean;
  signal?: any;
  referrerPolicy?: string;
  body?: any;
};
