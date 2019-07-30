var express = require('express');
var router = express.Router();
//var request = require('request');
var request = require('cached-request')(require('request'));
var concat = require('concat-stream');
// var log = require('../lib/log');

const GanjaRates = 'PREMIUM,BIOMASS,ISO999,H20-SOL,DISTIL,CRUDe'.split(',').map(name => ({
    id: name,
    name: name,
    symbol: name
}));

/* GET ticker charts. */
router.get('/', function(req, res, next) {
    const modifyResponse = function(original) {
        const rates = JSON.parse(original.toString());


        const updated = rates.map((rate, index) => ({
            price_usd: 1.0*rate.price_usd,
            price_swx: 1.0*rate.price_btc,
            price_chf: 0.99 * rate.price_usd,
            percent_change_1h: rate.percent_change_1h*1,
            percent_change_24h: rate.percent_change_24h*1,
            percent_change_7d: rate.percent_change_7d*1,
            last_updated: rate.last_updated*1,

            ...GanjaRates[index]
        }));

        return Buffer.from(JSON.stringify(updated));
    };

    const write = concat(function(completeResponse) {
        var finalResponse = modifyResponse(completeResponse);

        res.end(finalResponse);
    });
    request.get({url: 'https://api.coinmarketcap.com/v1/ticker/?limit=' + GanjaRates.length, ttl: 15e3})
        .pipe(write);
    //res.send('respond with a resource');
});

module.exports = router;
