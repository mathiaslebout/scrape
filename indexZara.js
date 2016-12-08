const logger = require('./logger').logger;
const jsdom = require("jsdom").jsdom;
document = jsdom();
tracking = {}
window = document.defaultView
navigator = window.navigator 
const $ = require("jquery")(window);
const vibrant = require('./vibrant')
// const tr = require('tracking')
const tinycolor = require('tinycolor2')

const seleniumWrapper = require('./seleniumWrapper');
const database = require('./database');

const webdriverio = require('webdriverio');
const options = {
    desiredCapabilities: {
        browserName: 'phantomjs'
    }
};

// registerColor = (name, rgbColor) => { 
//     tracking.ColorTracker.registerColor(name, (r, g, b) => {
//         if (((r - 10 <= rgbColor.r) && (rgbColor.r <= r + 10)) 
//             && ((g - 10 <= rgbColor.g) && (rgbColor.g <= g + 10)) 
//             && ((b - 10 <= rgbColor.b) && (rgbColor.b <= b + 10))) {
//             return true;
//         }
//         return false;
//     });
// }

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

                let cat = category

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

                        vibrant.getSwatches(imgHref, (res, palette) => {
                            if (!res) {
                                const regularVibrantRgb = tinycolor( palette.regularVibrant ).toRgb()

                                // registerColor(palette.regularVibrant, regularVibrantRgb)

                                // const colors = new tracking.ColorTracker([palette.regularVibrant]);
                                // colors.on('track', function(event) {
                                //     if (event.data.length === 0) {
                                //         // No colors were detected in this frame.
                                //     } else {
                                //         event.data.forEach(function(rect) {
                                //             // rect.x, rect.y, rect.height, rect.width, rect.color
                                //             // window.plot(rect.x, rect.y, rect.width, rect.height, rect.color);
                                //         });
                                //     }
                                // });

                                // const $img = $(`<img src='${imgHref}' style='width:800px; height:800px;'/>`)

                                // tracking.track($img[0], colors);        

                                database.update('Zara', {
                                    id,
                                    category,
                                    description,
                                    price,
                                    imgHref,
                                    href: productHref,
                                    sizes,
                                    colors,
                                    palette
                                })

                            } else logger.error(res)
                        })
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
                let linkHref = $link.attr('href').trim();

                // check if missing leading 'http'
                linkHref && !linkHref.startsWith('http') ? linkHref = 'http:' + linkHref : null

                // increment next link reference
                i ++;

                if (linkName != 'NUOVI ARRIVI') { 

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

                } else return next()
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
