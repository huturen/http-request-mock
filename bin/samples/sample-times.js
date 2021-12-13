/**
 * @url https://jsonplaceholder.typicode.com/todos/1
 * @header content-type: application/json
 * @method any
 * @times 10
 */
/* eslint-disable */
const faker = require('http-request-mock/plugin/faker.js');
let times = 10;
module.exports = () => ({
  id: faker.incrementId(),
  name: faker.name(),
  address: faker.address(),
  current: times,
  left: --times,
  msg: 'This mock item will be disabled after 10 requests.',
})
