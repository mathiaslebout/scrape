const winston = require('winston');
const config = require('./conf/config.json');

exports.logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console) ({ 
            level: 'debug' 
        }),
        new (winston.transports.File) ({
            filename: config.log.file,
            level: config.log.level
        })
    ]
});