import { Query } from '../types';
/**
 * Get query parameters from the specified request url.
 * @param {string} reqUrl
 */
export function getQuery(reqUrl: string) : Query{
  return /\?/.test(reqUrl)
    ? reqUrl
      .replace(/.*?\?/g, '') // no protocol, domain and path
      .replace(/#.*$/g, '') // no hash tag
      .split('&')
      .reduce((res : Query, item: string) => {
        const [k,v] = item.split('=');
        res[k] = (v || '').trim();
        return res;
      }, {})
    : {};
}

/**
 * Check whether or not this specified obj is an object.
 * @param {any} obj
 */
export function isObject(obj: any) {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

/**
 * Try to convert an object like string to an object.
 * @param {any} body
 */
export function tryToParseObject(body: any) {
  if (typeof body === 'string'  && body[0] === '{' && body[body.length-1] === '}') {
    try {
      return JSON.parse(body);
    } catch(e) {
      return body;
    }
  } else {
    return body;
  }
}
