const logger = require('./logger').logger;
const mongoose = require('mongoose');
const connectionUrl = 'mongodb://localhost/scrape';

let db = null;
let productModel = null;

exports.configureAndConnect = (callback) => {
    logger.info('database: Configuring and connecting to ' + connectionUrl);

    // create Mongoose connection
    mongoose.connect(connectionUrl);
    db = mongoose.connection;

    db.on('error', (err) => {
        logger.error('database: Error connecting to Mongodb: ' + err);

        callback ? callback(err, null) : null;
    });

    db.once('open', () => {
        logger.info('database: Connected to ' + connectionUrl);

        // create schemas
        var productSchema = mongoose.Schema({
            id: String,             // unique identifier in the shop
            description: String,    // short description of the product
            category: String,       // product category
            href: String,           // product details page reference
            price: Number,          // price (in euro)
            sizes: Array,           // array of (available) sizes
            colors: Array,          // array of (available) colors
            shop: String,           // name of the shop (id + shop) is unique identifer
            updateTs: Number,       // last update timestamp
        });    

        // create models from schemas
        productModel = mongoose.model('Product', productSchema);

        // end of 
        callback ? callback(null, productModel) : null;
    });
};

exports.finish = () => {
    db.close();
};

exports.update = (shop, product) => {
    productModel.update({
        id: product.id
    }, {
        id: product.id,
        shop: shop,
        description: product.description,
        category: product.category,
        href: product.href,
        price: product.price,
        sizes: product.sizes,
        colors: product.colors,
        updateTs: Date.now()
    }, {
        upsert: true
    }, function(err, raw) {
        if (err) {
            logger.info('database: Error upserting product ' + product.id + ': ' + err);
            return;
        }

        logger.info('Category: ' + product.category);
        logger.info('Id: ' + product.id);
        logger.info('Description: ' + product.description);
        logger.info('Price: ' + product.price);
        logger.info('Product href: ' + product.href);
        logger.info('Sizes: ' + product.sizes);    
        logger.info('Colors: ' + product.colors);
        logger.info('Mongo result: ' + JSON.stringify(raw));
        logger.info('-----------------------------------------------------------');
    });
};
