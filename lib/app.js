"use strict";

var express = require('express'),
    app = express.createServer(),
    logger = require('./logger'),
    errors = require('./errors'),
    config = require('./config'),
    players = require('./players'),
    auth = require('./auth'),
    game = require('./game');
 
logger.debug ('Creating HTTP server at %s:%d...',config.web.host,config.web.port);

function filterAuthKey(ownerKey, body){
  var id;
  for(id in body.auths){
    if(body.auths[id].key != ownerKey){
      delete body.auths[id].key;
    }
  }

  return body;
}

function put(req, res, error){
  res.contentType('application/json');
  res.put.version = config.manifest.version;
  res.put.ts = config.span.end;
  res.send(JSON.stringify(res.put));
}

app.configure(function(){
  app.use(express.methodOverride());
  app.use(function(req, res, next){
    req.headers['content-type'] = 'application/json';
    next();
  });
  app.use(express.bodyParser());
});

app.error(function(err, req, res){
  res.contentType('application/json');
  logger.error('Server catched an exception. Error Message: %s Code: %d', err.message, err.code, err.stack);
  res.send(JSON.stringify({ 'error':err.message, 'code':err.code }));
});

app.options('/', function(req, res){
  res.contentType('application/json');
  res.send({});
});

app.get('/', function(req, res, next){
  res.put = { 'http://api.multiplayerchess.com':'welcome!' };
  next();
}, put);

app.get('/players/online', function(req, res, next){
  players.online(function(err, players){
    if(err) return next(err);
    
    res.put = { 'online_players_count':players.length };
    next();
  });
}, put);

app.post('/auths/touch', function(req, res, next){
  auth.touch(req.body.auth, function(err, updated){
    if(err) return next(err);
    res.put = { 'ok':updated && true || false };
    next();
  });
}, put);

app.get('/games/available', function(req, res, next){
  game.available(function(err, docs){
    if(err) return next(err);
    res.put = { 'ok':true, 'games':docs };
    next();
  });
}, put);

app.post('/games/new', function(req, res, next){
  game.setup({ 'nickname':req.body.nickname, 'ip':req.connection.remoteAddress, 'private':req.body.private, 'black':req.body.black  }, function(err, doc){
    if(err) return next(err);
    res.put = { 'ok':true, 'game':doc };
    next();
  });
}, put);

app.post('/games/import', function(req, res, next){
  game.create({ 'pgn':req.body.pgn, 'ip':req.connection.remoteAddress }, function(err, doc){
    if(err) return next(err);
    game.get(doc.key, function(err, doc){
      if(err) return next(err);
      logger.info('%s imported a new game. Key: %s', req.connection.remoteAddress, doc.key);
      res.put = { 'ok':true, 'game':doc };
      next();
    });
  });
}, put);

app.all('/game/:key', function(req, res, next){
  var auth = req.body && req.body.auth;
  game.get(req.params.key, function(err, doc){
    if(err) return next(err);
    res.put = { 'ok':true, 'game':filterAuthKey(auth, doc) };
    next();
  });
}, put);

app.post('/game/:key/touch', function(req, res, next){
  var authKey = req.body.auth,
      gameKey = req.params.key;
  
  game.verifyAuth(gameKey, authKey, function(err, ok){
    if(err) return next(err);
    game.touch(gameKey, function(err, updated){
      if(err) return next(err);
      res.put = { 'ok':true };
      next();
    });
  });
}, put);

app.post('/game/:key/join', function(req, res, next){
  game.associateP2({ 'game':req.params.key, 'nickname':req.body.nickname, 'ip':req.connection.remoteAddress }, function(err, p2ao){
    if(err) return next(err);
    
    game.get(req.params.key, function(err, doc){
      if(err) return next(err);
      
      logger.info('%s{%s} joined the game#%s as p2', req.body.nickname, req.connection.remoteAddress, req.params.key);
      res.put = { 'ok':true, 'game':filterAuthKey(p2ao.key, doc) };
      next();      
    });
    
  });
}, put);

module.exports = app;
