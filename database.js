var mongoose = require('mongoose');
var connectionUrl = 'mongodb://localhost/scrape';
var db = null;
var productModel = null;

exports.configureAndConnect = (callback) => {
    mongoose.connect(connectionUrl);

    db = mongoose.connection;

    db.on('error', function(err) {
        console.error('Error connecting to Mongodb: ' + err);

        callback(err, null);
    });

    db.once('open', function() {
        console.log('Connected to ' + connectionUrl);

        var productSchema = mongoose.Schema({
            id: String,
            description: String,
            category: String,
            href: String,
            price: Number,
            sizes: Array,
            colors: Array,
            shop: String
        });    

        productModel = mongoose.model('Product', productSchema);

        callback(null, productModel);
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
        colors: product.colors
    }, {
        upsert: true
    }, function(err, raw) {
        if (err) {
            console.log('Error upserting product ' + product.id + ': ' + err);
            return;
        }

        console.log('Category: ' + product.category);
        console.log('Id: ' + product.id);
        console.log('Description: ' + product.description);
        console.log('Price: ' + product.price);
        console.log('Product href: ' + product.href);
        console.log('Sizes: ' + product.sizes);    
        console.log('Colors: ' + product.colors);
        console.log('Mongo result: ' + JSON.stringify(raw));
        console.log('-----------------------------------------------------------');
    });
};
