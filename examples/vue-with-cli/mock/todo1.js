/**
 * @url https://jsonplaceholder.typicode.com/todos/1
 * @method get
 */

let id = 0;
export default (requestInfo) => {
  console.log('mock request info:', requestInfo);
  return {
    "userId": "mock:" + Date.now(),
    "id": ++id,
    "title": "do something at some day",
    "completed": false
  };
}
