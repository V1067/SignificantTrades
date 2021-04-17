import aggregatorService from '@/services/aggregatorService'
import { getProducts } from '@/services/productsService'
import Vue from 'vue'
import { ActionTree, GetterTree, MutationTree } from 'vuex'
import { AppModule, ModulesState } from '.'

export interface ExchangeSettings {
  disabled?: boolean
  hidden?: boolean
}

export type ExchangesState = { [exchangeId: string]: ExchangeSettings } & { _id: string; _exchanges: string[] }

const state = [
  'BITMEX',
  'BINANCE_FUTURES',
  'KRAKEN',
  'HUOBI',
  'BINANCE',
  'BITFINEX',
  'BITSTAMP',
  'COINBASE',
  'HITBTC',
  'OKEX',
  'POLONIEX',
  'DERIBIT',
  'BYBIT',
  'FTX'
].reduce(
  (exchangesState: ExchangesState, id: string) => {
    exchangesState[id] = {}

    if (id === 'HITBTC') {
      exchangesState[id].disabled = true
    }

    return exchangesState
  },
  {
    _exchanges: []
  } as any
) as ExchangesState

state._id = 'exchanges'

const getters = {
  getExchanges: state => Object.keys(state).filter(id => !/^_/.test(id))
} as GetterTree<ExchangesState, ModulesState>

const actions = {
  async toggleExchange({ commit, state, dispatch }, id: string) {
    commit('TOGGLE_EXCHANGE', id)

    if (state[id].disabled) {
      dispatch('disconnect', id)
    } else {
      dispatch('connect', id)
    }

    this.commit('app/EXCHANGE_UPDATED', id)
  },
  async disconnect({ rootState }, id: string) {
    const exchangeRegex = new RegExp(`^${id}:`, 'i')
    const markets = Object.keys(rootState.panes.marketsListeners).filter(p => exchangeRegex.test(p))

    console.log(`[exchanges.${id}] manually disconnecting ${markets.join(', ')}`)

    aggregatorService.disconnect(markets)
  },
  async connect({ rootState }, id: string) {
    const exchangeRegex = new RegExp(`^${id}:`, 'i')
    const markets = Object.keys(rootState.panes.marketsListeners).filter(p => exchangeRegex.test(p))

    console.log(`[exchanges.${id}] manually connecting ${markets.join(', ')}`)

    aggregatorService.connect(markets)
  },
  toggleExchangeVisibility({ commit }, id: string) {
    commit('TOGGLE_EXCHANGE_VISIBILITY', id)

    this.commit('app/EXCHANGE_UPDATED', id)
  }
} as ActionTree<ExchangesState, ModulesState>

const mutations = {
  TOGGLE_EXCHANGE: (state, id: string) => {
    const enabled = state[id].disabled === false
    Vue.set(state[id], 'disabled', enabled)
  },
  TOGGLE_EXCHANGE_VISIBILITY: (state, id: string) => {
    const visible = state[id].hidden === false
    Vue.set(state[id], 'hidden', visible)
  }
} as MutationTree<ExchangesState>

export default {
  namespaced: true,
  getters,
  boot: (store, state: ExchangesState) => {
    state._exchanges.splice(0, state._exchanges.length)

    for (const id of store.getters['exchanges/getExchanges']) {
      state._exchanges.push(id)
      store.commit('app/EXCHANGE_UPDATED', id)
    }

    aggregatorService.on('products', async ({ exchange, endpoints }: { exchange: string; endpoints: string[] }, trackingId: string) => {
      const productsData = await getProducts(exchange, endpoints)

      aggregatorService.dispatch({
        op: 'products',
        data: {
          exchange,
          data: productsData
        },
        trackingId
      })
    })
  },
  state,
  actions,
  mutations
} as AppModule<ExchangesState, ModulesState>
