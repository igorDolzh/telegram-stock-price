// http://iss.moex.com/iss/engines/currency/markets/selt/boards/CETS/securities/GBPRUB_TOM.json
// http://www.moex.com/cs/engines/currency/markets/selt/boardgroups/13/securities/GBPRUB_TOM.hs
// https://www.tinkoff.ru/api/v1/currency_rates/
// https://query.yahooapis.com/v1/public/yql?q=select+*+from+yahoo.finance.xchange+where+pair+=+%22GBPRUB%22&format=json&env=store://datatables.org/alltableswithkeys

const axios = require('axios')

let previosRate = 0

function sendMessage(text) {
  axios.post(
    `https://api.telegram.org/bot{Token}/sendMessage`,
    {
      text: text,
      chat_id: '40196122'
    }
  )
}

function getRate() {
  sendMessage('I am working babe')
  axios.get('https://www.tinkoff.ru/api/v1/currency_rates/').then(res => {
    const { data } = res
    data.payload.rates.map(item => {
      if (
        item.category === 'DebitCardsTransfers' &&
        (item.fromCurrency.name === 'GBP' && item.toCurrency.name === 'RUB')
      ) {
        if (previosRate !== item.sell) {
          d = new Date().toLocaleTimeString()
          different = (item.sell - previosRate).toFixed(2)

          if (Math.abs(different) > 0.1) {
            previosRate = item.sell
            exp = (item.sell * 400).toFixed(2)

            sendMessage(
              `Фунты: ${item.sell.toFixed(2)}\t${different}\n${exp}(£400)`
            )
            console.log(
              `[${d}] Купить Фунты сейчас:\t${item.sell.toFixed(
                2
              )}\t${different}\t${exp}(£400)`
            )
          }
        }
      }
    })
  })
}

setInterval(getRate, 10000)