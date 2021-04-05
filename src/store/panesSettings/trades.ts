import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'

import Vue from 'vue'
import { randomString } from '@/utils/helpers'

export interface Threshold {
  id: string
  amount: number
  buyColor: string
  sellColor: string
  gif?: string
}

export interface TradesPaneState {
  _id?: string
  thresholds: Threshold[]
  showThresholdsAsTable: boolean
  maxRows: number
  showLogos: boolean
  showTradesPairs: boolean
  liquidationsOnly: boolean
}

const getters = {} as GetterTree<TradesPaneState, TradesPaneState>

const state = {
  thresholds: [
    { id: 'threshold', amount: 250000, buyColor: 'rgba(76,175,80,.33)', sellColor: 'rgba(229,115,115,.33)' },
    { id: 'significant', amount: 500000, buyColor: 'rgb(91,130,48)', sellColor: 'rgb(224,91,82)' },
    { id: 'huge', amount: 1000000, gif: 'cash', buyColor: 'rgb(156,204,101)', sellColor: 'rgb(244,67,54)' },
    { id: 'rare', amount: 10000000, gif: 'explosion', buyColor: 'rgb(255,160,0)', sellColor: 'rgb(233,30,99)' }
  ],
  showThresholdsAsTable: true,
  maxRows: 100,
  showTradesPairs: false,
  liquidationsOnly: false,
  showLogos: true
} as TradesPaneState

const actions = {} as ActionTree<TradesPaneState, TradesPaneState>

const mutations = {
  TOGGLE_TRADES_PAIRS(state) {
    state.showTradesPairs = !state.showTradesPairs
  },
  SET_MAX_ROWS(state, value) {
    state.maxRows = value
  },
  TOGGLE_LOGOS(state, value) {
    state.showLogos = value ? true : false
  },
  TOGGLE_LIQUIDATIONS_ONLY(state) {
    state.liquidationsOnly = !state.liquidationsOnly
  },
  TOGGLE_THRESHOLDS_TABLE(state, value) {
    state.showThresholdsAsTable = value ? true : false
  },
  SET_THRESHOLD_AMOUNT(state, payload) {
    const threshold = state.thresholds[payload.index]

    if (threshold) {
      if (typeof payload.value === 'string' && /m|k$/i.test(payload.value)) {
        if (/m$/i.test(payload.value)) {
          threshold.amount = parseFloat(payload.value) * 1000000
        } else {
          threshold.amount = parseFloat(payload.value) * 1000
        }
      }
      threshold.amount = +payload.value

      Vue.set(state.thresholds, payload.index, threshold)
    }
  },
  SET_THRESHOLD_GIF(state, payload) {
    const threshold = state.thresholds[payload.index]

    if (threshold) {
      if (payload.value.trim().length) {
        threshold.gif = payload.value
      } else {
        payload.value = threshold.gif
        payload.isDeleted = true

        threshold.gif = null
      }

      Vue.set(state.thresholds, payload.index, threshold)
    }
  },
  SET_THRESHOLD_COLOR(state, payload) {
    const threshold = state.thresholds[payload.index]

    if (threshold) {
      threshold[payload.side] = payload.value

      Vue.set(state.thresholds, payload.index, threshold)
    }
  },
  ADD_THRESHOLD(state) {
    state.thresholds.push({
      id: randomString(8),
      amount: state.thresholds[state.thresholds.length - 1].amount * 2,
      buyColor: 'rgb(0, 255, 0)',
      sellColor: 'rgb(255, 0, 0)'
    })
  },
  DELETE_THRESHOLD(state, index) {
    state.thresholds.splice(index, 1)
  }
} as MutationTree<TradesPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<TradesPaneState, TradesPaneState>
