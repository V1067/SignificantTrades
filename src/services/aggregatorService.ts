import Exchange from '@/exchanges/exchangeAbstract'
import store from '@/store'
import { countDecimals } from '@/utils/helpers'
import EventEmitter from 'eventemitter3'
import exchanges, { getExchangeById } from '../exchanges'

export interface Market {
  id: string
  exchange: string
  pair: string
}

export interface Trade {
  exchange: string
  pair: string
  timestamp: number
  price: number
  size: number
  side: 'buy' | 'sell'
  count?: number
  originalPrice?: number
  liquidation?: boolean
  slippage?: number
}

export interface QueuedTrade extends Trade {
  timeout?: number
}

export interface Volumes {
  vbuy: number
  vsell: number
  cbuy: number
  csell: number
  lbuy: number
  lsell: number
}

export interface Connection {
  exchange: string
  pair: string
  hit: number
  timestamp: number
}

class Aggregator extends EventEmitter {
  public connections: { [name: string]: Connection } = {}
  private onGoingAggregations: { [identifier: string]: QueuedTrade } = {}
  private pendingTrades: Trade[] = []
  private marketsPrices: { [marketId: string]: number } = {}
  private pendingStats = {
    timestamp: null,
    vbuy: 0,
    vsell: 0,
    lbuy: 0,
    lsell: 0,
    cbuy: 0,
    csell: 0
  }

  private optimalDecimalToBeDetermined = store.state.settings.decimalPrecision === null
  private calculateSlippage = store.state.settings.calculateSlippage.valueOf()
  private aggregateTrades = store.state.settings.aggregateTrades.valueOf()

  private _aggrInterval: number
  private _statsInterval: number

  constructor() {
    super()

    console.warn(`[aggr] new instance`)

    // cache calculateSlippage & aggregateTrades values
    // to avoid re-evaluate vuex getters each time it is called
    store.subscribe(mutation => {
      switch (mutation.type) {
        case 'panes/SET_PANE_MARKETS':
        case 'panes/ADD_PANE':
        case 'panes/REMOVE_PANE':
          this.refreshStatsBuckets()
          break
      }

      if (mutation.type === 'settings/TOGGLE_SLIPPAGE') {
        this.calculateSlippage = store.state.settings.calculateSlippage.valueOf()
      } else if (mutation.type === 'settings/TOGGLE_AGGREGATION') {
        this.aggregateTrades = store.state.settings.aggregateTrades.valueOf()

        this.bindTradesEvent()
      }
    })
  }

  initialize() {
    this.bindExchanges()
    this.bindTradesEvent()
    this.setupAggrInterval()
    this.refreshStatsBuckets()

    if (this.optimalDecimalToBeDetermined) {
      this.determineOptimalDecimal()
    }
  }

  bindExchanges() {
    for (const exchange of exchanges as Exchange[]) {
      exchange.on('liquidations', this.onLiquidations.bind(this))
      exchange.on('subscribed', this.onSubscribed.bind(this, exchange.id))
      exchange.on('unsubscribed', this.onUnsubscribed.bind(this, exchange.id))

      store.commit('app/EXCHANGE_UPDATED', exchange.id)
    }
  }

  bindTradesEvent() {
    for (const exchange of exchanges as Exchange[]) {
      exchange.off('trades')

      if (this.aggregateTrades) {
        exchange.on('trades', this.onAggrTrades.bind(this))
      } else {
        exchange.on('trades', this.onTrades.bind(this))
      }
    }
  }

  onTrades(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const market = trade.exchange + ':' + trade.pair

      if (this.calculateSlippage) {
        trade.originalPrice = this.marketsPrices[market] || trade.price
      }

      trade.count = 1

      this.marketsPrices[market] = trade.price

      this.queueTrade(trade)
    }
  }

  onAggrTrades(trades: Trade[]) {
    const now = +new Date()

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const market = trade.exchange + ':' + trade.pair

      if (this.onGoingAggregations[market]) {
        const aggTrade = this.onGoingAggregations[market]

        if (aggTrade.timestamp === trade.timestamp && aggTrade.side === trade.side) {
          aggTrade.size += trade.size
          aggTrade.price = trade.price
          aggTrade.count++
          continue
        } else {
          this.queueTrade(aggTrade)
        }
      }

      if (store.state.settings.calculateSlippage) {
        trade.originalPrice = this.marketsPrices[market] || trade.price
      }

      this.marketsPrices[market] = trade.price

      trade.count = 1

      this.onGoingAggregations[market] = trade
      this.onGoingAggregations[market].timeout = now + 50
    }
  }

  queueTrade(trade: Trade) {
    if (this.calculateSlippage) {
      if (this.calculateSlippage === 'price') {
        trade.slippage = Math.round(trade.price - trade.originalPrice)
      } else if (this.calculateSlippage === 'bps') {
        if (trade.side === 'buy') {
          trade.slippage = Math.floor(((trade.price - trade.originalPrice) / trade.originalPrice) * 10000)
        } else {
          trade.slippage = Math.floor(((trade.originalPrice - trade.price) / trade.price) * 10000)
        }
      }
    }

    if (this._statsInterval !== null && store.state.app.activeExchanges[trade.exchange]) {
      const size = (store.state.settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size

      if (!this.pendingStats.timestamp) {
        this.pendingStats.timestamp = trade.timestamp
      }

      this.pendingStats['c' + trade.side] += trade.count
      this.pendingStats['v' + trade.side] += size
    }

    this.pendingTrades.push(trade)
  }

  emitTrades() {
    if (this.aggregateTrades) {
      const now = +new Date()
      const aggMarkets = Object.keys(this.onGoingAggregations)

      for (let i = 0; i < aggMarkets.length; i++) {
        const aggTrade = this.onGoingAggregations[aggMarkets[i]]

        if (now > aggTrade.timeout) {
          this.queueTrade(aggTrade)

          delete this.onGoingAggregations[aggMarkets[i]]
        }
      }
    }

    if (this.pendingTrades.length) {
      this.emit('trades', this.pendingTrades)
      this.pendingTrades.splice(0, this.pendingTrades.length)
    }
  }

  emitStats() {
    if (this.pendingStats.timestamp) {
      this.emit('sums', this.pendingStats)

      this.pendingStats = {
        timestamp: null,
        vbuy: 0,
        vsell: 0,
        lbuy: 0,
        lsell: 0,
        cbuy: 0,
        csell: 0
      }
    }
  }

  onLiquidations(trades: Trade[]) {
    if (this._statsInterval !== null) {
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i]

        if (store.state.app.activeExchanges[trade.exchange]) {
          if (!this.pendingStats.timestamp) {
            this.pendingStats.timestamp = trade.timestamp
          }

          this.pendingStats['l' + trade.side] += (store.state.settings.preferQuoteCurrencySize ? trade.price : 1) * trade.size
        }
      }
    }

    this.emit('trades', trades)
  }

  onSubscribed(exchangeId, pair) {
    if (this.connections[exchangeId + ':' + pair]) {
      return
    }

    this.connections[exchangeId + ':' + pair] = {
      exchange: exchangeId,
      pair: pair,
      hit: 0,
      timestamp: null
    }

    store.dispatch('app/showNotice', {
      id: exchangeId,
      type: 'success',
      title: `Subscribed to ${exchangeId + ':' + pair}`
    })
  }

  onUnsubscribed(exchangeId, pair) {
    if (this.connections[exchangeId + ':' + pair]) {
      delete this.connections[exchangeId + ':' + pair]

      store.dispatch('app/showNotice', {
        id: exchangeId,
        type: 'info',
        title: `Unsubscribed from ${exchangeId + ':' + pair}`
      })
    }
  }

  /**
   * Trigger subscribe to pairs (settings.pairs) on all enabled exchanges
   * @param {string[]} pairs eg ['BTCUSD', 'FTX:BTC-PERP']
   * @returns {Promise<any>} promises of connections
   * @memberof Server
   */
  connect(markets: string[]) {
    console.log(`[aggregator] connect`, markets)

    const marketsByExchange = markets.reduce((output, market) => {
      const [exchangeId, pair] = market.split(':')

      if (!exchangeId || !pair) {
        return
      }

      if (!output[exchangeId]) {
        output[exchangeId] = []
      }

      if (output[exchangeId].indexOf(market) === -1) {
        output[exchangeId].push(market)
      }

      return output
    }, {})

    const promises: Promise<void>[] = []

    for (const exchangeId in marketsByExchange) {
      if (!store.state.exchanges[exchangeId] || store.state.exchanges[exchangeId].disabled === true) {
        continue
      }

      const exchange = getExchangeById(exchangeId)

      if (exchange) {
        for (const market of marketsByExchange[exchangeId]) {
          promises.push(exchange.link(market))
        }
      }
    }

    return Promise.all(promises)
  }

  /**
   * Trigger unsubscribe to pairs on all activated exchanges
   * @param {string[]} pairs
   * @returns {Promise<void>} promises of disconnection
   * @memberof Server
   */
  disconnect(markets: string[]) {
    console.log(`[aggregator] disconnect`, markets)

    const marketsByExchange = markets.reduce((output, market) => {
      const [exchangeId, pair] = market.split(':')

      if (!exchangeId || !pair) {
        return
      }

      if (!output[exchangeId]) {
        output[exchangeId] = []
      }

      if (output[exchangeId].indexOf(market) === -1) {
        output[exchangeId].push(market)
      }

      return output
    }, {})

    const promises: Promise<void>[] = []

    for (const exchangeId in marketsByExchange) {
      const exchange = getExchangeById(exchangeId)

      if (exchange) {
        for (const market of marketsByExchange[exchangeId]) {
          promises.push(exchange.unlink(market))
        }
      }
    }

    return Promise.all(promises)
  }

  setupAggrInterval() {
    this._aggrInterval = setInterval(this.emitTrades.bind(this), 100)
  }

  clearAggrInterval() {
    if (this._aggrInterval) {
      clearInterval(this._aggrInterval)
      delete this._aggrInterval
    }
  }

  setupStatsInterval() {
    if (!this._statsInterval) {
      this._statsInterval = setInterval(this.emitStats.bind(this), 500)
    } else {
      console.warn('stats interval alreay set')
    }
  }
  clearStatsInterval() {
    if (this._statsInterval) {
      clearInterval(this._statsInterval)
      this._statsInterval = null
    }
  }

  refreshStatsBuckets() {
    // todo: different buckets for each pane

    let requireStatsInterval = false

    for (const id in store.state.panes.panes) {
      const pane = store.state.panes.panes[id]

      if (pane.type === 'stats' || pane.type === 'counters') {
        requireStatsInterval = true
        break
      }
    }

    if (requireStatsInterval && !this._statsInterval) {
      this.setupStatsInterval()
    } else if (!requireStatsInterval && this._statsInterval) {
      this.clearStatsInterval()
    }
  }

  getMarketsPrices() {
    return this.marketsPrices
  }

  async fetchProducts() {
    store.dispatch('app/showNotice', {
      id: 'fetch-products',
      type: 'info',
      title: `Fetching the latest products...`
    })

    for (const exchangeId in exchanges) {
      try {
        await exchanges[exchangeId].fetchProducts()
      } catch (error) {
        store.dispatch('app/showNotice', {
          type: 'error',
          title: `Failed to retrieve ${exchangeId}'s products`
        })
      }
    }

    const count = Array.prototype.concat(...Object.values(store.state.app.indexedProducts)).length

    store.dispatch('app/showNotice', {
      id: 'fetch-products',
      type: 'success',
      title: `${count} markets indexed 🔥`
    })
  }

  determineOptimalDecimal() {
    const _optimalDecimalLookupInterval: number = window.setInterval(() => {
      const prices = Object.values(this.marketsPrices)

      if (prices.length > store.state.app.activeMarkets.length / 2) {
        const optimalDecimal = Math.ceil(prices.map(price => countDecimals(price)).reduce((a, b) => a + b, 0) / prices.length)

        store.dispatch('app/showNotice', {
          type: 'info',
          title: `Precision set to ${optimalDecimal}`,
          timeout: 5000
        })

        store.commit('app/SET_OPTIMAL_DECIMAL', optimalDecimal)

        clearInterval(_optimalDecimalLookupInterval)
      }
    }, 3333)
  }
}

export default new Aggregator()
