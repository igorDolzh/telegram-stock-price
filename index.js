const axios = require('axios')
const config = require('./config')

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

let defaultInterval = 300000

function sendMessage(text) {
  axios.post(
    `https://api.telegram.org/bot${config.token}/sendMessage`,
    {
      text: text,
      chat_id: config.chatId
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

function notifyByPriceInterval({ stock, interval = defaultInterval, buy, sell}) {
  setInterval(() => notifyByPrice(stock, {
    buy,
    sell
  }), interval)
}

function notifyByPriceIntervalArray(array) {
  array.forEach(notifyByPriceInterval)
}

module.exports = () => {
  notifyByPriceIntervalArray([
    {
      stock: Stocks.VISA,
      buy: {
        lower: 107,
        greater: 108
      },
      sell: {
        lower: 107,
        greater: 108
      }
    },
    {
      stock: Stocks.MICRON,
      buy: {
        lower: 40,
        greater: 42
      }
    },
    {
      stock: Stocks.BLIZZARD,
      buy: {
        lower: 61
      },
      sell: {
        greater: 63
      }
    },
    {
      stock: Stocks.APPLE,
      buy: {
        lower: 152,
        greater: 159
      }
    },
    {
      stock: Stocks.PAYPALL,
      buy: {
        lower: 65,
        greater: 73
      }
    },
    {
      stock: Stocks.FACEBOOK,
      buy: {
        lower: 165,
        greater: 180
      }
    },
    {
      stock: Stocks.ELECTRONIC,
      buy: {
        lower: 110,
        greater: 115
      }
    }
  ])
}

