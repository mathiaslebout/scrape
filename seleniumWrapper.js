var selenium = require('selenium-standalone');

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
            logger: function(message) {
                console.log('selenium: ' + message);
            },
            progressCb: function(totalLength, progressLength, chunkLength) {

            }
        }, function(err) {
            if (err) return false;
            seleniumStart(callback);
        }
    );
}

var seleniumStart = (callback) => {
    selenium.start({
        drivers: {
                phantomjs: {
                    baseURL: 'https://selenium-release.storage.googleapis.com/'
                }
            },
            logger: function(message) {
                console.log(message);
            }
        }, 
        
        function(err, child) {
            if (err) return false;

            callback(child);
        }
    );
};
