const promod = require('./indexPromod');
const zara = require('./indexZara');
const database = require('./database');
const selenium = require('./seleniumWrapper');

const baseUrlPromod = 'http://www.promod.it/donna/collezione/index.html';
const baseUrlZara = 'http://www.zara.com/it';

const maxProductsPerStore = process.argv.length > 2 ? parseInt(process.argv[2]) : null;

database.configureAndConnect((err, model) => {    
    if (err) {
        console.error('Error connecting to database: ' + err);
        return;
    }

    // first install selenium standalone driver 
    selenium.seleniumInstall((child) => {
        // run Promod store scraper
        zara.run(baseUrlZara, maxProductsPerStore)
            .then(() => { 
                // run Zara store scraper
                return promod.run(baseUrlPromod, maxProductsPerStore);
            })
            .then(() => {
                console.log('Finished all stores');
                // kill selenium server
                child.kill();
                // close connection to database
                database.finish();

                process.exit(1);
            });
    });
});