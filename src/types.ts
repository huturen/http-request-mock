
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

export interface MockTpl {
  url: RegExp | string;
  regexp: Array<string>; // ['abc.*xyz$', 'i'] => /abc.*xyz$/i
  method?: Method;
  delay?: number;
  disable?: Disable;
  data?: any;
};
