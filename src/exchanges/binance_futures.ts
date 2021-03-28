import Exchange from './exchangeAbstract'

export default class extends Exchange {
  id = 'BINANCE_FUTURES'
  private lastSubscriptionId = 0
  private subscriptions = {}
  protected endpoints = { PRODUCTS: 'https://fapi.binance.com/fapi/v1/exchangeInfo' }

  getUrl() {
    return 'wss://fstream.binance.com/ws'
  }

  formatProducts(data) {
    return data.symbols.map(product => product.symbol.toLowerCase())
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
        return this.emitTrades(api._id, [
          {
            exchange: this.id,
            pair: json.s.toLowerCase(),
            timestamp: json.T,
            price: +json.p,
            size: +json.q,
            side: json.m ? 'sell' : 'buy'
          }
        ])
      } else if (json.e === 'forceOrder') {
        return this.emitLiquidations(api._id, [
          {
            exchange: this.id,
            pair: json.o.s.toLowerCase(),
            timestamp: json.o.T,
            price: +json.o.p,
            size: +json.o.q,
            side: json.o.S === 'BUY' ? 'buy' : 'sell',
            liquidation: true
          }
        ])
      }
    }
  }
}
