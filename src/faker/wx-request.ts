import { isArrayBuffer, str2arrayBuffer } from '../common/utils';
import fallback from './fallback';

export default function fakeWxRequest(wxReqOpts : any) {
  const { url, method, data, header, dataType, responseType, success, fail, complete } = wxReqOpts;

  const body = (data && (method + '').toUpperCase() !== 'GET') ? data : null;
  fallback(url, method, header, body).then((res: any) => {
    if (typeof success === 'function') {
      let data;
      if (dataType === 'json') {
        if (typeof res.body === 'object') {
          data = res.body;
        } else if (typeof res.body === 'string') {
          try {
            data = JSON.parse(res.body);
          } catch(e) {
            e.message = `res.body is not a json-like string: ${e.message}`
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
          ...res.headers,
        },
        cookies: [].concat((res.headers?.['set-cookie'] || []) as any),
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
    abort(){}
  }
}
