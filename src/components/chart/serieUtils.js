/* eslint-disable no-unused-vars */
import '../../data/typedef'

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function avg_ohlc$(state, renderer) {
  let nbExchanges = 0
  let setOpen = false

  if (typeof state.open === 'undefined') {
    setOpen = true
    state.open = 0
  }

  state.high = 0
  state.low = 0
  state.close = 0

  for (let exchange in renderer.exchanges) {
    if (setOpen) {
      state.open += renderer.exchanges[exchange].open
    }

    state.high += renderer.exchanges[exchange].high
    state.low += renderer.exchanges[exchange].low
    state.close += renderer.exchanges[exchange].close

    nbExchanges++
  }

  if (!nbExchanges) {
    nbExchanges = 1
  }

  if (setOpen) {
    state.open /= nbExchanges
  }

  state.high /= nbExchanges
  state.low /= nbExchanges
  state.close /= nbExchanges
  if (isNaN(state.close)) {
    throw new Error('is NaN!')
  }

  return { open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function avg_close$(state, renderer) {
  let nbExchanges = 0

  state.close = 0

  for (let exchange in renderer.exchanges) {
    state.close += renderer.exchanges[exchange].close

    nbExchanges++
  }

  if (!nbExchanges) {
    nbExchanges = 1
  }

  state.close /= nbExchanges
  if (isNaN(state.close)) {
    throw new Error('is NaN!')
  }

  return state.close
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function ohlc$(state, value) {
  if (typeof state.open === 'undefined') {
    state.open = value
    state.high = value
    state.low = value
  }

  state.high = Math.max(state.high, value)
  state.low = Math.min(state.low, value)
  state.close = value

  return { open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function cum_ohlc$(state, value) {
  if (typeof state.open === 'undefined') {
    state.open = value
    state.high = value
    state.low = value
  } else {
    value = state.open + value
  }

  state.high = Math.max(state.high, value)
  state.low = Math.min(state.low, value)
  state.close = value

  return { open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function cum$(state, value) {
  if (typeof state.open === 'undefined') {
    state.open = value
  }

  state.close = state.open + value

  return state.close
}

/**
 * exponential moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function ema$(state, value, length) {
  const k = 2 / (length + 1)

  if (state.count) {
    const last = state.points[state.points.length - 1]
    state.output = (value - last) * k + last
  } else {
    state.output = value
  }

  return state.output
}

/**
 * simple moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function sma$(state, value, length) {
  const average = (state.sum + value) / (state.count + 1)
  state.output = value
  return average
}

/**
 * cumulative moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function cma$(state, value, length) {
  state.output = (state.sum + value) / (state.count + 1)
  return state.output
}
