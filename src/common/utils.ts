
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
 * Check whether or not the specified obj is an object.
 * @param {unknown} obj
 */
export function isObject(obj: unknown) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * Try to convert an object like string to an object.
 * @param {unknown} body
 */
export function tryToParseObject(body: unknown) {
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

/**
 * Sleep the specified number of milliseconds.
 * @param {number} ms
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert string to arraybuffer.
 * @param {string} str
 */
export function str2arrayBuffer(str: string) {
  if (typeof TextEncoder === 'function') {
    return new TextEncoder().encode(str);
  }

  const buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  const bufView = new Uint16Array(buf);
  for (let i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Whether or not the specified data is arraybuffer.
 * @param {unknown} data
 */
export function isArrayBuffer(data: unknown) {
  if (typeof ArrayBuffer === 'function' && data instanceof ArrayBuffer) {
    return true;
  }
  if (typeof Int32Array === 'function' && (data instanceof Int32Array)) {
    return true;
  }
  if (typeof Int16Array === 'function' && (data instanceof Int16Array)) {
    return true;
  }
  if (typeof Int8Array === 'function' && (data instanceof Int8Array)) {
    return true;
  }
  return false;
}

/**
 * Get current date.
 */
export function currentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const two = (num: number) => num < 10 ? `0${num}` : `${num}`;

  return `${two(year)}-${two(month)}-${two(date)}`;
}

/**
 * Get current time.
 */
export function currentTime() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const two = (num: number) => num < 10 ? `0${num}` : `${num}`;

  return `${two(hour)}:${two(minute)}:${two(second)}`;
}

/**
 * Get current datetime.
 */
export function currentDatetime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();

  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const two = (num: number) => num < 10 ? `0${num}` : `${num}`;

  return `${two(year)}-${two(month)}-${two(date)} ${two(hour)}:${two(minute)}:${two(second)}`;
}

/**
 * Check current envrioment: nodejs or not.
 * Note: arrow function is required.
 */
export function isNodejs() {
  return (typeof process !== 'undefined')
    && (Object.prototype.toString.call(process) === '[object process]')
    && (!!(process.versions && process.versions.node));
}
