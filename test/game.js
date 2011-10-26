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

var suite = vows.describe('game');

var pgn = '[Event "F/S Return Match"]\n'
        + '[Site "Belgrade, Serbia Yugoslavia|JUG"]\n'
        + '[Date "1992.11.04"]\n'
        + '[Round "29"]\n'
        + '[White "Fischer, Robert J."]\n'
        + '[Black "Spassky, Boris V."]\n'
        + '[Result "1/2-1/2"]\n'
        + '\n'
        + '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 '
        + '6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8  10. d4 Nbd7 '
        + '11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5 '
        + 'Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6 '
        + '23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5 '
        + 'hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5 '
        + '35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6 '
        + 'Nf2 42. g4 Bd3 43. Re6 1/2-1/2';

suite.addBatch({
  'create':{
    'topic':{ 'auth':'foo' },
    'without passing pgn':{
      'topic':function(options){
        game.create(options, this.callback);
      },
      'should include a key field':function(err, go){
        assert.equal(typeof go.key, 'string');
      },
      'should include a ts field':function(err, go){
        assert.ok(go.ts > config.span.start);
      },
      'should include a legal pgn field':function(err, go){
        assert.equal(typeof go.pgn, 'string');
        var c = new chess.Chess;
        c.load_pgn(go.pgn);
        
        var h = c.header();
        assert.equal(h.Site, 'MultiplayerChess.com');
        assert.equal(h.Round, '1');
        assert.equal(h.Result, '*');
      },
      'should include player objects':function(err, go){
        assert.ok(!go.p2);
        assert.equal(typeof go.key, 'string');
        assert.equal(go.p1.white, true);
        assert.equal(go.p1.auth, 'foo');
      },
      'should include an end field':function(err, go){
        assert.equal(go.end, false);
      }
    },
    'by passing pgn of an ended game':{
      'topic':function(options){
        var options = { 'pgn':pgn };
        game.create(options, this.callback);
      },
      'should include a key field':function(err, go){
        assert.equal(typeof go.key, 'string');
      },
      'should be ended':function(err, go){
        assert.ok(go.end);
      },
      'should include no players':function(err, go){
        assert.ok(!go.p1);
        assert.ok(!go.p2);        
      }
    },
    'private game with black player':{
      'topic':function(options){
        game.create({ 'private':true, 'auth':'foo', 'black':true }, this.callback);
      },
      'should include a private field with true value':function(err, go){
        assert.equal(go.private, true);
      },
      'should p1 object include a black field with true value':function(err, go){
        assert.equal(go.p1.black, true);
      }
    }
  }
});

suite.addBatch({
  'get':{
    'a opponent seeking game':{
      'topic':function(){
        game.setup({ 'nickname':'foo', 'ip':'1.1.1.1' }, this.callback);
      },
      'should include regular game fields':function(err, doc){
        assert.ok(doc.key);
        assert.equal(doc.end, false);
        assert.equal(doc.private, false);
        assert.equal(doc.p1.white, true);
      },
      'should include an auth map':function(err, doc){
        assert.equal(doc.auths[doc.p1.auth].nickname, 'foo');
        assert.equal(doc.auths[doc.p1.auth].ip, '1.1.1.1');
        assert.ok(doc.auths[doc.p1.auth].ts > config.span.end - 5000);
      },
      'should provide a pgn field with right headers':function(err, doc){
        var c = new chess.Chess;
        c.load_pgn(doc.pgn);
        var headers = c.header();

        assert.equal(headers.White, 'foo');
        assert.equal(headers.Date, formatDate('yyyy.mm.dd'));
        assert.equal(headers.Result, '*');
        assert.equal(headers.Site, 'MultiplayerChess.com');
        assert.equal(headers.Round, '1');
      }
    },
    'a started game':{
    },
    'an ended game':{},
    'a imported game':{
      'topic':function(){
        game.create({ 'pgn':pgn }, this.callback);
      },
      'should provide right pgn headers':function(err, doc){
        var c = new chess.Chess;
        c.load_pgn(doc.pgn);
        var headers = c.header();

        assert.equal(headers.Event, 'F/S Return Match');
        assert.equal(headers.Date, '1992.11.04');
        assert.equal(headers.Result, '1/2-1/2');
        assert.equal(headers.Site, 'Belgrade, Serbia Yugoslavia|JUG');
        assert.equal(headers.Round, '29');
      },
      'should provide right move history':function(err, doc){
        var c = new chess.Chess;
        c.load_pgn(doc.pgn);
        
        var history = c.history();
        assert.equal(history.length, 85);
      },
      'should be ended':function(err, doc){
        var c = new chess.Chess;
        c.load_pgn(doc.pgn);
        assert.ok(doc.end);
      },
      'should contain no auth map':function(err, doc){
        var c = new chess.Chess;
        c.load_pgn(doc.pgn);
        assert.equal(typeof doc.auths, 'undefined');        
      }
    }
  }
});

suite.addBatch({
  'join':{
    'topic':function(){
      game.setup({ 'nickname':'foo', 'ip':'1.1.1.1' },this.callback);
    },
    'an available game':{
      'topic':function(go){
        var self = this;
        game.associateP2({ 'game':go.key, 'nickname':'bar', 'ip':'1.1.1.2' }, function(err, ok){
          game.get(go.key, self.callback);
        });
      },
      'should include a p2 field':function(go){
        assert.equal(go.p2.black, true);
        assert.equal(go.p2.white, false);
        assert.equal(go.auths[go.p2.auth].nickname, 'bar');
        assert.equal(go.auths[go.p2.auth].ip, '1.1.1.2');
      }
    }
  }
});

suite.addBatch({
  'touch':{
    'topic':function(){
      game.create({ 'nickname':'foo', 'ts':0, 'ip':'1.1.1.1', 'auth':'bar' }, this.callback);
    },
    'a not ended game':{
      'topic':function(go){
        var self = this;
        assert.equal(go.ts, 0);
        game.touch(go.key, function(err, ok){
          game.find(go.key, self.callback);
        });
      },
      'should have an updated ts field':function(err, doc){
        assert.ok(doc.ts > config.span.start);
      }
    }
  },
  'an ended game':{
    'topic':function(){
      // TODO
    }
  }
});

suite.addBatch({
  'verifyAuth':{
    'topic':function(){
      // TODO
    }
  }
});

db(function(_,cli){
  suite.run(undefined, function(results){
    cli.close();
  });
});
