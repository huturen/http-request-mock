/**
 * @url https://jsonplaceholder.typicode.com/todos/1
 * @header content-type: application/json
 * @method any
 * @times 10
 */
/* eslint-disable */
let times = 10;
module.exports = () => ({
  current: times,
  left: --times,
  msg: 'This mock item will be disabled after 10 requests.',
})
