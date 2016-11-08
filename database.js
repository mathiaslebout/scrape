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
            imgHref: String,        // product image reference
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
    logger.debug('database: Closed database connection');
};

exports.update = (shop = null, product = {}) => {
    logger.info('database: Upserting product ' + product.id + ' for shop ' + shop);
    productModel.update({
        id: product.id
    }, {
        id: product.id,
        shop: shop,
        description: product.description,
        category: product.category,
        href: product.href,
        imgHref: product.imgHref,
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

        logger.info('database: Category: ' + product.category);
        logger.info('database: Id: ' + product.id);
        logger.info('database: Description: ' + product.description);
        logger.info('database: Price: ' + product.price);
        logger.info('database: Product href: ' + product.href);
        logger.info('database: Image href: ' + product.imgHref);
        logger.info('database: Sizes: ' + product.sizes);    
        logger.info('database: Colors: ' + product.colors);
        logger.info('database: Mongo result: ' + JSON.stringify(raw));
        logger.info('database: -----------------------------------------------------------');
    });
};
