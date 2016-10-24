const logger = require('./logger').logger;
const promod = require('./indexPromod');
const zara = require('./indexZara');
const database = require('./database');
const selenium = require('./seleniumWrapper');

const baseUrlPromod = 'http://www.promod.it/donna/collezione/index.html';
const baseUrlZara = 'http://www.zara.com/it';

const maxProductsPerStore = process.argv.length > 2 ? parseInt(process.argv[2]) : null;

database.configureAndConnect((err, model) => {    
    if (err) {
        logger.error('Error connecting to database: ' + err);
        // exit with code 0
        process.exit(0);
    }

    // first install selenium standalone driver 
    selenium.seleniumInstall((err, child) => {
        if (err) {
            logger.error('Error running selenium scraper: ' + err);
            // exit with code 0
            process.exit(0);
        }

        // run ZARA store scraper
        zara.run(baseUrlZara, {maxProducts: maxProductsPerStore})
            .then(() => { 
                // run PROMOD store scraper
                return promod.run(baseUrlPromod, {maxProducts: maxProductsPerStore} );
            })
            .then(() => {
                logger.info('Finished all stores');
                // kill selenium server
                child.kill();
                // close connection to database
                database.finish();

                process.exit(1);
            });
    });
});