import EventEmitter from 'eventemitter3'

import store from '../store'

import { getHms, randomString } from '../utils/helpers'

interface Api extends WebSocket {
  _id: string
  _pairs: string[]
  _timestamp: number
}

abstract class Exchange extends EventEmitter {
  public id: string

  public pairs: string[] = []

  public products: string[] = null

  protected endpoints: { [id: string]: string | string[] }

  protected apis: Api[] = []

  private connecting: { [url: string]: { promise?: Promise<void>; resolver?: (success: boolean) => void } } = {}

  private disconnecting: { [url: string]: { promise?: Promise<void>; resolver?: (success: boolean) => void } } = {}

  private reconnectionDelay: { [apiUrl: string]: number } = {}

  private _keepAliveIntervals: { [url: string]: number } = {}

  public loading = false

  constructor() {
    super()
  }

  /**
   * Fire when a new websocket connection received something
   */
  abstract onMessage(event, api): boolean

  /**
   * Get exchange ws url
   */
  abstract getUrl(pair?: string): string

  /**
   * Fire when a new websocket connection is created
   * @param {WebSocket} api WebSocket instance
   */
  onApiBinded?(api: Api)

  /**
   * Fire when a new websocket connection has been removed
   * @param {WebSocket} api WebSocket instance
   */
  onApiUnbinded?(api: Api)

  /**
   * Get exchange equivalent for a given pair
   * @param {string} pair
   */
  isMatching(pair) {
    if (!this.products || !this.products.length) {
      console.debug(`[${this.id}] couldn't match ${pair}, exchange has no products`)
      return false
    }

    if (this.products.indexOf(pair) === -1) {
      console.debug(`[${this.id}] couldn't match ${pair}`)
      return false
    }

    return true
  }

  /**
   * Link exchange to a pair
   * @param {*} pair
   * @returns {Promise<WebSocket>}
   */
  async link(pair) {
    pair = pair.replace(/[^:]*:/, '')

    if (!this.isMatching(pair)) {
      return Promise.reject(`${this.id} couldn't match with ${pair}`)
    }

    if (this.pairs.indexOf(pair) !== -1) {
      return Promise.reject(`${this.id} already connected to ${pair}`)
    }

    this.pairs.push(pair)

    store.commit('app/ADD_ACTIVE_MARKET', {
      exchange: this.id,
      pair
    })

    console.debug(`[${this.id}] linking ${pair}`)

    const api = await this.bindApi(pair)

    await this.subscribe(api, pair)

    return api
  }

  /**
   * Unlink a pair
   * @param {string} pair
   * @returns {Promise<void>}
   */
  unlink(pair) {
    pair = pair.replace(/.*:/, '')

    const api = this.getActiveApiByPair(pair)

    if (this.pairs.indexOf(pair) === -1) {
      return Promise.resolve()
    }

    if (!api) {
      return Promise.reject(new Error(`couldn't find active api for pair ${pair} in exchange ${this.id}`))
    }

    console.debug(`[${this.id}] unlinking ${pair}`)

    // call exchange specific unsubscribe function
    this.unsubscribe(api, pair)

    this.pairs.splice(this.pairs.indexOf(pair), 1)

    store.commit('app/REMOVE_ACTIVE_MARKET', {
      exchange: this.id,
      pair
    })

    if (!api._pairs.length) {
      return this.unbindApi(api)
    } else {
      return Promise.resolve()
    }
  }

  /**
   * Get active websocket api by pair
   * @param {string} pair
   * @returns {WebSocket}
   */
  getActiveApiByPair(pair) {
    const url = this.getUrl(pair)

    for (let i = 0; i < this.apis.length; i++) {
      if (this.apis[i].url.replace(/\/$/, '') === url.replace(/\/$/, '')) {
        return this.apis[i]
      }
    }
  }

  /**
   * Create or attach a pair subscription to active websocket api
   * @param {*} pair
   * @returns {Promise<WebSocket>}
   */
  bindApi(pair) {
    let api = this.getActiveApiByPair(pair)

    let toResolve

    if (!api) {
      const url = this.getUrl(pair)

      api = new WebSocket(url) as Api
      api._id = randomString()

      console.debug(`[${this.id}] initiate new ws connection ${url} (${api._id}) for pair ${pair}`)

      api.binaryType = 'arraybuffer'

      api._pairs = []

      this.apis.push(api)

      api.onmessage = event => {
        if (this.onMessage(event, api) === true) {
          api._timestamp = +new Date()
        }
      }

      api.onopen = event => {
        if (typeof this.reconnectionDelay[url] !== 'undefined') {
          console.debug(`[${this.id}] clear reconnection delay (${url})`)
          delete this.reconnectionDelay[url]
        }

        this.markLoadingAsCompleted(this.connecting, url, true)

        this.onOpen(event, api._pairs)
      }

      api.onclose = event => {
        this.markLoadingAsCompleted(this.connecting, url, false)

        this.onClose(event, api._pairs)

        this.markLoadingAsCompleted(this.disconnecting, url, true)

        if (api._pairs.length) {
          const pairsToReconnect = api._pairs.slice(0, api._pairs.length)

          console.log(`[${this.id}] connection closed unexpectedly, schedule reconnection (${pairsToReconnect.join(',')})`)

          Promise.all(api._pairs.map(pair => this.unlink(pair))).then(() => {
            const delay = this.reconnectionDelay[api.url] || 0

            setTimeout(() => {
              this.reconnectPairs(pairsToReconnect)
            }, delay)

            this.reconnectionDelay[api.url] = Math.min(1000 * 30, (delay || 1000) * 1.5)
            console.debug(`[${this.id}] increment reconnection delay (${url}) = ${getHms(this.reconnectionDelay[api.url])}`)
          })
        }
      }

      api.onerror = event => {
        this.onError(event, api._pairs)
      }

      this.connecting[url] = {}

      toResolve = new Promise((resolve, reject) => {
        this.connecting[url].resolver = success => (success ? resolve(api) : reject())
      })

      this.connecting[url].promise = toResolve

      if (typeof this.onApiBinded !== 'undefined') {
        this.onApiBinded(api)
      }
    } else {
      if (this.connecting[api.url]) {
        console.debug(`[${this.id}] attach ${pair} to connecting api ${api.url}`)
        toResolve = this.connecting[api.url].promise
      } else {
        console.debug(`[${this.id}] attach ${pair} to connected api ${api.url}`)
        toResolve = Promise.resolve(api)
      }
    }

    return toResolve
  }

  /**
   * Close websocket api
   * @param {WebSocket} api
   * @returns {Promise<void>}
   */
  unbindApi(api): Promise<void> {
    console.debug(`[${this.id}] unbind api ${api.url}`)

    if (api._pairs.length) {
      throw new Error(`cannot unbind api that still has pairs linked to it`)
    }

    let promiseOfClose: Promise<void>

    if (api.readyState !== WebSocket.CLOSED) {
      this.disconnecting[api.url] = {}

      promiseOfClose = new Promise((resolve, reject) => {
        if (api.readyState < WebSocket.CLOSING) {
          api.close()
        }

        this.disconnecting[api.url].resolver = success => (success ? resolve() : reject())
      })

      this.disconnecting[api.url].promise = promiseOfClose
    } else {
      promiseOfClose = Promise.resolve()
    }

    return promiseOfClose.then(() => {
      console.debug(`[${this.id}] splice api ${api.url} from exchange`)

      if (typeof this.onApiUnbinded !== 'undefined') {
        this.onApiUnbinded(api)
      }

      this.apis.splice(this.apis.indexOf(api), 1)
    })
  }

  /**
   * Reconnect api
   * @param {WebSocket} api
   */
  reconnectApi(api) {
    console.debug(`[${this.id}] reconnect api (url: ${api.url}, apiPairs: ${api._pairs.join(', ')})`)

    this.reconnectPairs(api._pairs)
  }

  /**
   * Reconnect pairs
   * @param {string[]} pairs (local)
   * @returns {Promise<any>}
   */
  reconnectPairs(pairs) {
    const pairsToReconnect = pairs.slice(0, pairs.length)

    console.debug(`[${this.id}] reconnect pairs ${pairsToReconnect.join(',')}`)

    Promise.all(pairsToReconnect.map(pair => this.unlink(pair))).then(() => {
      return Promise.all(pairsToReconnect.map(pair => this.link(pair)))
    })
  }

  /**
   * Get exchange products and save them
   * @returns {Promise<void>}
   */
  fetchProducts(forceRenew = false): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.endpoints || !this.endpoints.PRODUCTS) {
        if (!this.products) {
          this.products = []
        }

        return resolve()
      }

      if (forceRenew) {
        this.products = null
      } else if (!this.products) {
        this.getStoredProducts()
      }

      if (this.products !== null) {
        console.log(`[${this.id}] recovered saved products`)
        return resolve()
      }

      let urls = this.endpoints.PRODUCTS as string[]

      if (!Array.isArray(urls)) {
        urls = [urls]
      }

      console.log(`[${this.id}] fetching new products...`, urls)

      Promise.all(
        urls.map((action: any) => {
          action = action.split('|')

          const method = action.length > 1 ? action.shift() : 'GET'
          let url = action[0]

          if (store.state.app.proxyUrl) {
            url = store.state.app.proxyUrl + url
          }

          return new Promise(resolve => {
            setTimeout(() => {
              resolve(
                fetch(url, {
                  method: method
                })
                  .then(response => response.json())
                  .catch(err => {
                    console.error(`[${this.id}] couldn't parse non-json products`, err)

                    return null
                  })
              )
            }, 500)
          })
        })
      ).then((data: any[]) => {
        console.log(`[${this.id}] received API products response => format products`)

        if (data.indexOf(null) !== -1) {
          data = null
        } else if (data.length === 1) {
          data = data[0]
        }

        if (data) {
          const formatedProducts = this.formatProducts(data) || []

          if (typeof formatedProducts === 'object' && Object.prototype.hasOwnProperty.call(formatedProducts, 'products')) {
            for (const key in formatedProducts) {
              this[key] = formatedProducts[key]
            }
          } else {
            this.products = formatedProducts
          }

          console.debug(`[${this.id}] saving products`)

          localStorage.setItem(
            this.id,
            JSON.stringify({
              timestamp: +new Date(),
              data: formatedProducts
            })
          )
        } else {
          this.products = null
        }

        resolve()
      })
    }).then(() => {
      this.indexProducts()
    })
  }

  getStoredProducts() {
    try {
      const storage = JSON.parse(localStorage.getItem(this.id))

      if (storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7 && (this.id !== 'okex' || storage.timestamp > 1560235687982)) {
        if (storage.data && typeof storage.data === 'object' && Object.prototype.hasOwnProperty.call(storage.data, 'products')) {
          for (const key in storage.data) {
            this[key] = storage.data[key]
          }
        } else {
          this.products = storage.data
        }

        if (
          !this.products ||
          (Array.isArray(this.products) && !this.products.length) ||
          (typeof this.products === 'object' && !Object.keys(this.products).length)
        ) {
          this.products = null
        }
      } else {
        console.info(`[${this.id}] products data expired`)
      }
    } catch (error) {
      console.error(`[${this.id}] unable to retrieve stored products`, error)
    }
  }

  indexProducts() {
    let products = []

    if (this.products) {
      if (Array.isArray(this.products)) {
        products = this.products.slice(0, this.products.length)
      } else if (typeof this.products === 'object') {
        products = Object.keys(this.products)
      }
    }

    store.commit('app/INDEX_EXCHANGE_PRODUCTS', {
      exchange: this.id,
      products
    })
  }

  /**
   * Fire when a new websocket connection opened
   * @param {Event} event
   * @param {string[]} pairs pairs attached to ws at opening
   */
  onOpen(event, pairs) {
    console.debug(`[${this.id}] ${pairs.join(',')}'s api connected`)

    this.emit('open', event)
  }

  /**
   * Fire when a new websocket connection reported an error
   * @param {Event} event
   * @param {string[]} pairs
   */
  onError(event, pairs) {
    console.debug(`[${this.id}] ${pairs.join(',')}'s api errored`, event)
    this.emit('err', event)
  }

  /**
   * Fire when a new websocket connection closed
   * @param {Event} event
   * @param {string[]} pairs
   */
  onClose(event, pairs) {
    console.debug(`[${this.id}] ${pairs.join(',')}'s api closed`)
    this.emit('close', event)
  }

  /**
   *
   * @param {any} data products from HTTP response
   */
  formatProducts(data) {
    return data
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async subscribe(api, pair): Promise<unknown> {
    const index = api._pairs.indexOf(pair)

    if (index !== -1) {
      return
    }

    api._pairs.push(pair)

    this.emit('subscribed', pair, api._id)
  }

  /**
   * Unsub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair): Promise<unknown> {
    const index = api._pairs.indexOf(pair)

    if (index === -1) {
      return
    }

    api._pairs.splice(index, 1)

    this.emit('unsubscribed', pair, api._id)
  }

  /**
   * Emit trade to server
   * @param {string} source api id
   * @param {Trade[]} trades
   */
  emitTrades(source, trades) {
    if (!trades || !trades.length) {
      return
    }

    this.emit('trades', trades)

    return true
  }

  /**
   * Emit liquidations to server
   * @param {string} source api id
   * @param {Trade[]} trades
   */
  emitLiquidations(source, trades) {
    if (!trades || !trades.length) {
      return
    }

    this.emit('liquidations', trades)

    return true
  }

  startKeepAlive(api, payload: any = { event: 'ping' }, every = 30000) {
    if (this._keepAliveIntervals[api._id]) {
      this.stopKeepAlive(api)
    }

    console.debug(`[${this.id}] setup keepalive for ws ${api._id}`)

    this._keepAliveIntervals[api._id] = setInterval(() => {
      if (api.readyState === WebSocket.OPEN) {
        api.send(JSON.stringify(payload))
      }
    }, every)
  }

  stopKeepAlive(api) {
    if (!this._keepAliveIntervals[api._id]) {
      return
    }

    console.debug(`[${this.id}] stop keepalive for ws ${api._id}`)

    clearInterval(this._keepAliveIntervals[api._id])
    delete this._keepAliveIntervals[api._id]
  }

  refreshProducts() {
    localStorage.removeItem(this.id)
    this.products = null

    return this.fetchProducts()
  }

  markLoadingAsCompleted(type: { [url: string]: { promise?: Promise<any>; resolver?: (success: boolean) => void } }, url: string, success: boolean) {
    if (type[url]) {
      type[url].resolver(success)
      delete type[url]
    }

    Object.keys(this.disconnecting).length > 0 || Object.keys(this.connecting).length > 0
  }

  linkAll(pairs: string[]) {
    if (!pairs.length) {
      return Promise.resolve()
    }

    console.log(`[${this.id}] connecting to ${pairs.join(', ')}`)

    const promises: Promise<void>[] = []

    for (const pair of pairs) {
      promises.push(this.link(pair))
    }

    return Promise.all(promises)
  }

  unlinkAll(pairs?: string[], autoPairsOnEmpty = true) {
    if (!pairs || !pairs.length) {
      pairs = []

      if (autoPairsOnEmpty) {
        pairs = this.pairs.slice()
      }
    }

    if (!pairs.length) {
      return Promise.resolve()
    }

    console.log(`[${this.id}] disconnecting from ${pairs.join(', ')}`)

    const promises: Promise<void>[] = []

    for (const pair of pairs) {
      promises.push(this.unlink(pair))
    }

    return Promise.all(promises)
  }
}

export default Exchange
