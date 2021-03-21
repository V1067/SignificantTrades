import Vue from 'vue'
import { getColorLuminance, splitRgba } from '../../utils/colors'
import { getSerieOptions, slugify, uniqueName } from '../../utils/helpers'

export default {
  updateStat({ commit, state }, { index, prop, value }) {
    if (state.statsCounters[index][prop] === value) {
      return
    }

    let mutation = ''

    if (typeof value === 'boolean') {
      mutation += 'TOGGLE_STAT'
    } else {
      mutation += 'SET_STAT_' + prop.toUpperCase()
    }

    commit(mutation, {
      index,
      value
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
          const serieOptions = getSerieOptions(_id)
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
  removeSerie({ commit, state }, id) {
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

    const serie = { ...state.series[id], name, id: newId, enabled: false }

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
      commit('POP_OLDEST_RECENT_COLOR')
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
  }
}
