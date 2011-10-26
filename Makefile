setup:
	npm install

list:
	@./node_modules/forever/bin/forever list

restart:
	@$(MAKE) stop
	@$(MAKE) start

stop:
	@./node_modules/forever/bin/forever stop 0

start:
	@./node_modules/forever/bin/forever start lib/start.js
