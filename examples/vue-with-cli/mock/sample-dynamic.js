
/**
 * @url https://some.api.com/dynamic
 * @header content-type: application/jsonx
 * @method post
 */
/* eslint-disable */
module.exports = (request) => {
  return  {
    ret: 0,
    msg: 'ok',
    url: request.url,
  };
}

