const axios = require('axios')
const config = require('./config')

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
  axios.get(`https://api.tinkoff.ru/trading/stocks/get?ticker=${ticker}`)
  .then(res => {
    let { name, priceBuy, priceSell } = extractData(res)
    sendMessage(
      `${name}: Buy:${priceBuy} Sell:${priceSell}`
    )
  })
}


function notifyByPrice(ticker, {
  lower, greater
}) {
  axios.get(`https://api.tinkoff.ru/trading/stocks/get?ticker=${ticker}`)
  .then(res => {
    let { name, priceBuy, priceSell } = extractData(res)

    if ((priceBuy < lower) || (priceSell < lower)){
      sendMessage(`${name}: Buy:${priceBuy} Sell:${priceSell}`)
    }
    if ((priceBuy > greater) || (priceSell > greater)){
      sendMessage(`${name}: Buy:${priceBuy} Sell:${priceSell}`)
    }
  })
}

setInterval(() => notifyByPrice('V', {
  lower: 107,
  greater: 108
}), 10000)
setInterval(() => notifyByPrice('MSFT', {
  lower: 77,
  greater: 78
}), 10000)
setInterval(() => notifyByPrice('ATVI', {
  lower: 61,
  greater: 62
}), 10000)
