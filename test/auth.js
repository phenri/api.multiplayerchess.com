var assert = require('assert'),
    vows = require('vows'),
    auth = require('../lib/auth'),
    config = require('../lib/config'),
    db = require('../lib/db');

config.db.name = 'chess_test';

var suite = vows.describe('auth');

suite.addBatch({
  'create':{
    'topic':{ 'game':'q22x', 'nickname':'FOO', 'ip':'1.1.1.1' },
    'with legal options':{
      'topic':function(options){
        auth.create(options, this.callback);
      },
      'should include a key field':function(err, ao){
        assert.ok(ao.key);
      },
      'should include game id':function(err, ao){
        assert.equal(ao.game, 'q22x');
      },
      'should include nickname':function(err, ao){
        assert.equal(ao.nickname, 'FOO');
      },
      'should include timestamp of last move':function(err, ao){
        assert.ok(ao.ts > config.span.end - 5000);
      },
      'should include ip address':function(err, ao){
        assert.equal(ao.ip, '1.1.1.1');
      }
    }
  }
});

suite.addBatch({
  'touch':{
    'topic':function(){
      var self = this;
      db(function(err, cli){
        cli.collection('auths', function(err, recs){
          recs.insert({ key:'a', 'game':1, 'nickname':'foo', 'ip':'1.1.1.1', 'ts':1 }, function(err, docs){
            self.callback(null, docs[0]);
          });
        });
      });
    },
    'to an existing auth':{
      'topic':function(ao){
        var self = this;
        auth.touch(ao.key, function(err){
          if(err) throw err;
          
          auth.get(ao.key, self.callback);
        });
      },
      'should update the ts field':function(err, ao){
        assert.ok(ao.ts > config.span.end - 5000);
      }
    },
    'to an unexisting auth':{
      'topic':function(ao){
        auth.touch('unexisting', this.callback);
      },
      'should pass 0 as the second argument':function(err, updated){
        assert.equal(err, undefined);
        assert.equal(updated, 0);
      }
    },
    'with an invalid key':{
      'topic':function(ao){
        auth.touch(undefined, this.callback);
      },
      'should throw invalid auth key error':function(err, updated){
        assert.equal(updated, undefined);
        assert.equal(err.message, 'Invalid Auth Key "undefined"');
      }
    }
  }
});

suite.run(undefined, function(results){
  db(function(err, cli){
    cli.close();
  });
});
