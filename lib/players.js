var db = require('./db'),
    config = require('./config'),
    logger = require('./logger'),
    app = require('./app');

function online(callback){
  db(function(err, client){
    if(err) return callback(err);
    client.collection('auths', function(err, players){
      if(err) return callback(err);
      players.find({ 'ts':{ '$gte':config.span.start } }).toArray(callback);
    });
  });
}

module.exports = {
  'online':online
};
