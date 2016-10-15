var jsdom = require("jsdom").jsdom;
var doc = jsdom();
var window = doc.defaultView;

var $ = require("jquery")(window);

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/scrape');

var productModel = null;

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    var productSchema = mongoose.Schema({
        id: String,
        description: String,
        price: Number,
        sizes: Array,
        shop: String
    });    

    productModel = mongoose.model('Product', productSchema);
});

var webdriverio = require('webdriverio');
var options = {
    desiredCapabilities: {
        browserName: 'phantomjs'
    }
};

var runner = webdriverio.remote(options);
var starttime = null;
// var nbProducts = 0;

runner.addCommand('getProducts', function async (maxProducts, pause, retryMax) {
    var tmpProducts = 0;
    var res = null;
    var retry = 0;
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

runner.init()
    .url('http://www.promod.it/donna/collezione/index.html')
    .getText('#nb_resultat').then(function(res) {
        console.log(res);
        var maxProducts = parseInt(res);
        return runner.getProducts(100, 500, 10)
            .then(function(products) {
                console.log('done, found ' + products.length);

                var promises = [];

                products.forEach(function (product) {
                    var $product = $(product);

                    var id = $('.search_product', $product).attr('id').trim();
                    var description = $('.descrip', $product).contents().first().text().trim();
                    var price =  parseFloat($('.current', $product).last().text().trim());
                    var sizes = $('.tooltip_listetaille', $product).last().text().trim().split(' ');

                    console.log('Id: ' + id);
                    console.log('Description: ' + description);
                    console.log('Price: ' + price);
                    console.log('Sizes: ' + sizes);    
                    console.log('-----------------------------------------------------------');

                    productModel.update({
                        id: id
                    }, {
                        id: id,
                        shop: 'Promod',
                        description: description,
                        price: price,
                        sizes: sizes
                    }, {
                        upsert: true
                    }, function(err, raw) {
                        if (err) {
                            console.log('Error upserting product ' + id + ': ' + err);
                            return;
                        }

                        console.log(raw);
                    })

                    // productModel.findOne({'id': id}, function(err, p) {
                    //     if (err) {
                    //         console.log('Error getting product ' + id + ': ' + err);
                    //         return;
                    //     }

                    //     if (p) {
                    //         console.log('Existing product ' + id + ', updating...');
                    //     }

                    //     var pm = new productModel({
                    //         id: id,
                    //         shop: 'Promod',
                    //         description: description,
                    //         price: price,
                    //         sizes: sizes
                    //     });

                    //     pm.save(function(err, p) {
                    //         if (err) {
                    //             console.log('Error saving product: ' + id);
                    //             return;
                    //         }
                    //         console.log('Saved new product: ' + id);
                    //     });

                    // });


                    // promises.push(
                    //     runner
                    //         .elementIdElement(product.ELEMENT, '.descrip')
                    //         .getText().then(function(description) {
                    //             console.log(description);
                    //         })
                    // );
                    // promises.push(
                    //     runner.elementIdElement(product.ELEMENT, '.tooltip_produit').then(function(elt) {
                    //         runner.moveTo(elt.value.ELEMENT)
                    //             .getText().then(function(tooltip) {
                    //                 console.log(tooltip);
                    //         })
                    //     })
                    // );
                    // console.log(t);
                });

                // return promises.all();

            }, function(err) {
                console.log('error: ' + err);
            });
    })
    .end();

    // .call(function() {
    //     starttime = new Date().getTime();
    // })
    // .scroll('footer')
    // .pause(500)
    // .call(function() {
    //     var endtime = new Date().getTime();
    //     console.log(endtime - starttime);
    // })
    // .getHTML('.bloc_produit').then(function(products) {
    //     console.log(products.length)
    // })
    // .getHTML('.facette_item a div').then(function (text) {
    //     console.log(text);
    // })
    // .elements('//DIV[H3="Collezione"]/UL/LI').then(function (elts) {
    //     console.log(elts);
    //     elts.value.forEach(function(elem) {
    //         runner.elementIdElement(elem.ELEMENT, 'a').then(function(res) {
    //             console.log(res);
    //             // runner.elementIdClick(res.value.ELEMENT).then(function(res) {
    //             //     console.log(res);
    //             // })
    //         })            
    //     })
    // })
    // .getHTML('//DIV[H3="Collezione"]/UL/LI').then(function(text) {
    //     console.log(text);
    // })
    // .getTitle().then(function(title) {
    //     console.log('Title was: ' + title);
    // })
    // .getSource().then(function(source) {
    //     console.log(source);
    // })
    // .getHTML('.bloc_produit').then(function(html) {
    //     console.log(html);
    // })
    // .getHTML('body', function(err, html) {
    //     console.log(html);
    // })    
    // .url('http://shop.mango.com/IT/donna/nuovo')
    // .getTitle().then(function(title) {
    //     console.log(title);
    // })
    // .getHTML('.productListItem').then(function(html) {
    //     console.log(html);
    // })
    // .url('http://www.zara.com/it/it/donna/cappotti/visualizza-tutto-c733882.html')
    // .getHTML('.product').then(function(html) {
    //     console.log(html);
    // })
    // .end();

