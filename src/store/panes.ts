import aggregatorService from '@/services/aggregatorService'
import { capitalizeFirstLetter, slugify, uniqueName } from '@/utils/helpers'
import { preparePaneSettings } from '@/utils/store'
import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree } from 'vuex'
import { AppModule } from '.'
import panesSettings from './panesSettings'

export type PaneType = 'trades' | 'chart' | 'stats' | 'counters'
export type MarketsListeners = { [market: string]: number }

export interface GridItem {
  x: number
  y: number
  w: number
  h: number
  i: string
  type: PaneType
}

export interface Pane {
  type: PaneType
  id: string
  name: string
  markets?: string[]
}

export interface PanesState {
  layout?: GridItem[]
  panes: { [paneId: string]: Pane }
  marketsListeners: MarketsListeners
}

const getters = {
  getNextGridItemCooordinates: state => {
    let x = -1
    let y = 0

    for (const gridItem of state.layout.slice().sort((a, b) => a.x + a.y * 2 - (b.x + b.y * 2))) {
      if (gridItem.x + gridItem.y * 2 - (x + y * 2) > 1) {
        break
      }

      x = gridItem.x
      y = gridItem.y
    }

    const baseIndex = x + y * 2 + 1

    x = baseIndex % 8
    y = Math.floor(baseIndex / 8)

    return { x, y }
  }
} as GetterTree<PanesState, PanesState>

const state = {
  _id: 'panes',
  layout: [
    { x: 0, y: 0, w: 9, h: 12, i: 'pane-chart-1', type: 'chart' },
    { x: 9, y: 0, w: 3, h: 3, i: 'pane-stats-1', type: 'stats' },
    { x: 9, y: 3, w: 3, h: 9, i: 'pane-trades-1', type: 'trades' }
  ],
  panes: {
    'pane-chart-1': {
      id: 'pane-chart-1',
      name: 'Pane chart 1',
      type: 'chart',
      markets: ['COINBASE:BTC-USD']
    },
    'pane-stats-1': {
      id: 'pane-stats-1',
      name: 'Pane stats 1',
      type: 'stats'
    },
    'pane-trades-1': {
      id: 'pane-trades-1',
      name: 'Pane trades 1',
      type: 'trades',
      markets: [
        'BITMEX:XBTUSD',
        'BINANCE:btcusdt',
        'BITSTAMP:btcusd',
        'BITFINEX:BTCUSD',
        'BINANCE_FUTURES:btcusdt',
        'COINBASE:BTC-USD',
        'POLONIEX:USDT_BTC',
        'KRAKEN:XBT/USD',
        'OKEX:BTC-USDT',
        'DERIBIT:BTC-PERPETUAL',
        'HUOBI:btcusdt',
        'HUOBI:BTC-USD',
        'HITBTC:BTCUSD',
        'FTX:BTC-PERP',
        'BYBIT:BTCUSD',
        'BITFINEX:BTCF0:USTF0',
        'OKEX:BTC-USD-SWAP'
      ]
    }
  },
  marketsListeners: {}
} as PanesState

const actions = {
  async addPane({ commit, dispatch, state }, type: PaneType) {
    if (!panesSettings[type]) {
      this.dispatch('app/showNotice', {
        title: 'Unrecognized pane type "' + type + '"',
        type: 'error'
      })
    }

    const name = `${capitalizeFirstLetter(type)}'s pane`

    const id = uniqueName(slugify(name), Object.keys(state.panes))

    const pane: Pane = {
      id,
      name,
      type,
      markets: []
    }

    if (type === 'chart' || type === 'trades') {
      pane.markets = Object.keys(state.marketsListeners)
    }

    const module = preparePaneSettings(id, panesSettings[type]) as AppModule<any>

    this.registerModule(id, module)

    if (typeof module.boot === 'function') {
      await module.boot(this, module.state)
    }

    commit('ADD_PANE', pane)
    dispatch('appendPaneGridItem', { id: pane.id, type: pane.type })
  },
  removePane({ commit, state, dispatch }, id: string) {
    const item = state.panes[id]

    if (!item) {
      return
    }

    dispatch('removePaneGridItems', id)
    commit('REMOVE_PANE', id)
    dispatch('refreshMarketsListeners')

    setTimeout(() => {
      this.unregisterModule(id)

      localStorage.removeItem(id)
    })
  },
  appendPaneGridItem({ commit, getters }, { id, type }: { id: string; type: PaneType }) {
    const { x, y } = getters.getNextGridItemCooordinates

    const gridItem: GridItem = {
      i: id,
      x,
      y,
      w: 1,
      h: 1,
      type
    }

    commit('ADD_GRID_ITEM', gridItem)
  },
  removePaneGridItems({ commit, state }, id: string) {
    const gridItem = state.layout.find(gridItem => gridItem.i === id)

    if (gridItem) {
      const index = state.layout.indexOf(gridItem)
      commit('REMOVE_GRID_ITEM', index)
    }
  },
  refreshMarketsListeners({ commit, state }, submitChanges = true) {
    const marketsListeners = {}

    for (const id in state.panes) {
      const markets = state.panes[id].markets

      if (!markets) {
        continue
      }

      for (const market of markets) {
        if (typeof marketsListeners[market] === 'undefined') {
          marketsListeners[market] = 0
        }

        marketsListeners[market]++
      }
    }

    if (submitChanges) {
      const allUniqueMarkets = Object.keys(marketsListeners)
        .concat(Object.keys(state.marketsListeners))
        .filter((v, i, a) => a.indexOf(v) === i)

      for (const market of allUniqueMarkets) {
        if (!state.marketsListeners[market] && marketsListeners[market]) {
          aggregatorService.connect([market])
        } else if (state.marketsListeners[market] && !marketsListeners[market]) {
          aggregatorService.disconnect([market])
        }
      }
    }

    commit('SET_MARKETS_LISTENERS', marketsListeners)
  },
  setMarketsForAll({ commit, state, dispatch }, markets: string[]) {
    for (const id in state.panes) {
      commit('SET_PANE_MARKETS', { id, markets })
    }

    dispatch('refreshMarketsListeners')
  },
  setMarketsForPane({ commit, dispatch }, { id, markets }: { id: string; markets: string[] }) {
    commit('SET_PANE_MARKETS', { id, markets })

    dispatch('refreshMarketsListeners')
  }
} as ActionTree<PanesState, PanesState>

const mutations = {
  ADD_PANE: (state, pane: Pane) => {
    Vue.set(state.panes, pane.id, pane)
  },
  REMOVE_PANE: (state, id: string) => {
    Vue.delete(state.panes, id)
  },
  ADD_GRID_ITEM: (state, gridItem: GridItem) => {
    state.layout.push(gridItem)
  },
  REMOVE_GRID_ITEM: (state, index: number) => {
    state.layout.splice(index, 1)
  },
  UPDATE_LAYOUT: (state, layout: GridItem[]) => {
    state.layout = layout
  },
  SET_MARKETS_LISTENERS: (state, marketsListeners: MarketsListeners) => {
    state.marketsListeners = marketsListeners
  },
  SET_PANE_MARKETS: (state, { id, markets }: { id: string; markets: string[] }) => {
    state.panes[id].markets = markets
  },
  SET_PANE_NAME: (state, { id, name }: { id: string; name: string }) => {
    state.panes[id].name = name
  }
} as MutationTree<PanesState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
  async boot(store) {
    store.dispatch('panes/refreshMarketsListeners', false)
  }
} as AppModule<PanesState>
