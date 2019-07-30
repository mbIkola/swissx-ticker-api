const express = require('express');
const router = express.Router();
const request = require('cached-request')(require('request'));
const concat = require('concat-stream');
const log = require('../lib/log');
const GanjaRates = 'PREMIUM,BIOMASS,ISO999,H20-SOL,DISTIL,CRUDe'.split(',').map(name => ({
    id: name,
    name: name,
    symbol: name,
}));

const averagePrices = {
    'CRUDe': {
        min: 2000.0,
        max: 2500.0,
    },
    'DISTIL': {
        min: 5000.0,
        max: 7000.0
    },
    'H20-SOL': {
        min: 8500.0,
        max: 10000.0,
    },
    'ISO999': {
        min: 6000.0,
        max: 8000.0
    },
    'BIOMASS': {
        min: 150 * 2.20, //'smokable', 150$ per pound
        max: 350 * 2.20
    },
    'PREMIUM': {
        min: 8500.0, // aka zero-t distillate
        max: 10000.0
    }
};

const normalizePrice = (currentPrice, ganjaIndex, {percent_change_7d, percent_change_1h}) => {
    const ganjaName = (GanjaRates[ganjaIndex] || {}).name;
    if ( ! ganjaName ) {
        log.error("Unknown ganja index: ", ganjaIndex);
        return currentPrice;
    }

    const {max, min} = averagePrices[ganjaName];
    let addition = currentPrice * ( Math.abs(percent_change_7d)/100.0);
    let max0 = currentPrice + addition;
    let min0 = currentPrice - addition;

    const range = max0 - min0;
    const scale01 = (currentPrice - min0)/range;
    const range2 = max - min;
    const normalized = (scale01 * range2)  + min;

    log.info(`Normalization:  === ${normalized}`);
    log.debug(
        `Ganja price for ${ganjaName} normalized from
        ${currentPrice} to ${normalized}
        (within interval [${min}, ${max}] from observed [${min0}, ${max0}]`);

    // bullshit;
    return Number(normalized * (1.0 + percent_change_1h/100.0)).toFixed(2)*1;
};

/* GET ticker charts. */
router.get('/', function(req, res, next) {
    const modifyResponse = function(original) {
        const rates = JSON.parse(original.toString());


        const updated = rates.map((rate, index) =>  {
            const priceUsd = normalizePrice(1.0*rate.price_usd, index, rate);

            return {
                price_usd: priceUsd,
                    price_swx: 1.0*rate.price_btc,
                price_chf: Number(0.99 * priceUsd).toFixed(2)*1,
                percent_change_1h: rate.percent_change_1h*1,
                percent_change_24h: rate.percent_change_24h*1,
                percent_change_7d: rate.percent_change_7d*1,
                last_updated: rate.last_updated*1,

                ...GanjaRates[index]
            };
        });

        return Buffer.from(JSON.stringify(updated));
    };

    const write = concat(function(completeResponse) {
        const finalResponse = modifyResponse(completeResponse);

        res.end(finalResponse);
    });
    request.get({url: 'https://api.coinmarketcap.com/v1/ticker/?limit=' + GanjaRates.length, ttl: 15e3})
        .pipe(write);
    //res.send('respond with a resource');
});

module.exports = router;
