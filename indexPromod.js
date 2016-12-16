// required for jQuery (needs a window)
const logger = require('./logger').logger;
const jsdom = require("jsdom").jsdom;
const doc = jsdom();
const window = doc.defaultView;
const $ = require("jquery")(window);
const prominentColors = require('./prominentColors')

const seleniumWrapper = require('./seleniumWrapper')
const database = require('./database')

// webdriverio wiil run on phantomjs headless browser
const webdriverio = require('webdriverio')
const options = {
    desiredCapabilities: {
        browserName: 'phantomjs'
    }
};

exports.run = (baseUrl, {maxProducts, callback} = {} ) => {
    const runner = webdriverio.remote(options);
    const starttime = null;

    logger.info('Promod scraper started on URL ' + baseUrl);

    runner.addCommand('getProductDetails', function async (products) {
        let i = 0;
        const next = () => {
            if (i < maxProducts) {
                const $product = $( products[i] );

                const id = $('.search_product', $product).attr('id').trim();
                //const description = $('.descrip', $product).contents().first().text().trim();
                const description = $('.descrip a', $product).text().trim();
                const price =  parseFloat($('.current', $product).last().text().trim());
                const sizes = $('.tooltip_listetaille', $product).last().text().trim().split(' ');
                const productHref = $('.colorisdispo a', $product).first().attr('href').trim();
                // const imgHref = $('.visuel img', $product).attr('src').trim();

                i ++;

                return runner.url(productHref)
                    .getTitle().then(function (title) {
                        logger.info(title);
                    })
                    .getHTML('#global').then(function (card) {
                        const $card = $(card);

                        const imgHref = $('.img_produit', $card).attr('src').trim()

                        const name = $('#titre .item', $card).text().trim();
                        // const category = name.split(' ')[0];
                        let category = null;
                        
                        const navigation = $('#ariane_navig a', $card);
                        if (navigation.length >= 2) {
                            category = $(navigation[navigation.length - 2]).text().trim();
                        }

                        const currentColor = $('#description [itemprop="color"]', $card).text().trim();     

                        let colors = [ currentColor ];
                        $('#couleurs img', $card).each(function() {
                            const colorWithName = $(this).attr('alt').trim();
                            colors.push( colorWithName.substring(name.length).trim() );
                        });

                        // get the filtered prominent colors for the given image
                        // prominent colors are the most vibrant colors filtered by image border dominant colors
                        prominentColors.getProminentColors(imgHref, (err, palette) => {
                            if (err) {
                                logger.error(err)

                            } else {
                                database.update('Promod', {
                                    id,
                                    description,
                                    category,
                                    href: productHref,
                                    price,
                                    sizes,
                                    colors,
                                    imgHref,
                                    palette
                                });
                            }
                        })
                    })
                    .then(next);

            } else {

            }
            
        };
        return next();
    });

    runner.addCommand('getProducts', function async (maxProducts, pause, retryMax) {
        let tmpProducts = 0;
        let res = null;
        let retry = 0;
        function next() {
            if (tmpProducts < maxProducts 
                    && retry <= retryMax) {
                // scroll to the footer
                return runner.scroll('footer.clear')
                    // then wait for loading
                    .pause(pause)
                    // the  check the total number of products loaded on the page
                    .getHTML('.bloc_produit').then(function (elts) {
                    // .elements('.bloc_produit').then(function(elts) {
                    //    res = elts.value;
                        res = elts;
                        if (res.length == tmpProducts) {
                            retry ++;
                        } else {
                            retry = 0;
                        }
                        tmpProducts = res.length;
                        logger.info(`Found ${tmpProducts} on page, retry = ${retry}`)
                    })
                    .then(next);

            } else {
                // return the final array of products found
                return res;
            }
        };

        // start the loop        
        return next();
    });

    // return webdriverio promise
    return runner.init()
        .url(baseUrl)
        .getText('#nb_resultat')
        .then((res) => {
            logger.info(res);
            const nbProducts = parseInt(res);

            // compute the maximum number of prpducts to extract from the store
            maxProducts = maxProducts || nbProducts;

            return runner.getProducts(maxProducts, 500, 10)
                .then(function(products) {
                    logger.info('done, found ' + products.length);

                    return runner.getProductDetails(products);

                }, function(err) {
                    logger.info('error: ' + err);
                });
        })
        .end()
        .then(function() {
            //child.kill();
            callback ? callback() : null;
        });
};
