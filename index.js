const promod = require('./indexPromod');
const zara = require('./indexZara');
const database = require('./database');
const selenium = require('./seleniumWrapper');

database.configureAndConnect((err, model) => {    
    if (err) {
        console.error('Error connecting to database: ' + err);
        return;
    }

    selenium.seleniumInstall((child) => {
        promod.run()
            .then(zara.run)
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