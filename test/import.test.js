import { expect } from '@jest/globals';
import axios from 'axios';
import path from 'path';
import HttpRequestMock from '../src/index';

const mocker = HttpRequestMock.setupForUnitTest('xhr');
process.env.HRM_MOCK_DIR = path.resolve(__dirname, './mock');

describe('dynamically import mock config file', () => {
  it('it should support to dynamically import mock config file for ordinary object', async () => {
    mocker.mock({ url: 'https://some.api.com/sample-ordinary', file: 'sample1.js' });

    const res = await axios({ url: 'https://some.api.com/sample-ordinary' });
    expect(res.data.ret).toBe(0);
    expect(res.data.data).toBe('ordinary-object-data');
  });

  it('it should support to dynamically import mock config file for function', async () => {
    mocker.mock({ url: 'https://some.api.com/sample-function', file: 'sample2.js' });

    const res = await axios({ url: 'https://some.api.com/sample-function' });
    expect(res.data.ret).toBe(0);
    expect(res.data.data).toBe('times: 1');

    const res2 = await axios({ url: 'https://some.api.com/sample-function' });
    expect(res2.data.ret).toBe(0);
    expect(res2.data.data).toBe('times: 2');
  });
});
