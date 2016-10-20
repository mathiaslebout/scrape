var jsdom = require("jsdom").jsdom;
var doc = jsdom();
var window = doc.defaultView;

var seleniumWrapper = require('./seleniumWrapper');
var database = require('./database');

var $ = require("jquery")(window);

var webdriverio = require('webdriverio');
var options = {
    desiredCapabilities: {
        browserName: 'phantomjs'
    }
};

var webdriverRun = function(callback, child) {
    var runner = webdriverio.remote(options);
    var starttime = null;
    // var nbProducts = 0;

    // getProductDetails: load product url in the browser and get its details to aggregate to product information got from main page
    runner.addCommand('getProductDetails', function async (category, products) {
        var j = 0;
        var nextProduct = function() {
            // if (j < products.length) {
            if (j < 10) {
                // get next product to process
                var $product = $(products[j]);
                // increment next product reference
                j ++;

                // get product information and URL on product details
                var id = $product.attr('id').trim();
                var description = $('.name', $product).text().trim();
                var price = parseFloat($('.price', $product).text().replace(',', '.'));
                var productHref = 'http:' + $('.item', $product).attr('href').trim();

                // NB: sizes and colors are on page product detail

                // browse to the product page and get the product card containing remaining information
                return runner.url(productHref)
                    .getTitle().then(function(productTitle) {
                        console.log('Product page title: ' + productTitle);
                    })
                    .getHTML('.product-card').then(function (card) {
                        var $card = $(card);

                        // get sizes
                        var sizes = [];
                        $('.size-name', $card).each(function() {
                            sizes.push($(this).text().trim());
                        });

                        // get colors
                        var colors = [];
                        $('.color-description', $card).each(function() {
                            colors.push($(this).text().trim());
                        });
                        if (colors.length == 0) {
                            colors.push($('._colorName', $card).text().trim());
                        }

                        database.update('Zara', {
                            id: id,
                            category: category,
                            description: description,
                            price: price,
                            href: productHref,
                            sizes: sizes,
                            colors: colors
                        });
                    })
                    .catch(function(err) {
                        console.log('Error: ' + err);
                    })
                    .then(function() {
                        console.log('-----------------------------------------------------------');
                    })
                    .then(nextProduct);
            }   
        };

        return nextProduct();
    });

    // getProducts: get all products displayed in URLs passed as a parameter
    runner.addCommand('getProducts', function async (links) {
        var i = 0;

        var next = function() {
            // if (i < links.length) {
            if (i < 1) {
                // get the next link to process
                var $link = $( links[i] );

                // get the link name = category and the URL
                var linkName = $link.text().trim();
                var linkHref = $link.attr('href').trim();

                // increment next link reference
                i ++;

                // browse to the category page and get the list of products in the page
                return runner.url(linkHref)
                    .pause(200) // wait since prices are loaded in an AJAX call after the page is loaded
                    .getTitle().then(function (title) {
                        console.log('Page title: ' + title + ' for category ' + linkName);
                    })
                    .getHTML('.product').then(function(products) {
                        console.log('Found ' + products.length + ' products of category ' + linkName + ' in ' + linkHref);

                        // now get product details
                        return runner.getProductDetails(linkName, products);

                    }).catch(function(err) {
                        console.log('ERROR: ' + err + ' for link ' + linkHref);
                    })
                    .then(function() {
                        console.log('Processed products for category ' + linkName);
                        console.log('-----------------------------------------------------------');
                    })
                    .then(next);
            }
        };
        
        return next();
    });

    return runner.init()
        .url('http://www.zara.com/it')
        .getTitle().then(function(title) {
            console.log('Main ZARA page title: ' + title);
        })
        // get all links for 'DONNA' outfits         
        .getHTML('//LI[A="DONNA"]/UL/LI/A').then(function(links) {
            console.log('Got ' + links.length + ' links');
            // now get products 
            return runner.getProducts(links);
        })
        .then(function() {
            console.log('Processed all links for DONNA');
        })
        .end()
        .then(function() {
            //child.kill();
            callback ? callback() : null;
        });
};

exports.run = () => {
    return webdriverRun();
};
