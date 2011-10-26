"use strict"

function error(code, msg){
  return function(){
    var e = new Error(msg);
    e.code = code;
    return e;
  };
}

module.exports = {
  'error':error,
  '404':error(404, 'Unrecognized API call.')
};
