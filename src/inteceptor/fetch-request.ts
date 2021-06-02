import { HTTPStatusCodes } from '../config';
import { FetchRequestInfo, MockMetaInfo } from '../types';
import Base from './base';

export default class FetchInterceptor extends Base{
  private fetch: any;

  constructor() {
    super();

    this.fetch = window.fetch.bind(window);
    this.mockData = {};
    this.intercept();
  }


  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * Intercept fetch object.
   */
  private intercept() {
    const me = this;
    window.fetch = function() {
      const args = [ ...(arguments as any) ];
      const [ url, params ] = args;
      const method = params && params.method ? params.method : 'GET';

      return new Promise((resolve, reject) => {
        const match:MockMetaInfo | null  = me.matchRequest(url, method);
        if (match) {
          const requestInfo = <FetchRequestInfo>{ url, ...params };
          me.doMockRequest(match, requestInfo, resolve);
        } else {
          me.fetch(...args).then(resolve).catch(reject);
        }
      });
    };
  }

  /**
   * Make mock request.
   * @param {MockMetaInfo} match
   * @param {FetchRequestInfo} requestInfo
   * @param {Function} resolve
   */
  private doMockRequest(match: MockMetaInfo, requestInfo: FetchRequestInfo, resolve: Function) {
    if (match.file) {
      import(`${process.env.HRM_MOCK_DIR}/${match.file}`).then((mock) => {
        const mockData = this.formatMockData(mock.default, match, requestInfo);
        this.doMockResponse(mockData, match, resolve);
      });
      return;
    }

    const mockData = this.formatMockData(match.data, match, requestInfo);
    this.doMockResponse(mockData, match, resolve);
  }

  /**
   * Make mock request.
   * @param {MockMetaInfo} match
   * @param {FetchRequestInfo} requestInfo
   * @param {Function} resolve
   */
  private doMockResponse(mockData: any, match: MockMetaInfo, resolve: Function) {
    if (match) {
      if (match.delay && match.delay > 0) {
        setTimeout(() => {
          resolve(mockData);
        }, +match.delay);
      } else {
        resolve(mockData);
      }
      return;
    }
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Response
   * Format mock data.
   * @param {any} mockData
   * @param {MockMetaInfo} match
   * @param {FetchRequestInfo} requestInfo
   */
  formatMockData(mockData: any, match: MockMetaInfo, requestInfo: FetchRequestInfo) {
    const data = typeof mockData === 'function' ? mockData(requestInfo) : mockData;

    const response = {
      // If you needed a ReadableStream boject, you could define it in your mock file.
      body: data,
      bodyUsed: false,
      headers: {
        ...match.header,
        'is-mock': 'yes'
      },
      ok: true,
      redirected: false,
      status: match.status,
      statusText: HTTPStatusCodes[match.status || 200] || '',
      url: requestInfo.url,
      type: 'basic', // cors
      // response data depends on prepared data
      json: async () => data,
      arrayBuffer: async () => data,
      blob: async () => data,
      formData: async () => data,
      text: async () => typeof data === 'string' ? data : JSON.stringify(data),
      // other methods that may be used
      clone: async () => response,
      error: async () => response,
      redirect: async () => response,
    };
    return response;
  }
}

