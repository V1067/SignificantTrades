import { getColorLuminance, splitRgba } from '../../utils/colors'

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
  setSeriePreference({ commit }, { id, key, value }) {
    try {
      value = JSON.parse(value)
    } catch (error) {
      // empty
    }

    commit('SET_SERIE_OPTION', { id, key, value })
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
