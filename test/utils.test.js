
import { expect } from '@jest/globals';
import Bypass from '../src/common/bypass';
import {
  currentDate,
  currentDatetime,
  currentTime,
  get,
  isArrayBuffer,
  isNodejs,
  str2arrayBuffer
} from '../src/common/utils';


describe('test utils', () => {
  it('str2arrayBuffer method should convert a string to ArrayBuffer', () => {
    const buf = str2arrayBuffer('abc');
    expect(isArrayBuffer(buf)).toBe(true);

    global.TextEncoder = function(){
      return { encode: () => new Int8Array() };
    };
    const buf2 = str2arrayBuffer('abc');
    expect(isArrayBuffer(buf2)).toBe(true);
  });

  it('isArrayBuffer method should support Int32Array, Int16Array and Int8Array', () => {
    expect(isArrayBuffer(new Int32Array())).toBe(true);
    expect(isArrayBuffer(new Int16Array())).toBe(true);
    expect(isArrayBuffer(new Int8Array())).toBe(true);
    expect(isArrayBuffer([1,2,3,4,5,6])).toBe(false);
  });

  it('class Bypass should support to be instanced', () => {
    const instance = new Bypass;
    expect(instance instanceof Bypass).toBe(true);
    expect(instance.flag).toBe('yes');
  });

  it('currentDate method should return a date-like string', () => {
    expect(/^\d{4}-\d\d-\d\d$/.test(currentDate())).toBe(true);
  });

  it('currentTime method should return a time-like string', () => {
    expect(/^\d\d:\d\d:\d\d$/.test(currentTime())).toBe(true);
  });

  it('currentDatetime method should return a datetime-like string', () => {
    expect(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(currentDatetime())).toBe(true);
  });

  it('isNodejs method should return true', () => {
    expect(isNodejs()).toBe(true);
  });

  it('[get] method should behave the same as lodash.get', () => {
    const data = {
      user: {
        name: 'Alice',
        address: {
          city: 'Wonderland',
          zipcode: '12345'
        },
        friends: [
          { name: 'Bob' },
          { name: 'Charlie' }
        ]
      }
    };
    expect(get(data, 'user.name')).toBe('Alice');
    expect(get(data, 'user.address.city')).toBe('Wonderland');
    expect(get(data, 'user.address.zipcode')).toBe('12345');
    expect(get(data, 'user.age', 30)).toBe(30);
    expect(get(data, 'user.address.country', 'Unknown')).toBe('Unknown');
    expect(get(data, 'user.friends[0].name')).toBe('Bob');
    expect(get(data, 'user.friends[1].name')).toBe('Charlie');
    expect(get(data, 'user.friends[2].name', 'Unknown')).toBe('Unknown');
  });
});
