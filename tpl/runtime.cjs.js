/* eslint-disable */
let mocker;

/* __hrf_env_if__ */if (process.env.__hrm_enviroment_key__ === '__hrm_enviroment_val__') {
  const HttpRequestMock = require('http-request-mock');
  mocker = HttpRequestMock.setup(__hrm_proxy_server__);
  __hrm_mock_items__
/* __hrf_env_if__ */}

module.exports = mocker;
/* eslint-enable */
