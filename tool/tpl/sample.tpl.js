/**
 * @url https://some.api.com/dynamic
 * @header content-type: application/json
 * @method get
 */
/* eslint-disable */
const faker = require("http-request-mock/plugin/faker.js");
module.exports = (request) => {
  return  {
    ret: 0,
    msg: "ok",
    name: faker.name(),
    email: faker.email(),
    phone: faker.phone("1-###-###-####"),
    url: request.url,
  };
}

