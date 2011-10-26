var mongodb = require('mongodb'),
    config = require('./config'),
    logger = require('./logger');

var server = new mongodb.Server(config.db.host, config.db.port, {}),
    db = new mongodb.Db(config.db.name, server);

var LOCK = 0;

module.exports = (function genClient(){
  var conn = undefined;
  return function client(callback){
    logger.debug('DB Connection has been requested. Lock:', LOCK);

    if(conn != undefined){ 
      logger.debug('MongoDB connection is already open. Returning stored client...');
      return callback(undefined, conn);
    } else if(LOCK>0){
      logger.warn('There is already pending connection to mongodb://%s:%d started %d microseconds ago.', config.db.host, config.db.port, config.span.end - LOCK);
      callback(new Error('Failed to provide DB connection.'));
    }

    LOCK = config.span.end;

    logger.debug('Connecting to mongodb://%s:%d', config.db.host, config.db.port);
    db.open(function(err, client){
      if(err){
        logger.fatal('Failed to establish connection to mongodb://%s:%d. Error Message: %s', config.db.host, config.db.port);
        return callback(err);
      }
      
      logger.info('DB Connection established to mongodb://%s:%d/%s', config.db.host, config.db.port, config.db.name);
      conn = client;

      LOCK = 0;
      callback(undefined, conn);
    });
  }
})();
