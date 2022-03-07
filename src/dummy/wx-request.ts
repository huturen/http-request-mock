import { IncomingMessage } from 'http';
import { isArrayBuffer, str2arrayBuffer } from '../common/utils';
import { WxRequestOpts } from '../types';
import fallback from './fallback';

export default function dummyWxRequest(wxReqOpts : WxRequestOpts) {
  const { url, method, data, header, dataType, responseType, success, fail, complete } = wxReqOpts;

  const body = (data && (method + '').toUpperCase() !== 'GET') ? data : null;
  fallback(url, method as string, header, body).then((res: {body: string, response: IncomingMessage}) => {
    if (typeof success === 'function') {
      let data;
      if (dataType === 'json') {
        if (typeof res.body === 'object') {
          data = res.body;
        } else if (typeof res.body === 'string') {
          try {
            data = JSON.parse(res.body);
          } catch(e) {
            (e as Error).message = 'res.body is not a json-like string.';
            throw e;
          }
        }
      }
      else if (responseType === 'text') {
        data = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
      } else if (responseType === 'arraybuffer') {
        data = isArrayBuffer(res.body)
          ? res.body
          : str2arrayBuffer(typeof res.body === 'string' ? res.body : JSON.stringify(res.body));
      }

      success({
        data,
        statusCode: res.response.statusCode,
        header: {
          ...res.response.headers,
        },
        cookies: res.response.headers?.['set-cookie'] || [],
        profile: {},
      });
    }

    if (typeof complete === 'function') {
      complete();
    }
  }).catch(err => {
    if (typeof fail === 'function') {
      fail(err);
    }
    if (typeof complete === 'function') {
      complete();
    }
  });

  return {
    abort(){
      // `abort` method is not supported in a fake enviroment.'
    }
  };
}
