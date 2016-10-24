const logger = require('./logger').logger;
const selenium = require('selenium-standalone');

exports.seleniumInstall = (callback) => {
    selenium.install({
            // check for more recent versions of selenium here:
            // https://selenium-release.storage.googleapis.com/index.html
            version: '2.53.1',
            baseURL: 'https://selenium-release.storage.googleapis.com',
            drivers: {
                phantomjs: {
                    baseURL: 'https://selenium-release.storage.googleapis.com/'
                }
            },
            logger: (message) => {
                logger.info('selenium: ' + message);
            },
            // progressCb: function(totalLength, progressLength, chunkLength) {

            // }
        }, (err) => {
            if (err) {
                logger.error('Error installing selenium standalone driver: ' + err);
                callback ? callback(err) : null;
                return false;
            }

            seleniumStart(callback);
        }
    );
}

const seleniumStart = (callback) => {
    selenium.start({
        drivers: {
                phantomjs: {
                    baseURL: 'https://selenium-release.storage.googleapis.com/'
                }
            },
        }, 
        (err, child) => {
            if (err) {
                logger.error(err);
                callback ? callback(err, null) : null;
                return false;
            }

            callback ? callback(null, child) : null;
        }
    );
};
