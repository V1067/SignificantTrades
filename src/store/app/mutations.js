import Vue from 'vue'

export default {
  SET_EXCHANGE_MATCH(state, payload) {
    Vue.set(state.exchanges[payload.exchange], 'match', payload.match)
  },
  EXCHANGE_UPDATED(state, { exchange, active }) {
    if (!this.state.settings.exchanges[exchange]) {
      Vue.set(this.state.settings.exchanges, exchange, {})
    }

    Vue.set(state.activeExchanges, exchange, active)
  },
  TOGGLE_LOADING(state, value) {
    state.isLoading = value ? true : false
  },
  CREATE_NOTICE(state, notice) {
    state.notices.push(notice)
  },
  UPDATE_NOTICE(state, { index, notice }) {
    Vue.set(state.notices, index, notice)
  },
  REMOVE_NOTICE(state, notice) {
    const index = state.notices.indexOf(notice)

    if (index !== -1) {
      state.notices.splice(index, 1)
    }
  },
  TOGGLE_SEARCH(state, value) {
    state.showSearch = value ? true : false
  },
  SET_OPTIMAL_DECIMAL(state, value) {
    state.optimalDecimal = value
  },
  SET_API_URL(state, value) {
    state.apiUrl = value
  },
  SET_PROXY_URL(state, value) {
    state.proxyUrl = value
  },
  SET_API_SUPPORTED_PAIRS(state, value) {
    if (!value) {
      state.apiSupportedPairs = []
    } else if (typeof value === 'string') {
      state.apiSupportedPairs = value.split(',').map(a => a.trim())
    } else {
      state.apiSupportedPairs = value
    }
  },
  SET_VERSION(state, value) {
    state.version = value
  },
  SET_BUILD_DATE(state, value) {
    state.buildDate = value
  },
  ENABLE_SERIE(state, id) {
    const index = state.activeSeries.indexOf(id)

    if (index === -1) {
      state.activeSeries.push(id)
    }
  },
  DISABLE_SERIE(state, id) {
    const index = state.activeSeries.indexOf(id)

    if (index !== -1) {
      state.activeSeries.splice(index, 1)
    }

    if (state.activeSeriesErrors[id]) {
      Vue.delete(state.activeSeriesErrors, id)
    }
  },
  SET_SERIE_ERROR(state, { id, error }) {
    if (error) {
      Vue.set(state.activeSeriesErrors, id, error)
    } else {
      Vue.set(state.activeSeriesErrors, id, null)
    }
  },
  INDEX_PRODUCTS(state, { pairs, exchange }) {
    for (let pair of pairs) {
      if (state.indexedProducts[pair]) {
        state.indexedProducts[pair].count++

        if (state.indexedProducts[pair].exchanges.indexOf(exchange) === -1) {
          state.indexedProducts[pair].exchanges.push(exchange)
        }
      } else {
        state.indexedProducts[pair] = {
          value: pair,
          count: 1,
          exchanges: [exchange]
        }
      }
    }
  }
}
