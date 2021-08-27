
import { expect } from '@jest/globals';
import Bypass from '../src/common/bypass';
import { isArrayBuffer, str2arrayBuffer } from '../src/common/utils';


describe('test utils', () => {
  it('str2arrayBuffer method should convert a string to ArrayBuffer', async () => {
    const buf = str2arrayBuffer('abc');
    expect(isArrayBuffer(buf)).toBe(true);

    global.TextEncoder = function(){
      return { encode: () => new Int8Array() };
    };
    const buf2 = str2arrayBuffer('abc');
    expect(isArrayBuffer(buf2)).toBe(true);
  });

  it('isArrayBuffer method should support Int32Array, Int16Array and Int8Array', async () => {
    expect(isArrayBuffer(new Int32Array())).toBe(true);
    expect(isArrayBuffer(new Int16Array())).toBe(true);
    expect(isArrayBuffer(new Int8Array())).toBe(true);
    expect(isArrayBuffer([1,2,3,4,5,6])).toBe(false);
  });

  it('class Bypass should support to be instanced', async () => {
    const instance = new Bypass;
    expect(instance instanceof Bypass).toBe(true);
    expect(instance.flag).toBe('yes');
  });
});
