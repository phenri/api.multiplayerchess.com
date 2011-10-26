"use strict"

var db = require('./db'),
    config = require('./config'),
    key = require('./key'),
    logger = require('./logger'),
    assert = require('assert');

function construct(options, callback){
  var game = options.game,
      nickname = options.nickname,
      ip = options.ip;

  try {
    assert.equal(typeof game, 'string');
    assert.equal(typeof nickname, 'string');
    assert.ok(nickname.length >= 3);
    assert.equal(typeof ip, 'string');
    assert.ok(ip.length >= 7);

    callback(undefined, {
      'key':options.key || key(),
      'game':game,
      'nickname':nickname,
      'ip':ip,
      'ts':config.span.end
    });
  } catch(err){
    logger.error('Invalid auth options. Error Stack: ', err.stack);
    callback(new Error('Missing auth parameters.'));
  }

}

function coll(callback){
  db(function(err, cli){
    if(err) return callback(err);
    cli.collection('auths', callback);
  });
}

function create(options, callback){
  logger.debug('Creating new auth record. IP:%s Game: %d', options.ip, options.game);
  coll(function(err, records){
    construct(options, function(err, struct){
      if(err) return callback(err);
      records.insert(struct, function(err, docs){
        if(err){
          logger.fatal('failed to insert new auth record to db. error message:', error.message);
          callback(err);
        }
        
        logger.info('New auth record created successfully. IP: %s', options.ip);

        callback(undefined, docs[0]);

      });
    });
  });
}

function get(key, callback){
  logger.debug('Getting auth record with key#%s', key);
  coll(function(err, records){
    if(err){ 
      logger.error('Failed to get auth#%s', key);
      return callback(err);
    }
    records.findOne({ 'key':key }, function(err, rec){
      !err && !rec && ( err = new Error('Couldn\'t find any record matching with specified key "'+key+'"') );
      if(err){
        logger.error('Failed to find specified auth record with the key "%s"', key);
        return callback(err);
      }

      callback(null, rec);
    });
  });
}

function getById(id, callback){
  logger.debug('Getting auth record by id "%s"', id);
  coll(function(err, records){
    if(err){
      return callback(err);
    }

    records.findOne({ '_id':id }, function(err, rec){
      !err && !rec && ( err = new Error('Couldn\'t find any record matching with specified id "'+id+'"') );

      if(err){
        logger.error('Failed to find specified auth record with the key "%s"', key);
        return callback(err);
      }

      callback(null, rec);
    });
  });
}

function touch(key, callback){
  logger.debug('Touching auth#%s', key);

  if(typeof key != 'string' || key.length<1){
    return callback(new Error('Invalid Auth Key "'+key+'"'));
  }
  
  coll(function(err, records){
      if(err) return callback(err);
      records.update({ 'key':key }, { $set: { 'ts':config.span.end } }, { 'safe':true }, callback);
  });
}


module.exports = {
  'coll':coll,
  'create':create,
  'get':get,
  'getById':getById,
  'touch':touch
}
