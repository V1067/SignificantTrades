import Vue from 'vue'
import exchanges, { getExchangeById } from '@/exchanges'
import { ActionTree, MutationTree } from 'vuex'
import { AppModule, ModulesState } from '.'

export interface ExchangeSettings {
  threshold?: number
  disabled?: boolean
  hidden?: boolean
}

export type ExchangesState = { [exchangeId: string]: ExchangeSettings } & { _id: string }

const state = exchanges.reduce((exchangesState: ExchangesState, exchange: any) => {
  exchangesState[exchange.id] = {}

  return exchangesState
}, {} as any) as ExchangesState

state._id = 'exchanges'

const actions = {
  async toggleExchange({ commit, state }, id: string) {
    commit('TOGGLE_EXCHANGE', id)

    const exchange = getExchangeById(id)

    if (state[id].disabled) {
      await exchange.unlinkAll()
    } else {
      const exchangeRegex = new RegExp(`^${id}:`, 'i')
      const state = (this.state as unknown) as ModulesState

      await exchange.linkAll(Object.keys(state.panes.marketsListeners).filter(p => exchangeRegex.test(p)))
    }

    this.commit('app/EXCHANGE_UPDATED', id)
  },
  toggleExchangeVisibility({ commit }, id: string) {
    commit('TOGGLE_EXCHANGE_VISIBILITY', id)

    this.commit('app/EXCHANGE_UPDATED', id)
  },
  setExchangeThreshold({ commit }, payload: { id: string; threshold: number }) {
    commit('SET_EXCHANGE_THRESHOLD', payload)

    this.commit('app/EXCHANGE_UPDATED', payload.id)
  }
} as ActionTree<ExchangesState, ExchangesState>

const mutations = {
  TOGGLE_EXCHANGE: (state, id: string) => {
    const enabled = state[id].disabled === false
    Vue.set(state[id], 'disabled', enabled)
  },
  TOGGLE_EXCHANGE_VISIBILITY: (state, id: string) => {
    const visible = state[id].hidden === false
    Vue.set(state[id], 'hidden', visible)
  },
  SET_EXCHANGE_THRESHOLD: (state, { id, threshold }: { id: string; threshold: number }) => {
    Vue.set(state[id], 'threshold', +threshold)
  }
} as MutationTree<ExchangesState>

export default {
  namespaced: true,
  state,
  actions,
  mutations
} as AppModule<ExchangesState>
