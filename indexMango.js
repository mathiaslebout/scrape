// required for jQuery (needs a window)
const logger = require('./logger').logger;
const jsdom = require("jsdom").jsdom;
const doc = jsdom();
const window = doc.defaultView;
const $ = require("jquery")(window);

const seleniumWrapper = require('./seleniumWrapper');
const database = require('./database');

// webdriverio wiil run on phantomjs headless browser
const webdriverio = require('webdriverio');
const options = {
    desiredCapabilities: {
        browserName: 'phantomjs'
    }
};

const mergeProducts = (currentList = [], newList = []) => {
    let res = currentList;

    const currentMap = currentList.map((p) => {
        return $(p).attr('id').trim();
    });

    newList.forEach((p) => {
        const pId = $(p).attr('id').trim();

        if (currentMap.indexOf(pId) == -1) {
            res.push(p);
        } 
    });

    return res;
};

exports.run = (baseUrl, {maxProducts, callback} = {} ) => {
    const runner = webdriverio.remote(options);
    let starttime = null;
    let totalProducts = 0;
    let productsList = [];

    logger.info('Mango scraper started on URL ' + baseUrl);

    runner.addCommand('getAllProducts', (firstProducts, retryMax, maxProducts) => {        
        let res = firstProducts;
        let i = 0;
        let retry = 0;

        let productId = $(firstProducts[firstProducts.length - 1]).attr('id').trim();

        const next = () => {
            if (retry <= retryMax && (maxProducts ? res.length <= maxProducts : true)) {
                return runner
                    .scroll('//DIV[@id="' + productId + '"]')
                    .pause(500)
                    .getHTML('.productListItem')
                    .then((products) => {
                        let lastProductId = $(products[products.length - 1]).attr('id').trim();
                        // check if the last product changed
                        if (lastProductId == productId) {
                            // same product, might be at the end of the page
                            retry ++;

                        } else {
                            // TODO: merge new products with previous ones 
                            res = mergeProducts(res, products);
                            productId = lastProductId;
                            retry = 0;
                        }

                    })
                    .catch((err) => {
                        logger.error(err);
                    })
                    .then(next)
                
            } else {
                return res;
            }
        };

        return next();
    });

    // getProducts: get all products displayed in URLs passed as a parameter
    runner.addCommand('getProducts', (links) => {
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

                if (linkHref != baseUrl) {
                    // browse to the category page and get the list of products in the page
                    return runner.url(linkHref)
                        .pause(1000) // wait since prices are loaded in an AJAX call after the page is loaded
                        .getTitle().then((title) => {
                            logger.info('Page title: ' + title + ' for category ' + linkName);
                        })
                        .getHTML('.productListItem').then((p) => {
                            // NB: need to scroll down the page and store 
                            return runner.getAllProducts(p, 2, maxProducts)
                                .then((products) => {
                                    logger.info('Found ' + products.length + ' products of category ' + linkName + ' in ' + linkHref);

                                    return runner.getProductDetails(linkName, products);
                                });
                        })
                        .catch((err) => {
                            logger.info('ERROR: ' + err + ' for link ' + linkHref);
                        })
                        .then(() => {
                            logger.info('Processed products for category ' + linkName);
                            logger.info('-----------------------------------------------------------');
                        })
                        .then(next);

                } else {
                    return next();
                }

            } else {
                return productsList;
            }
        };
        
        return next();
    });

    runner.addCommand('getProductDetails', function async (category, products) {
        var j = 0;
        var nextProduct = function() {
            if (j < products.length && (maxProducts ? totalProducts < maxProducts : true)) {
                // get next product to process
                const $p = $(products[j]);
                // increment next product reference
                j ++;
                totalProducts ++;

                // get product information and URL on product details
                const id = $p.attr('id').trim();
                const description = $('.productList__name', $p).text().trim();
                const price = parseFloat($('.productList__price', $p).text().split(' ')[1].replace(',', '.'));
                const productHref = $('.productListLink', $p).attr('href').trim();

                // NB: sizes and colors are on page product detail

                // browse to the product page and get the product card containing remaining information
                return runner.url(productHref)
                    .getTitle().then((productTitle) => {
                        logger.info('Product page title: ' + productTitle);
                    })
                    .getHTML('.datos_ficha_producto').then((card) => {
                        var $card = $(card);

                        // get sizes
                        var sizes = [];
                        $('.selecciona_tu_talla option[name=true]', $card).each(function() {
                            const size = $(this).text();
                            if (size) {
                                sizes.push(size.trim());
                            }
                        });

                        // get colors
                        var colors = [];
                        $('.productColors__img', $card).each(function() {
                            const color = $(this).attr('title');
                            if (color) {
                                colors.push(color.trim());
                            }
                        });

                        database.update('Mango', {
                            id: id,
                            category: category,
                            description: description,
                            price: price,
                            href: productHref,
                            sizes: sizes,
                            colors: colors
                        });
                    })
                    .catch((err) => {
                        logger.info('Error: ' + err);
                    })
                    .then(() => {
                        logger.info('-----------------------------------------------------------');
                    })
                    .then(nextProduct);
            }   
        };

        return nextProduct();
    });    

    // return webdriverio promise
    return runner.init()
        .url(baseUrl)
        .getTitle().then((title) => {
            logger.debug('Mango base URL page title: ' +  title);
        })
        // get all links for 'DONNA' main category
        .getHTML('//A[@data-ga-action="mujer"]').then((links) => {
            logger.info('Got ' + links.length + ' links');

            return runner.getProducts(links);
        })
        .catch((err) => {
            logger.error(err);
        })
        .end()
        .then(function() {
            //child.kill();
            callback ? callback() : null;
        });    
};