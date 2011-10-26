"use strict"

var db = require('./db'),
    config = require('./config'),
    key = require('./key'),
    logger = require('./logger'),
    assert = require('assert'),
    Chess = require('chess.js').Chess,
    compose = require('functools').compose,
    formatDate = require('dateformat'),
    auth = require('./auth');

function available(callback){
  logger.trace('Getting available games...');
  coll(function(err, records){
    if(err) return callback(err);
    records.find({ 'ts':{ $gte:config.span.start }, 'p2':{ '$exists':false } }).toArray(function(err, docs){
      callback(err, docs);
    });
  });
}

function associateP2(options, callback){
  find(options.game, function(err, go){
    !err && !go && ( err = new Error('Failed to find the game with passed key. Key: '+ options.game) );
    !err && ( go.end || go.p2 != undefined ) && ( err = new Error('Specified game has already two players.') );

    if(err) return callback(err);

    auth.create({ 'game':options.game, 'nickname':options.nickname, 'ip':options.ip  }, function(err, p2ao){
      if(err){
        return callback(err);
      }

      logger.info('Created new auth record for the p2 field of game#%s. Ip:%s Nickname: %s', options.game, options.ip, options.nickname);

      coll(function(err, records){
        if(err) return callback(err);

        records.update({ 'key':options.game }, { $set: { 'p2':{ 'auth':p2ao._id, 'black':go.p1.white, 'white':!go.p1.white } } }, { 'safe':true }, function(err, updated){
          !updated && !err && ( err = new Error('Failed to insert new player to game#'+ go.key) );
          if(err){
            logger.fatal('Failed to associate Player2(auth#%s) with game#%s. Error message: %', p2ao.key, go.key, err.message);
            return callback(err);
          }

          logger.info('Associated Player2(auth#%s) with game#%s successfully.', p2ao.key, go.key);
          
          callback(undefined, p2ao);
        });
      });
      
    });
  });
}

function construct(options, callback){
  logger.trace('Constructing new game record.');

  var c, name,
      obj = {
        'ts':config.debug && options.hasOwnProperty('ts') ? options.ts : config.span.end,
        'key':options.key || key(),
        'private':options.private && true || false
      };

  try {
    if(options.hasOwnProperty('pgn')) {
      assert.equal(typeof options.pgn, 'string');
      obj.pgn = options.pgn;
      obj.end = true;
    } else {
      options.black!=undefined && assert.equal(typeof options.black, 'boolean');

      c = new(Chess);

      c.header('Site', 'MultiplayerChess.com');
      c.header('Date', formatDate('yyyy.mm.dd'));
      c.header('Round', '1');
      c.header('Result', '*');

      if(options.headers){
        for(name in options.headers){
          c.header(name, options.headers[name]);
        }
      }


      obj.p1 = { 'auth':options.auth, 'black':options.black, 'white':!options.black };
      obj.pgn = c.pgn();
      obj.end = false;
    }

    callback(null, obj);

  } catch(err){
    logger.error('Invalid game options. Error Stack: ', err.stack);
    callback(new Error('Missing game parameters.'));
  }

}

function coll(callback){
  db(function(err, cli){
    if(err) return callback(err);
    cli.collection('games', callback);
  });
}

function create(options, callback){
  logger.debug('Creating a new game record. Auth: %s', options.auth);
  coll(function(err, records){
    if(err) return callback(err);
    construct(options, function(err, struct){
      records.insert(struct, function(err, docs){
        if(err){
          logger.fatal('Failed to insert new record to the collection "games". Error message: %s', err.message);
          return callback(err);
        }

        logger.info('New game record created successfully. Auth: %s', options.auth);

        callback(undefined, docs[0]);
      });
    });
  });
}

function find(key, callback){
  logger.trace('Finding game record by key. Key:"', key);
  
  coll(function(err, records){
    if(err){
      return callback(err);
    }

    records.findOne({ 'key':key }, function(err, doc){
      !err && !doc && ( err = new Error('Couldn\'t find any matching record with the specified key "'+key+'"') );
      if(err){
        logger.error('Failed to find specified game record. Given Key: %s. Error Stack: %s', key, err.stack);
        return callback(err);
      }
      
      callback(null, doc);
    });
  });
}

function get(key, callback){
  logger.trace('Getting game document by key. Key:"', key);
  compose.async(find, mergeAuthObject('p1'), mergeAuthObject('p2'))(key, callback);
}


function move(){}

function listenForUpdate(){}

function listenForOpponent(){}


function mergeAuthObject(name){
  return function(doc, callback){
    if(doc.hasOwnProperty(name)){
      auth.getById(doc[name].auth, function(err, ao){
        if(err){
          logger.error('Error getting auth object. Key: ', doc[name].auth);
          return callback(err);
        }

        !doc.auths && ( doc.auths = {} );
        doc.auths[ao._id] = ao;

        callback(null, doc);
      });
    } else {
      callback(null, doc);
    }
  }
}

function setup(options, callback){
  logger.trace('Setting up new game...');
  var gameKey = key();
  auth.create({ 'game':gameKey, nickname:options.nickname, ip:options.ip }, function(err, ao){
    if(err) return callback(err);
    !options.headers && ( options.headers = {} );
    options.headers[options.black && 'Black' || 'White'] = options.nickname;

    create({ 'key':gameKey, 'auth':ao._id, 'private':options.private, 'black':options.black, 'headers':options.headers }, function(err, rec){
      if(err) throw err;
      logger.info('Setup a new game. IP: %s Nickname: %s Private? %s', options.ip, options.nickname, options.private);
      get(rec.key, callback);
    });
  });
}

function touch(key, callback){
  logger.trace('Touching game record. Key:%s', key);
  update(key, { 'ts':config.span.end }, callback);
}

function update(key, set, callback){
  logger.trace('Updating game record. Key:%s', key);
  coll(function(err, records){
    if(err){
      return callback(err);
    }

    records.update({ 'key':key }, { $set: set }, { 'safe':true }, callback);
  });
}

function verifyAuth(gameKey, authKey, callback){
  logger.trace('Verify game and auth pair. Game: %s Auth: %s', gameKey, authKey);
  auth.get(authKey, function(err, authObj){
    !err && authObj.game != gameKey && ( err = new Error('Passed auth key doesn\'t have privilege of updating specified document.') );
    callback(err, !err);
  });
}

module.exports = {
  'associateP2':associateP2,
  'available':available,
  'construct':construct,
  'coll':coll,
  'create':create,
  'find':find,
  'get':get,
  'move':move,
  'listenForUpdate':listenForUpdate,
  'listenForOpponent':listenForOpponent,
  'setup':setup,
  'touch':touch,
  'update':update,
  'verifyAuth':verifyAuth
}
