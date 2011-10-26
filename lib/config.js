"use strict";

var readFileSync = require("fs").readFileSync,
    logger = require('./logger');

function config(){
  try {
    var cfg;
    try {
      cfg = JSON.parse(readFileSync('./config.json'));
    } catch(_){
      cfg = JSON.parse(readFileSync('../config.json'));
    }
    try {
      cfg.manifest = JSON.parse(readFileSync('./package.json'));
    } catch(_){
      cfg.manifest = JSON.parse(readFileSync('../package.json'));
    }
    return cfg;
  } catch(error) {
    logger.fatal('Failed to parse config file.');
    throw error;
  }
};

function span(){
  var now = +(new Date),
      delay = 10000;
  return {
    'delay':delay,
    'start':now-delay,
    'end':now
  };
};

module.exports = config();
Object.defineProperty(module.exports, 'span', { 'get':span });





