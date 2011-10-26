var assert = require('assert'),
    vows = require('vows'),
    chess = require('chess'),
    dateformat = require('dateformat'),
    auth = require('../lib/auth'),
    game = require('../lib/game'),
    config = require('../lib/config'),
    db = require('../lib/db'),
    formatDate = require('dateformat');

config.db.name = 'chess_test';

var suite = vows.describe('available');

db(function(_,cli){
  suite.run(undefined, function(results){
    cli.close();
  });
});
