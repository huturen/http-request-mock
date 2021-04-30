
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

export interface MockMetaInfo {
  url: RegExp | string;
  regexp?: Array<string>; // ['abc.*xyz$', 'i'] => /abc.*xyz$/i
  method?: Method;
  header?: object,
  delay?: number;
  disable?: Disable;
  data?: any;
  status?: number; // http status code
  file?: string;
};

// https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
export interface WxRequestInfo {
  url: string;
  data?: any;
  method?: Method | undefined;
  header?: object;
  success?: (info: any) => any;
  fail?: (info: any) => any;
  complete?: (info: any) => any;
};

