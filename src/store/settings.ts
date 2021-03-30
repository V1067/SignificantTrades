import { getSerieSettings, randomString, slugify, uniqueName } from '@/utils/helpers'
import Vue from 'vue'
import { ActionTree, MutationTree } from 'vuex'

import DEFAULTS_STATE from './defaultSettings.json'
import { getColorLuminance, splitRgba } from '@/utils/colors'
import { AppModule } from '.'
import { SeriesOptions, SeriesType } from 'lightweight-charts'
import { normalizeSymbol } from '@/utils/store'
import aggregatorService from '@/services/aggregatorService'
import dialogService from '@/services/dialogService'
import StatDialog from '@/components/stats/StatDialog.vue'

export type SlippageMode = false | 'price' | 'bps'
export interface Threshold {
  id: string
  amount: number
  buyColor: string
  sellColor: string
  gif?: string
}
export interface StatCounter {
  id: string
  name: string
  output: string
  enabled: boolean
  window?: number
  precision?: number
  color?: string
  type?: string
}

export interface SerieSettings {
  id?: string
  name?: string
  type?: string
  description?: string
  input?: string
  enabled?: boolean
  options?: SeriesOptions<SeriesType>
}

export interface SettingsState {
  pairs?: string[]
  preferQuoteCurrencySize?: boolean
  thresholds?: Threshold[]
  series?: { [id: string]: SerieSettings }
  maxRows?: number
  showTradesPairs?: boolean
  aggregateTrades?: boolean
  decimalPrecision?: number
  calculateSlippage?: SlippageMode
  liquidationsOnly?: boolean
  showLogos?: boolean
  showChart?: boolean
  chartRefreshRate?: number
  chartTheme?: string
  chartBackgroundColor?: string
  chartColor?: string
  timezoneOffset?: number
  showExchangesBar?: boolean
  animateExchangesBar?: boolean
  timeframe?: number
  debug?: boolean
  useAudio?: boolean
  audioIncludeInsignificants?: boolean
  audioVolume?: number
  audioPitch?: number
  settings?: string[]
  chartHeight?: number
  sidebarWidth?: number
  recentColors?: string[]
  showThresholdsAsTable?: boolean
  showCounters?: boolean
  countersGranularity?: number
  countersSteps?: number[]
  countersCount?: boolean
  showStats?: boolean
  statsGranularity?: number
  statsWindow?: number
  statsChart?: boolean
  statsCounters?: { [id: string]: StatCounter }
  disableAnimations?: boolean
}

const state = Object.assign(
  {
    _id: 'settings'
  },
  DEFAULTS_STATE
) as SettingsState

const actions = {
  mergePairs({ state, dispatch }, pairs: string[]) {
    for (const pair of pairs) {
      const symbol = normalizeSymbol(pair)

      if (state.pairs.indexOf(symbol) === -1) {
        dispatch('addPair', symbol)
      }
    }

    for (const pair of state.pairs) {
      const symbol = normalizeSymbol(pair)

      if (pairs.indexOf(symbol) === -1) {
        dispatch('removePair', symbol)
      }
    }
  },
  addPair({ commit }, pair: string) {
    commit('ADD_PAIR', pair)
    aggregatorService.connect([pair])
  },
  removePair({ commit }, pair: string) {
    commit('REMOVE_PAIR', pair)
    aggregatorService.disconnect([pair])
  },
  createStat({ commit }) {
    const otherIds = Object.keys(state.statsCounters)
    const otherNames = otherIds.map(id => state.statsCounters[id].name)

    const name = uniqueName('COUNTER', otherNames)
    const id = uniqueName(slugify(name), otherIds)

    commit('CREATE_STAT', { id, name })

    dialogService.open(StatDialog, { id })
  },
  updateStat({ commit, state }, { id, prop, value }) {
    if (state.statsCounters[id][prop] === value) {
      return
    }

    let mutation = ''

    if (typeof value === 'boolean') {
      mutation += 'TOGGLE_STAT'
    } else {
      mutation += 'SET_STAT_' + prop.toUpperCase()
    }

    commit(mutation, {
      id,
      value
    })
  },
  renameStat({ commit, state }, { id, name }) {
    const otherIds = Object.keys(state.statsCounters).filter(_id => _id !== id)
    const otherNames = otherIds.map(id => state.statsCounters[id].name)

    const oldId = id

    name = uniqueName(name, otherNames)
    id = uniqueName(slugify(name), otherIds)

    commit('RENAME_STAT', {
      oldId,
      id,
      name
    })
  },
  createSerie({ commit, state }, serie) {
    const seriesIdMap = Object.keys(state.series)
    const id = uniqueName(slugify(serie.name), seriesIdMap)

    serie = {
      input: 'avg_close(bar)',
      type: 'line',
      ...serie,
      options: {
        priceScaleId: id,
        ...serie.options
      }
    }

    serie.id = id

    commit('CREATE_SERIE', serie)
    commit('TOGGLE_SERIE', id)

    return id
  },
  toggleSerie({ commit }, id) {
    commit('TOGGLE_SERIE', id)
  },
  toggleSerieVisibility({ commit, state }, id) {
    commit('SET_SERIE_OPTION', {
      id,
      key: 'visible',
      value: !state.series[id].options || typeof state.series[id].options.visible === 'undefined' ? false : !state.series[id].options.visible
    })
  },
  setSerieOption({ commit, state }, { id, key, value }) {
    try {
      value = JSON.parse(value)
    } catch (error) {
      // empty
    }

    if (key === 'scaleMargins') {
      const currentPriceScaleId = state.series[id].options.priceScaleId

      if (currentPriceScaleId) {
        for (const _id in state.series) {
          const serieOptions = getSerieSettings(_id).options
          if (id !== _id && serieOptions.priceScaleId === currentPriceScaleId) {
            this.dispatch('settings/setSerieOption', { id: _id, key, value })
          }
        }
      }
    }

    if (state.series[id] && state.series[id].options[key] === value) {
      return
    }

    commit('SET_SERIE_OPTION', { id, key, value })
  },
  removeSerie({ commit, state }, id): Promise<void> {
    if (state.series[id].enabled !== false) {
      commit('TOGGLE_SERIE', id)
    }

    return new Promise(resolve => {
      setTimeout(() => {
        commit('REMOVE_SERIE', id)
        resolve()
      }, 100)
    })
  },
  async renameSerie({ commit, state }, { id, name }) {
    const newId = uniqueName(slugify(name), Object.keys(state.series))

    const serieSource = getSerieSettings(id)

    const serie = { ...serieSource, name, id: newId, enabled: false }

    commit('CREATE_SERIE', serie)

    Vue.nextTick(() => {
      this.dispatch('settings/removeSerie', id)

      commit('TOGGLE_SERIE', newId)
    })

    return newId
  },
  addRecentColor({ commit, state }, newColor) {
    if (state.recentColors.includes(newColor)) {
      return
    }

    if (state.recentColors.length >= 16) {
      commit('TRIM_RECENT_COLORS')
    }

    commit('ADD_RECENT_COLOR', newColor)
  },
  setBackgroundColor({ commit, state }, rgb) {
    commit('SET_CHART_BACKGROUND_COLOR', rgb)

    const backgroundLuminance = getColorLuminance(splitRgba(rgb))
    const theme = backgroundLuminance > 175 ? 'light' : 'dark'

    if (theme !== state.chartTheme) {
      commit('SET_CHART_THEME', theme)
    }

    if (state.chartColor.length) {
      commit('SET_CHART_COLOR', '')
    }
  },
  setQuoteCurrencySizing({ commit }, sizeInQuote: boolean) {
    commit('SET_QUOTE_CURRENCY_SIZING', sizeInQuote)

    this.dispatch('app/refreshCurrencies')
  }
} as ActionTree<SettingsState, SettingsState>

const mutations = {
  ADD_PAIR(state, pair) {
    state.pairs.push(pair)
  },
  REMOVE_PAIR(state, pair) {
    const index = state.pairs.indexOf(pair)

    state.pairs.splice(index, 1)
  },
  SET_QUOTE_AS_PREFERED_CURRENCY(state, value) {
    state.preferQuoteCurrencySize = value ? true : false
  },
  TOGGLE_TRADES_PAIRS(state) {
    state.showTradesPairs = !state.showTradesPairs
  },
  SET_MAX_ROWS(state, value) {
    state.maxRows = value
  },
  TOGGLE_SLIPPAGE(state) {
    const values: SlippageMode[] = [false, 'bps', 'price']

    const index = Math.max(0, values.indexOf(state.calculateSlippage))

    state.calculateSlippage = values[(index + 1) % values.length]
  },
  TOGGLE_AGGREGATION(state, value) {
    state.aggregateTrades = value ? true : false
  },
  TOGGLE_LOGOS(state, value) {
    state.showLogos = value ? true : false
  },
  TOGGLE_LIQUIDATIONS_ONLY(state, value) {
    state.liquidationsOnly = value ? true : false
  },
  TOGGLE_COUNTERS(state, value) {
    state.showCounters = value ? true : false
  },
  TOGGLE_STATS(state, value) {
    state.showStats = value ? true : false
  },
  TOGGLE_STAT(state, { id, value }) {
    const stat = state.statsCounters[id]

    stat.enabled = value ? true : false

    Vue.set(state.statsCounters, id, stat)
  },
  SET_STAT_OUTPUT(state, { id, value }) {
    const stat = state.statsCounters[id]

    stat.output = value

    Vue.set(state.statsCounters, id, stat)
  },
  RENAME_STAT(state, { oldId, id, name }) {
    const stat = state.statsCounters[oldId]

    stat.name = name
    stat.id = id

    Vue.delete(state.statsCounters, oldId)
    Vue.set(state.statsCounters, id, stat)
  },
  SET_STAT_COLOR(state, { id, value }) {
    const stat = state.statsCounters[id]

    stat.color = value

    Vue.set(state.statsCounters, id, stat)
  },
  SET_STAT_PRECISION(state, { id, value }) {
    const stat = state.statsCounters[id]

    value = parseInt(value)

    stat.precision = !isNaN(value) ? value : null

    Vue.set(state.statsCounters, id, stat)
  },
  SET_STAT_WINDOW(state, { id, value }) {
    const stat = state.statsCounters[id]
    let milliseconds = parseInt(value)

    if (isNaN(milliseconds)) {
      stat.window = null
    } else {
      if (/[\d.]+s/.test(value)) {
        milliseconds *= 1000
      } else if (/[\d.]+h/.test(value)) {
        milliseconds *= 1000 * 60 * 60
      } else {
        milliseconds *= 1000 * 60
      }

      stat.window = milliseconds
    }

    Vue.set(state.statsCounters, id, stat)
  },
  CREATE_STAT(state, { id, name }) {
    state.statsCounters[id] = {
      id,
      name,
      output: 'vbuy + vsell',
      enabled: true
    }
  },
  REMOVE_STAT(state, id) {
    Vue.delete(state.statsCounters, id)
  },
  SET_STATS_WINDOW(state, value) {
    let milliseconds = parseInt(value) || 0

    if (/[\d.]+s/.test(value)) {
      milliseconds *= 1000
    } else if (/[\d.]+h/.test(value)) {
      milliseconds *= 1000 * 60 * 60
    } else {
      milliseconds *= 1000 * 60
    }

    state.statsWindow = milliseconds
  },
  TOGGLE_STATS_CHART(state, value) {
    state.statsChart = value ? true : false
  },
  REPLACE_COUNTERS(state, counters) {
    state.countersSteps = counters.sort((a, b) => a - b)
  },
  TOGGLE_COUNTERS_COUNT(state, value) {
    state.countersCount = value ? true : false
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
  SET_DECIMAL_PRECISION(state, value) {
    state.decimalPrecision = value
  },
  TOGGLE_ANIMATIONS(state) {
    state.disableAnimations = !state.disableAnimations
  },
  DELETE_THRESHOLD(state, index) {
    state.thresholds.splice(index, 1)
  },
  TOGGLE_SETTINGS_PANEL(state, value) {
    const index = state.settings.indexOf(value)

    if (index === -1) {
      state.settings.push(value)
    } else {
      state.settings.splice(index, 1)
    }
  },
  TOGGLE_AUDIO(state, value) {
    state.useAudio = value ? true : false
  },
  TOGGLE_AUDIO_TEN_PERCENT(state, value) {
    state.audioIncludeInsignificants = value ? true : false
  },
  SET_AUDIO_VOLUME(state, value) {
    state.audioVolume = value
  },
  SET_AUDIO_PITCH(state, value) {
    state.audioPitch = value
  },
  SET_TIMEFRAME(state, value) {
    state.timeframe = value
  },
  TOGGLE_CHART(state, value) {
    state.showChart = value ? true : false
  },
  SET_CHART_HEIGHT(state, value) {
    state.chartHeight = value || null
  },
  SET_SIDEBAR_WIDTH(state, value) {
    state.sidebarWidth = value || null
  },
  SET_CHART_REFRESH_RATE(state, value) {
    state.chartRefreshRate = +value || 0
  },
  SET_CHART_BACKGROUND_COLOR(state, value) {
    state.chartBackgroundColor = value
  },
  SET_CHART_THEME(state, value) {
    state.chartTheme = value
  },
  SET_CHART_COLOR(state, value) {
    state.chartColor = value
  },
  SET_TIMEZONE_OFFSET(state, value) {
    state.timezoneOffset = +value || 0
  },
  CREATE_SERIE(state, serie) {
    Vue.set(state.series, serie.id, serie)
  },
  TOGGLE_SERIE(state, id) {
    Vue.set(state.series[id], 'enabled', typeof state.series[id].enabled === 'undefined' ? false : !state.series[id].enabled)
  },
  SET_SERIE_OPTION(state, { id, key, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    Vue.set(state.series[id].options, key, value)
  },
  REMOVE_SERIE_OPTION(state, { id, key }) {
    if (!state.series[id]) {
      return
    }

    Vue.delete(state.series[id].options, key)
  },
  SET_SERIE_TYPE(state, { id, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    Vue.set(state.series[id], 'type', value)
  },
  SET_SERIE_INPUT(state, { id, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    Vue.set(state.series[id], 'input', value)
  },
  CUSTOMIZE_SERIE(state, id) {
    Vue.set(state.series[id], 'options', {})
  },
  REMOVE_SERIE(state, id) {
    Vue.delete(state.series, id)
  },
  TOGGLE_EXCHANGES_BAR(state, value) {
    state.showExchangesBar = value ? true : false
  },
  TOGGLE_EXCHANGES_BAR_ANIMATION(state, value) {
    state.animateExchangesBar = value ? true : false
  },
  ADD_RECENT_COLOR(state, value) {
    state.recentColors.push(value)
  },
  TRIM_RECENT_COLORS(state) {
    state.recentColors.pop()
  }
} as MutationTree<SettingsState>

export default {
  namespaced: true,
  state,
  actions,
  mutations
} as AppModule<SettingsState>
