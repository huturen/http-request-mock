export default class FakeXMLHttpRequest{
  'http-request-mock': true; // make a flag to distinguish

  open() {}
  send() {}
  setRequestHeader() {}
  onreadystatechange() {}
  load() {}
  loadend() {}
  getAllResponseHeaders() {}
  getResponseHeader() {}

  get readyState() {
    return 4;
  }

  get status() {
    return 200;
  }

  get statusText() {
    return '';
  }

  get response() {
    return '';
  }

  get responseText() {
    return '';
  }

  get responseURL() {
    return '';
  }

  get responseXML() {
    return '';
  }
};
