const logger = require('./logger').logger;
const jsdom = require("jsdom").jsdom;
const doc = jsdom();
const window = doc.defaultView;
const $ = require("jquery")(window);

const seleniumWrapper = require('./seleniumWrapper');
const database = require('./database');

const webdriverio = require('webdriverio');
const options = {
    desiredCapabilities: {
        browserName: 'phantomjs'
    }
};

exports.run = (baseUrl, {maxProducts, callback} = {}) => {
    const runner = webdriverio.remote(options);
    let starttime = null;
    let totalProducts = 0;

    // getProductDetails: load product url in the browser and get its details to aggregate to product information got from main page
    runner.addCommand('getProductDetails', function async (category, products) {
        let j = 0;
        const nextProduct = function() {
            if (j < products.length && (maxProducts ? totalProducts < maxProducts : true)) {
                // get next product to process
                var $product = $(products[j]);
                // increment next product reference
                j ++;
                totalProducts ++;

                // get product information and URL on product details
                const id = $product.attr('id').trim();
                const description = $('.name', $product).text().trim();
                const price = parseFloat($('.price', $product).text().replace(',', '.'));
                const productHref = 'http:' + $('.item', $product).attr('href').trim();

                // NB: image, sizes and colors are on page product detail

                // browse to the product page and get the product card containing remaining information
                return runner.url(productHref)
                    .getTitle().then(function(productTitle) {
                        logger.info('Product page title: ' + productTitle);
                    })
                    .pause(500)
                    .getHTML('.product-card').then(function (card) {
                        const $card = $(card);

                        // get image href
                        const imgHref = 'http:' + $('.image-wrap ._seoImg img._img-zoom', $card).attr('src').trim();

                        // get sizes
                        let sizes = [];
                        $('.size-name', $card).each(function() {
                            sizes.push($(this).text().trim());
                        });

                        // get colors
                        let colors = [];
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
                            imgHref: imgHref,
                            href: productHref,
                            sizes: sizes,
                            colors: colors
                        });
                    })
                    .catch(function(err) {
                        logger.info('Error: ' + err);
                    })
                    .then(function() {
                        logger.info('-----------------------------------------------------------');
                    })
                    .then(nextProduct);
            }   
        };

        return nextProduct();
    });

    // getProducts: get all products displayed in URLs passed as a parameter
    runner.addCommand('getProducts', function async (links) {
        let i = 0;

        const next = () => {
            if (i < links.length && (maxProducts ? totalProducts < maxProducts : true)) {
                // get the next link to process
                const $link = $( links[i] );

                // get the link name = category and the URL
                const linkName = $link.text().trim();
                const linkHref = $link.attr('href').trim();

                // increment next link reference
                i ++;

                // browse to the category page and get the list of products in the page
                return runner.url(linkHref)
                    .pause(200) // wait since prices are loaded in an AJAX call after the page is loaded
                    .getTitle().then(function (title) {
                        logger.info('Page title: ' + title + ' for category ' + linkName);
                    })
                    .getHTML('.product').then((products) => {
                        logger.info('Found ' + products.length + ' products of category ' + linkName + ' in ' + linkHref);

                        // now get product details
                        return runner.getProductDetails(linkName, products);

                    }).catch(function(err) {
                        logger.info('ERROR: ' + err + ' for link ' + linkHref);
                    })
                    .then(function() {
                        logger.info('Processed products for category ' + linkName);
                        logger.info('-----------------------------------------------------------');
                    })
                    .then(next);
            }
        };
        
        return next();
    });

    return runner.init()
        .url(baseUrl)
        .getTitle().then(function(title) {
            logger.info('Main ZARA page title: ' + title);
        })
        // get all links for 'DONNA' outfits         
        .getHTML('//LI[A="DONNA"]/UL/LI/A').then(function(links) {
            logger.info('Got ' + links.length + ' links');
            // now get products 
            return runner.getProducts(links);
        })
        .then(function() {
            logger.info('Processed all links for DONNA');
        })
        .end()
        .then(function() {
            callback ? callback() : null;
        });
};
