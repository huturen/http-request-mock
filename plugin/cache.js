/**
 * Set the specified mockData into localeStorage cache when it changes.
 * @param {string} cacheKey
 * @param {object | array} mockData
 */
module.exports = function cacheWrapper(cacheKey, mockData) {
  const isObjOrArr = (obj) => {
    return {}.toString.call(obj) === '[object Object]' || {}.toString.call(obj) === '[object Array]';
  };

  if (!cacheKey || typeof cacheKey !== 'string') {
    throw new Error('http-request-mock cacheWrapper: The [cacheKey] must be a non-empty string.');
  }
  if (!isObjOrArr(mockData)) {
    throw new Error('http-request-mock cacheWrapper: The [mockData] must be an object or array.');
  }

  if (typeof Proxy !== 'function' || typeof Reflect !== 'object') {
    return mockData;
  }

  const wrap = (obj, handler) => {
    return isObjOrArr(obj) ? new Proxy(obj, handler) : obj;
  };

  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => localStorage.setItem(cacheKey, JSON.stringify(mockData)), 150);
  };

  const handler = {
    get(target, key, receiver) {
      return wrap(Reflect.get(target, key, receiver), handler);
    },
    set(target, key, value, receiver) {
      const res = Reflect.set(target, key, wrap(value, handler), receiver);
      save();
      return res;
    },
    deleteProperty(target, key) {
      const res = Reflect.deleteProperty(target, key);
      save();
      return res;
    },
  };

  const isCached = cacheKey in localStorage;

  return wrap(isCached ? JSON.parse(localStorage.getItem(cacheKey)) : mockData, handler);
}
