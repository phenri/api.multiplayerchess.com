"use strict";

var log4js = require('log4js'),
    logger = log4js.getLogger('core');

//log4js.addAppender(log4js.consoleAppender());
log4js.addAppender(log4js.fileAppender('logs.txt'), 'core');

module.exports = logger;




  
  

