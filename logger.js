const winston = require('winston');

exports.logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console) ({ 
            level: 'debug' 
        }),
        new (winston.transports.File) ({
            filename: 'scraper.log',
            level: 'info'
        })
    ]
});