import Exchange from '../exchange'

export default class extends Exchange {
  id = 'BINANCE_FUTURES'
  private lastSubscriptionId = 0
  private subscriptions = {}
  private specs: { [pair: string]: number }
  private types: { [pair: string]: string }
  protected endpoints = { PRODUCTS: ['https://fapi.binance.com/fapi/v1/exchangeInfo', 'https://dapi.binance.com/dapi/v1/exchangeInfo'] }

  getUrl(pair: string) {
    if (this.types[pair] === 'usd') {
      return 'wss://fstream.binance.com/ws'
    } else {
      return 'wss://dstream.binance.com/ws'
    }
  }

  formatProducts(response) {
    const products = []
    const specs = {}
    const types = {}

    for (const data of response) {
      for (const product of data.symbols) {
        if ((product.contractStatus && product.contractStatus !== 'TRADING') || (product.status && product.status !== 'TRADING')) {
          continue
        }

        types[product.symbol] = /^USD/.test(product.marginAsset) ? 'usd' : 'coin'

        if (product.contractSize) {
          specs[product.symbol] = product.contractSize
        }

        products.push(product.symbol.toLowerCase())
      }
    }

    return {
      products,
      specs,
      types
    }
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async subscribe(api, pair): Promise<void> {
    if (!super.subscribe.apply(this, [api, pair])) {
      return
    }

    this.subscriptions[pair] = ++this.lastSubscriptionId

    const params = [pair + '@trade', pair + '@forceOrder']

    api.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        params,
        id: this.subscriptions[pair]
      })
    )

    // BINANCE: WebSocket connections have a limit of 5 incoming messages per second.
    return new Promise(resolve =>
      setTimeout(() => {
        resolve()
      }, 250)
    )
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair) {
    if (!super.unsubscribe.apply(this, [api, pair])) {
      return
    }

    const params = [pair + '@trade', pair + '@forceOrder']

    api.send(
      JSON.stringify({
        method: 'UNSUBSCRIBE',
        params,
        id: this.subscriptions[pair]
      })
    )

    delete this.subscriptions[pair]

    // BINANCE: WebSocket connections have a limit of 5 incoming messages per second.
    return new Promise(resolve => setTimeout(resolve, 250))
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    if (!json) {
      return
    } else {
      if (json.e === 'trade' && json.X !== 'INSURANCE_FUND') {
        let size = +json.q

        if (typeof this.specs[json.s] === 'number') {
          size = (size * this.specs[json.s]) / json.p
        }

        return this.emitTrades(api._id, [
          {
            exchange: this.id,
            pair: json.s.toLowerCase(),
            timestamp: json.T,
            price: +json.p,
            size: size,
            side: json.m ? 'sell' : 'buy'
          }
        ])
      } else if (json.e === 'forceOrder') {
        let size = +json.o.q

        if (typeof this.specs[json.o.s] === 'number') {
          size = (size * this.specs[json.o.s]) / json.o.q
        }

        return this.emitLiquidations(api._id, [
          {
            exchange: this.id,
            pair: json.o.s.toLowerCase(),
            timestamp: json.o.T,
            price: +json.o.p,
            size: size,
            side: json.o.S === 'BUY' ? 'buy' : 'sell',
            liquidation: true
          }
        ])
      }
    }
  }
}
