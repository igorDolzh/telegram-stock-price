const axios = require('axios')
const config = require('./config')
var MongoClient = require('mongodb').MongoClient
var mongoose = require('mongoose');
var assert = require('assert');
var express = require('express')

// Connection URL
var url = config.mongodb

// Use connect method to connect to the server

mongoose.connect(url, { useMongoClient: true });
mongoose.Promise = global.Promise;

var StockBuy = mongoose.model('StockBuy', { name: String, value: Number });
var StockSell = mongoose.model('StockSell', { name: String, value: Number });

StockBuy.find(function (err, stocks) {
  // if (err) return console.error(err);
  // console.log(stocks);
})

StockSell.find(function (err, stocks) {
  // if (err) return console.error(err);
  // console.log(stocks);
})

let Stocks = {
  VISA: 'V',
  MICRON: 'MU',
  BLIZZARD: 'ATVI',
  MICROSOFT: 'MSFT',
  APPLE: 'AAPL',
  PAYPALL: 'PYPL',
  FACEBOOK: 'FB',
  ELECTRONIC: 'EA',
  ADOBE: 'ADBE',
  ALIBABA: 'BABA',
  DOLLARTREE: 'DLTR',
  MASTERCARD: 'MA',
  AEROFLOT: 'AFLT',
  SBERBANK: 'SBER',
  YY: 'YY',
  AMZN: 'AMZN',
  NVIDIA: 'NVDA',
  WEIBO: 'WB',
  FIRSTSOLAR: 'FSLR',
  CHINALODGING: 'HTHT',
  SOHU: 'SOHU',
  INTEL: 'INTC',
  AUTODESK: 'ADSK',
  TINKOFF: 'TCS',
  JOBS: 'JOBS',
  ABBVIE: 'ABBV',
  ALCOA: 'AA',
  APPLIED: 'AMAT',
  REDHAT: 'RHT',
  HORTON: 'DHI',
  FMC: 'FMC',
  ABBOTT: 'ABT',
  COGNIZANT: 'CTSH'
}

let StocksSell = {
  BABA: 'BABA',
  AMAT: 'AMAT',
  PYPL: 'PYPL'
}

let storeBuy = {
  type: 'buy',
  [Stocks.VISA] : 108.4
}

let storeSell = {
  type: 'sell',
}

let defaultInterval = 300000

function sendMessage(text) {
  axios.post(
    `https://api.telegram.org/bot${config.token}/sendMessage`,
    {
      text: text,
      chat_id: config.chatId
    }
  ).catch((err) => console.error(err))
  // axios.post(
  //   `https://api.telegram.org/bot${config.token}/sendMessage`,
  //   {
  //     text: text,
  //     chat_id: config.chatZhuId
  //   }
  // )  
}

function extractData(res) {
  const { data } = res
  let { payload } = data
  let priceBuy = payload.prices['buy'].value
  let priceSell = payload.prices['sell'].value
  let name = payload.symbol.showName
  return {
    name,
    priceBuy,
    priceSell
  }
}

function extractDataCur(res) {
  const { data } = res
  let { payload } = data
  let priceBuy = payload.buy.value
  let priceSell = payload.sell.value
  return {
    priceBuy,
    priceSell
  }
}

function getStock(ticker) {
  console.log('getStock '+ ticker)
  axios.get(`https://api.tinkoff.ru/trading/stocks/get?ticker=${ticker}`)
  .then(res => {
    let { name, priceBuy, priceSell } = extractData(res)
    sendMessage(
      `${name}: Buy:${priceBuy} Sell:${priceSell}`
    )
  })
}


function notifyByPrice(ticker, {
  buy = {}, sell = {}
}) {
  console.log(ticker, buy, sell)
  axios.get(`https://api.tinkoff.ru/trading/stocks/get?ticker=${ticker}`)
  .then(res => {
    let { name, priceBuy, priceSell } = extractData(res)

    if ((buy.lower && (priceBuy < buy.lower)) || (sell.lower && (priceSell < sell.lower))){
      sendMessage(`${name}: Buy:${priceBuy} Sell:${priceSell}`)
    }
    if ((buy.greater && (priceBuy > buy.greater)) || (sell.greater && (priceSell > sell.greater))) {
      sendMessage(`${name}: Buy:${priceBuy} Sell:${priceSell}`)
    }
  })
}

function notifyByPriceCur(ticker, {
  buy = {}, sell = {}
}) {
  console.log('kek',ticker)
  axios.get(`https://api.tinkoff.ru/trading/currency/price?ticker=${ticker}`)
  .then(res => {
    let { priceBuy, priceSell } = extractDataCur(res)
    console.log('priceBuy', priceBuy)

    if ((buy.lower && (priceBuy < buy.lower)) || (sell.lower && (priceSell < sell.lower))){
      sendMessage(`${ticker}: Buy:${priceBuy} Sell:${priceSell}`)
    }
    if ((buy.greater && (priceBuy > buy.greater)) || (sell.greater && (priceSell > sell.greater))) {
      sendMessage(`${ticker}: Buy:${priceBuy} Sell:${priceSell}`)
    }
  })
}

function trackStock(ticker, {
  step = 0.01,
  send = false,
  trackType = storeBuy,
  trackMethod = StockBuy
}) {
  axios.get(`https://api.tinkoff.ru/trading/stocks/get?ticker=${ticker}`)
    .then(res => {
      let { name, priceBuy, priceSell } = extractData(res)
      let { type } = trackType
      let price = type === 'buy' ? priceBuy : priceSell

      if (!trackType[ticker]) {
        trackType[ticker] = {
          name: ticker,
          value: price
        }
        var stock = new trackMethod(trackType[ticker]);
        stock.save(function (err) {
          if (err) {
            // console.log(err);
          } else {
            // console.log('db',trackType[ticker]);
          }
        });
      }
      
      let previousPrice = trackType[ticker].value
      let change = (Math.abs(previousPrice - price) / previousPrice)
      // console.log('price' , type, price, trackType[ticker], change)


      
      if (change > step) {
        trackType[ticker].value = price
        trackType[ticker].save(function (err) {
          if (err) {
            // console.log(err);
          } else {
            // console.log('db',trackType[ticker]);
          }
        });
        let prieterChange = `${change * 100}%`
        sendMessage(`${type}: ${name}: Current price:${price} Previous Price:${previousPrice} Change: ${prieterChange}`)
      } else if (send) {
        let prieterChange = `${change * 100}%`
        sendMessage(`Start tracking for: ${type}: ${name}: Current price:${price} Previous Price:${previousPrice} Change: ${prieterChange}`)
      }
    })
}

function notifyByPriceInterval({ stock, interval = defaultInterval, buy, sell }) {
  setInterval(() => notifyByPrice(stock, {
    buy,
    sell
  }), interval)
}

function notifyByPriceCurInterval({ stock, interval = defaultInterval, buy, sell }) {
  console.log('kek', interval)
  setInterval(() => notifyByPriceCur(stock, {
    buy,
    sell
  }), interval)
}

function notifyByPriceIntervalArray(array) {
  array.forEach(notifyByPriceInterval)
}

function trackStockMongo(ticker, options) {
  let { trackType, trackMethod, step } = options
  trackMethod.findOne({ name: ticker }, (err, stock) => {
    console.log(trackType.type, ticker, stock);
    trackType[ticker] = stock
    trackStock(ticker,options)
  });
}

function trackBundle(Stocks, options) {
  let keys = Object.keys(Stocks)
  keys.forEach((key) => {
    if (options.send) {
      trackStockMongo(Stocks[key], options)
    } else {
      trackStock(Stocks[key],options)
    }
  })
}

function theDayOfTheWeek() {
  return (new Date()).getDay()
}

function shouldUpdate() {
  let day = theDayOfTheWeek()
  if (day === 6 || day === 0){
    return false
  }
  return true
}

function trackCrypto({
  step = 0.01
}) {
  axios.get(`https://api.coinmarketcap.com/v1/ticker?limit=10`)
    .then(res => {
      let message = ''
      // console.log(res)
      res.data.forEach((coin) => {
        let { symbol: ticker, price_usd: price, name } = coin
        if (!storeBuy[ticker]) {
          var stock = new StockBuy(storeBuy[ticker]);
          StockBuy.findOne({ name: ticker }, (err, stock) => {
            storeBuy[ticker] = stock
          });
          stock.save(function (err) {
            if (err) {
              // console.log(err);
            } else {
              // console.log('db',trackType[ticker]);
            }
          });
        }
        if (storeBuy[ticker]) {
          let previousPrice = storeBuy[ticker].value
          let change = (Math.abs(previousPrice - price) / previousPrice)
          // console.log('price' , type, price, trackType[ticker], change)
          
    
          //console.log('storeBuy[ticker]',storeBuy[ticker])
          if (change > step) {
            storeBuy[ticker].value = price
            console.log('go go', storeBuy[ticker])
            storeBuy[ticker].save(function (err) {
              if (err) {
                // console.log(err);
              } else {
                // console.log('db',trackType[ticker]);
              }
            });
            let prieterChange = `${change * 100}%`
            message += `\n\n${name}: Current price:${price} Previous Price:${previousPrice} Change: ${prieterChange}`
            if (message.length > 1000) {
              sendMessage(message)
              message = ''
            }
          }
        }

      })
      if (message) {
        sendMessage(message)
        message = ''
      }
    })
  }



function launch() {
  // trackBundle(Stocks, {
  //   trackType:storeBuy,
  //   trackMethod:StockBuy,
  //   step:0.01,
  //   send: true
  // })
  
  // trackBundle(StocksSell, {
  //   trackType:storeSell,
  //   trackMethod:StockSell,
  //   step:0.005,
  //   send: true
  // })
  
  // let buyInterval = setInterval(() => {
  //   if (shouldUpdate()) {
  //     trackBundle(Stocks, {
  //       trackType:storeBuy,
  //       trackMethod:StockBuy,
  //       step:0.01
  //     })
  //   }
  // }, 60000)
  
  let sellInterval = setInterval(() => {
    // if (shouldUpdate()) {
      trackBundle(StocksSell, {
        trackType:storeSell,
        trackMethod:StockSell,
        step:0.005
      })
    // }
  }, 60000)
  trackCrypto({ step: 0.01 })
  setInterval(() => trackCrypto({ step: 0.01 }), 10000)

}

// var app = express()

// app.get('/', function (req, res) {
//   res.send('hello world')
//   launch()
// })


// var server = app.listen(3000, () => console.log('Example app listening on port 3000!'))

// server.on('close', function(done) {
//   console.log('Closing simple example app port %s', 3000);
// });
// launch()

notifyByPriceCurInterval({
        stock: 'USDRUB',
        buy: {
          lower: 62.5
        },
      })
// module.exports = () => {
//   launch()
//   // trackBundle(Stocks, {
//   //   trackType:storeBuy,
//   //   trackMethod:StockBuy,
//   //   step:0.01
//   // })
//   // trackBundle(StocksSell, {
//   //   trackType:storeSell,
//   //   trackMethod:StockSell,
//   //   step:0.005
//   // })
//   // trackStock(Stocks.VISA, {
//   //   step: 0.001
//   // })
//   notifyByPriceIntervalArray([
//     {
//       stock: Stocks.AMZN,
//       buy: {
//         lower: 1150,
//         greater: 1210
//       },
//       sell: {
//         lower: 1150,
//         greater: 1210
//       }
//     },
//   ])
// }








// ABBVIE: 'ABBV',
// ALCOA: 'AA',
// APPLIED: 'AMAT',
// REDHAT: 'RHT',
// HORTON: 'DHI',
// FMC: 'FMC',
// ABBOTT: 'ABT',
// COGNIZANT: 'CTSH'

