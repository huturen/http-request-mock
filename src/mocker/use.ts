import fs from 'fs';
import path from 'path';
import { parseCommentTags } from '../../tool/lib/comment.js';
import { isImported } from '../common/utils';
import MockItem from './mock-item';
import Mocker from './mocker';

export default class Use {
  static init() {
    /**
    * Note: this method is only for a nodejs envrioment(test environment).
    * Use a mock file & add it to global mock data configuration.
    * @param {string} file
    */
    Mocker.prototype.use = function use(file: string) {
      let absoluteFile = file;
      if (!path.isAbsolute(file)) {
        const callerFile = Use.getCallerFile();
        if (!callerFile) {
          throw new Error('Expected "file" to be a absolute path.');
        }
        absoluteFile = path.resolve(callerFile, '..', file);
      }
      if (!fs.existsSync(absoluteFile)) {
        throw new Error(`${absoluteFile} does not exist.`);
      }
      const tags = parseCommentTags(absoluteFile) as unknown as Partial<MockItem>;
      // To avoid "Critical dependency: the request of a dependency is an expression" error
      tags.body = require(absoluteFile);
      tags.body = isImported(tags.body) ? (tags.body as {default: unknown}).default : tags.body;
      return this.mock(tags);
    };
  }

  static getCallerFile() {
    const oldPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack)  => stack;
    const stack = new Error().stack as unknown as Record<string, { getFileName: () => string }>;
    Error.prepareStackTrace = oldPrepareStackTrace;


    if (stack !== null && typeof stack === 'object') {
      for(let i = 0; i < 50; i++) {
        const file = stack[i] ? stack[i].getFileName() : undefined;
        const next = stack[i + 1] ? stack[i + 1].getFileName() : undefined;
        if (file !== next && file === __filename) {
          return next;
        }
      }
    }
  }
}
