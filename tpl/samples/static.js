/**
 * Please refer to https://github.com/huturen/http-request-mock for more at tags.
 *
 * @url https://some.api.com/static
 * @delay 100
 * @method get
 */
/* eslint-disable */
const faker = require("http-request-mock/plugin/faker.js");
module.exports = {
  ret: 0,
  msg: "ok",
  ip: faker.ip(),
  url: faker.url(),
  data: "The request will be resolved after 100 milliseconds.",
}
