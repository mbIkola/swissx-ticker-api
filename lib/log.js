const debug = require('debug');
var log = debug('swissx-ticker-api:server:info');
log.error = debug('swissx-ticker-api:server:error');
log.debug =  debug('swissx-ticker-api:server:debug');
log.warn =  debug('swissx-ticker-api:server:warn');
log.info = log;

module.exports = log;
