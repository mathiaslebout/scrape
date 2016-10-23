// required for jQuery (needs a window)
var jsdom = require("jsdom").jsdom;
var doc = jsdom();
var window = doc.defaultView;
var $ = require("jquery")(window);

var seleniumWrapper = require('./seleniumWrapper');
var database = require('./database');

// webdriverio wiil run on phantomjs headless browser
var webdriverio = require('webdriverio');
var options = {
    desiredCapabilities: {
        browserName: 'phantomjs'
    }
};

exports.run = (baseUrl, maxProducts, callback) => {
    var runner = webdriverio.remote(options);
    var starttime = null;

    console.log('Promod scraper started on URL ' + baseUrl);

    runner.addCommand('getProductDetails', function async (products) {
        var i = 0;
        function next() {
            if (i < maxProducts) {
                var $product = $( products[i] );

                var id = $('.search_product', $product).attr('id').trim();
                var description = $('.descrip', $product).contents().first().text().trim();
                var price =  parseFloat($('.current', $product).last().text().trim());
                var sizes = $('.tooltip_listetaille', $product).last().text().trim().split(' ');
                var productHref = $('.colorisdispo a', $product).first().attr('href').trim();

                i ++;

                return runner.url(productHref)
                    .getTitle().then(function (title) {
                        console.log(title);
                    })
                    .getHTML('.fiche_produit').then(function (card) {
                        var $card = $(card);

                        var name = $('#titre .item', $card).text().trim();
                        var category = name.split(' ')[0];

                        var currentColor = $('#description [itemprop="color"]', $card).text().trim();     

                        var colors = [ currentColor ];
                        $('#couleurs img', $card).each(function() {
                            var colorWithName = $(this).attr('alt').trim();
                            colors.push( colorWithName.substring(name.length).trim() );
                        });

                        database.update('Promod', {
                            id: id,
                            description: description,
                            category: category,
                            href: productHref,
                            price: price,
                            sizes: sizes,
                            colors: colors
                        });

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
                return runner.scroll('footer')
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
                        console.log('Found ' + tmpProducts + ' on page, retry = ' + retry);
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
            console.log(res);
            const nbProducts = parseInt(res);

            // compute the maximum number of prpducts to extract from the store
            maxProducts = maxProducts || nbProducts;

            return runner.getProducts(maxProducts, 500, 10)
                .then(function(products) {
                    console.log('done, found ' + products.length);

                    return runner.getProductDetails(products);

                }, function(err) {
                    console.log('error: ' + err);
                });
        })
        .end()
        .then(function() {
            //child.kill();
            callback ? callback() : null;
        });
};
