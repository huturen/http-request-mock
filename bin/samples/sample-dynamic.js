
/**
 * @url https://some.api.com/dynamic
 * @header content-type: application/json
 * @method post
 */
export default (request) => {
  return  {
    ret: 0,
    msg: 'ok',
    url: request.url,
  };
}

