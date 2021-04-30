/* eslint-disable */
// import HttpRequestMock from 'http-request-mock';
import HttpRequestMock from '/Users/hu/web/xhr-response-mock-github/dist/index.js';
HttpRequestMock.setup().setMockData(process.env.HRM_MOCK_DATA || {});
/* eslint-enable */
