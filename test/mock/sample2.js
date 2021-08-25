/**
 * @url https://some.api.com/sample-function
 * @method any
 */
let times = 0;
module.exports = () => {
  times = times + 1;

  return  {
    ret: 0,
    msg: 'should support to export function which could do some dynamic logic',
    data: 'times: ' + times,
  };
}

