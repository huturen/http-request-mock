
/**
 * @url https://jsonplaceholder.typicode.com/todos/1
 * @header content-type: application/json
 * @method any
 * @times 3
 */
/* eslint-disable */
let times = 3;
export default () => ({
  msg: 'This mock item will be disabled after 3 requests.',
  left: --times
})
