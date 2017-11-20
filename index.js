const axios = require('axios')
const config = require('./config')
var MongoClient = require('mongodb').MongoClient
var mongoose = require('mongoose');
var assert = require('assert');

// Connection URL
var url = config.mongodb;

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
  VISA: 'V',
  BLIZZARD: 'ATVI',
  MICROSOFT: 'MSFT',
  CHINA: 'FXCN',
  AEROFLOT: 'AFLT',
  TINKOFF: 'TCS',
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
  )
  axios.post(
    `https://api.telegram.org/bot${config.token}/sendMessage`,
    {
      text: text,
      chat_id: config.chatZhuId
    }
  )  
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

function trackStock(ticker, {
  step = 0.01,
  send = false,
  trackType = storeBuy,
  trackMethod = StockBuy
}) {
  axios.get(`https://api.tinkoff.ru/trading/stocks/get?ticker=${ticker}`)
    .then(res => {
      if (ticker === 'VISA') {
        sendMessage('VISA WOW')
      }

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

function notifyByPriceInterval({ stock, interval = defaultInterval, buy, sell}) {
  setInterval(() => notifyByPrice(stock, {
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

function launch() {
  trackBundle(Stocks, {
    trackType:storeBuy,
    trackMethod:StockBuy,
    step:0.01,
    send: true
  })
  
  trackBundle(StocksSell, {
    trackType:storeSell,
    trackMethod:StockSell,
    step:0.005,
    send: true
  })
  
  let buyInterval = setInterval(() => {
    if (shouldUpdate()) {
      trackBundle(Stocks, {
        trackType:storeBuy,
        trackMethod:StockBuy,
        step:0.01
      })
    }
  }, 60000)
  
  let sellInterval = setInterval(() => {
    if (shouldUpdate()) {
      trackBundle(StocksSell, {
        trackType:storeSell,
        trackMethod:StockSell,
        step:0.005
      })
    }
  }, 60000)

}

launch()


module.exports = () => {
  // trackBundle(Stocks, {
  //   trackType:storeBuy,
  //   trackMethod:StockBuy,
  //   step:0.01
  // })
  // trackBundle(StocksSell, {
  //   trackType:storeSell,
  //   trackMethod:StockSell,
  //   step:0.005
  // })
  // trackStock(Stocks.VISA, {
  //   step: 0.001
  // })
  // notifyByPriceIntervalArray([
  //   {
  //     stock: Stocks.VISA,
  //     buy: {
  //       lower: 107,
  //       greater: 108
  //     },
  //     sell: {
  //       lower: 107,
  //       greater: 108
  //     }
  //   },
  //   {
  //     stock: Stocks.MICRON,
  //     buy: {
  //       lower: 40,
  //       greater: 42
  //     }
  //   },
  //   {
  //     stock: Stocks.BLIZZARD,
  //     buy: {
  //       lower: 61
  //     },
  //     sell: {
  //       greater: 63
  //     }
  //   },
  //   {
  //     stock: Stocks.APPLE,
  //     buy: {
  //       lower: 152,
  //       greater: 159
  //     }
  //   },
  //   {
  //     stock: Stocks.PAYPALL,
  //     buy: {
  //       lower: 65,
  //       greater: 73
  //     }
  //   },
  //   {
  //     stock: Stocks.FACEBOOK,
  //     buy: {
  //       lower: 165,
  //       greater: 180
  //     }
  //   },
  //   {
  //     stock: Stocks.ELECTRONIC,
  //     buy: {
  //       lower: 110,
  //       greater: 115
  //     }
  //   },
  //   {
  //     stock: Stocks.ADOBE,
  //     buy: {
  //       lower: 150,
  //       greater: 180
  //     }
  //   },
  //   {
  //     stock: Stocks.ALIBABA,
  //     buy: {
  //       lower: 170,
  //       greater: 180
  //     }
  //   },
  //   {
  //     stock: Stocks.DOLLARTREE,
  //     buy: {
  //       lower: 90,
  //       greater: 95
  //     }
  //   },
  //   {
  //     stock: Stocks.MASTERCARD,
  //     buy: {
  //       lower: 140,
  //       greater: 150
  //     }
  //   },
  //   {
  //     stock: Stocks.YY,
  //     buy: {
  //       lower: 90,
  //       greater: 100
  //     }
  //   },
  //   {
  //     stock: Stocks.CHINALODGING,
  //     buy: {
  //       lower: 130,
  //       greater: 150
  //     }
  //   },
  //   {
  //     stock: Stocks.SOHU,
  //     buy: {
  //       lower: 57,
  //       greater: 70
  //     }
  //   },
  //   {
  //     stock: Stocks.INTEL,
  //     buy: {
  //       lower: 39,
  //       greater: 42
  //     }
  //   },
  //   {
  //     stock: Stocks.JOBS,
  //     buy: {
  //       lower: 60,
  //       greater: 65
  //     }
  //   }
  // ])
}








// ABBVIE: 'ABBV',
// ALCOA: 'AA',
// APPLIED: 'AMAT',
// REDHAT: 'RHT',
// HORTON: 'DHI',
// FMC: 'FMC',
// ABBOTT: 'ABT',
// COGNIZANT: 'CTSH'

