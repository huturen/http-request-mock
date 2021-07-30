/* eslint-disable */
import HttpRequestMock from 'http-request-mock';
HttpRequestMock.setup().setMockData(process.env.HRM_MOCK_DATA || {});
/* eslint-enable */
