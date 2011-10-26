var b62encode = require('base62').encode;

module.exports = function(encode){
  return b62encode(parseInt(Math.floor(Math.random()*999999999999)));
}
