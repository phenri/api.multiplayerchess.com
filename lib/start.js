var app = require('./app'),
    logger = require('./logger'),
    config = require('./config');

app.listen(config.web.port, config.web.host);

logger.info('Started web server at %s:%d', config.web.host, config.web.port);
