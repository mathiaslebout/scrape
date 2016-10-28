const logger = require('./logger').logger;

const promod = require('./indexPromod');
const zara = require('./indexZara');
const mango = require('./indexMango');

const database = require('./database');
const selenium = require('./seleniumWrapper');

let stores = null;
let maxProductsPerStore = null;

if (process.argv.length > 2) {
    process.argv.forEach((argv) => {
        const elts = argv.split('=');
        if (elts.length == 2) {
            const eltName = elts[0];
            const eltVal = elts[1];

            switch (eltName) {
            case 'stores':
                stores = require(eltVal);
                break;

            case 'maxProducts':
                maxProductsPerStore = parseInt(eltVal);
                break;
            }
        }
    })
} 

const processStores = (stores = []) => {
    let i = 0;
    const next = () => {

        if (i < stores.length) {
            const store = stores[i];
            const name = store.name || 'undefined';
            const url = store.baseUrl;
            const maxProducts = store.maxProducts || maxProductsPerStore;
            const processor = store.processor;

            i ++;

            if (!url || !processor) {
                logger.error('Missing baseUrl or processor on store ' + name + '!');
                return next();

            } else {
                logger.info('Processing store ' + name + ' with base URL ' + url);
                logger.debug('Processor: ' + processor);
                logger.debug('Maximum products to be scraped: ' + maxProducts);
                const p = require(processor);
                if (!p || !p.run) {
                    logger.error('No processor found or missing "run" exported function on it!');
                    return next();
                }

                return p.run(url, {maxProducts}).then(next);
            }
        }
    }
    return next();
}

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

        processStores(stores)
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