
/**
 * @url https://jsonplaceholder.typicode.com/todos/1
 * @header content-type: application/json
 * @method any
 * @times 100
 */
/* eslint-disable */
let times = 100;
export default () => ({
  current: times,
  left: --times,
  msg: 'This mock item will be disabled after 100 requests.',
})
