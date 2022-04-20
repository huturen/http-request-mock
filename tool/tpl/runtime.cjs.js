/* eslint-disable */
let mocker;

/* __hrf_env_if__ */if (process.env.__hrm_environment_key__ === "__hrm_environment_val__") {
  const HttpRequestMock = require("__hrm_index_entry__");
  mocker = HttpRequestMock.setup(__hrm_proxy_server__);
  __hrm_mock_items__
/* __hrf_env_if__ */}

module.exports = mocker;
/* eslint-enable */
