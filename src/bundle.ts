import Index from './index';

// only for browser
(function() {
  // @ts-ignore
  window.HttpRequestMock = window.HttpRequestMock || Index
})();
