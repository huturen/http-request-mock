
import { expect } from '@jest/globals';
import Bypass from '../src/common/bypass';
import {
  currentDate,
  currentDatetime,
  currentTime,
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
});
