/* eslint-disable */
import HttpRequestMock from "__hrm_index_entry__";
let mocker;

/* __hrf_env_if__ */if (process.env.__hrm_environment_key__ === "__hrm_environment_val__") {
  mocker = HttpRequestMock.setup(__hrm_proxy_server__);

  __hrm_mock_items__
/* __hrf_env_if__ */}

export default mocker;
/* eslint-enable */
