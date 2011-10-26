This is the source code of api.multiplayerchess.com. Please feel free to
contribute, to file bugs or feature requests at the issue tracker.

First Steps
===========

```bash
$ git clone https://github.com/azer/api.multiplayerchess.com.git
$ cd api.multiplayerchess.com
$ npm install
$ node lib/start.js
```

Development
===========
api.multiplayerchess.com is under development right now. Below is the short reference of the API I'm working on:

```
 DONE players/online
 DONE auths/touch @auth
 TODO auth/:id
 DONE games/available
 DONE games/new @nickname @private @black
 DONE games/import @pgn
 DONE games/:id @auth
 DONE game/:id/join @auth
 DONE game/:id/touch @auth
 TODO game/:id/listen/opponent
 TODO game/:id/listen/update
 TODO game/:id/move @move
 TODO game/:id/resign @auth
 TODO game/:id/offer/draw @auth
 TODO game/:id/offer/takeback @auth
 TODO game/:id/offer/newround @auth
 TODO game/:id/message @auth
```

License
=======
★ WTF Public License (http://en.wikipedia.org/wiki/WTFPL)
