import { defaultPlotsOptions } from '@/components/chart/chartOptions'
import { Volumes } from '@/services/aggregatorService'
import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import store from '../store'
import { hexToRgb, splitRgba } from './colors'
import { getHms } from './helpers'

export interface CounterOptions {
  id: string
  name: string
  window?: number
  precision?: number
  color?: string
  type?: string
}

export default class Counter {
  id: string
  name: string
  window: number
  precision: number
  color: string
  granularity: number
  type: string
  timestamp: number

  live: number
  stacks: any[] = []
  filled = false
  firstStackRemaining = 0

  private outputFunction: (stats: Volumes) => number
  private serie: ISeriesApi<'Line'>
  private timeouts: number[] = []

  constructor(outputFunction, options: CounterOptions) {
    this.id = options.id
    this.name = options.name
    this.outputFunction = outputFunction

    this.window = (!isNaN(options.window) ? +options.window : store.state.settings.statsWindow) || 1000 * 60
    this.precision = options.precision
    this.color = options.color
    this.granularity = Math.max(store.state.settings.statsGranularity, this.window / 50)
    this.type = options.type || 'line'

    const windowLabel = getHms(this.window).replace(/^1(\w)$/, '$1')

    this.name += '/' + windowLabel

    console.log('[counter.js] create', {
      outputFunction: this.outputFunction,
      window: this.window,
      granularity: this.granularity
    })

    this.clear()

    if (module.hot) {
      module.hot.dispose(() => {
        this.unbind()
      })
    }
  }

  clear() {
    this.stacks = []
    this.live = 0
    this.filled = false

    for (let i = 0; i < this.timeouts.length; i++) {
      clearTimeout(this.timeouts[i])
    }

    this.timeouts = []
  }

  unbind() {
    console.log('[counter.js] unbind')

    this.clear()
  }

  onStats(timestamp, stats) {
    const value = this.outputFunction(stats)

    if (!this.stacks.length || timestamp > this.timestamp + this.granularity) {
      this.appendStack(timestamp)
    } else if (this.filled) {
      const p = (timestamp - this.timestamp) / this.granularity
      const remaining = Math.ceil(this.stacks[0] * (1 - p))
      const change = this.firstStackRemaining - remaining
      this.firstStackRemaining = remaining
      this.live -= change
    }

    this.addData(value)
  }

  appendStack(timestamp) {
    if (!timestamp) {
      timestamp = +new Date()
    }

    this.stacks.push(0)

    this.timestamp = Math.floor(timestamp / 1000) * 1000

    this.timeouts.push(setTimeout(this.shiftStack.bind(this), this.window))

    if (this.stacks.length === this.window / this.granularity) {
      this.filled = true

      this.firstStackRemaining = this.stacks[0]
    }
  }

  shiftStack() {
    this.timeouts.shift()

    const stack = this.stacks.shift()

    if (!stack) {
      return
    }

    if (this.firstStackRemaining) {
      this.live -= this.firstStackRemaining

      this.firstStackRemaining = this.stacks[0]
    }

    // this.live -= stack
  }

  addData(data) {
    this.stacks[this.stacks.length - 1] += data
    this.live += data
  }

  getValue() {
    return this.live
  }

  createSerie(chart: IChartApi) {
    if (this.serie) {
      return
    }

    const apiMethodName = 'add' + (this.type.charAt(0).toUpperCase() + this.type.slice(1)) + 'Series'
    const options = Object.assign({}, defaultPlotsOptions[this.type], {
      priceScaleId: this.name,
      title: this.name,
      priceLineVisible: false,
      lineWidth: 1,
      ...this.getColorOptions()
    })

    this.serie = chart[apiMethodName](options)
  }

  addPointToSerie(timestamp: number) {
    const value = this.getValue()

    if (!this.serie || (this.type === 'histogram' && !value)) {
      return
    }

    const point = {
      time: timestamp as UTCTimestamp,
      value: value
    }

    this.serie.update(point)
  }

  getColorOptions() {
    if (this.type === 'area') {
      let r: number
      let g: number
      let b: number

      if (this.color.indexOf('#') === 0) {
        ;[r, g, b] = hexToRgb(this.color)
      } else {
        ;[r, g, b] = splitRgba(this.color)
      }

      const topColor = `rgba(${r},${g},${b}, .4)`
      const bottomColor = `rgba(${r},${g},${b}, 0)`
      return {
        topColor,
        bottomColor,
        lineColor: this.color
      }
    } else {
      return { color: this.color }
    }
  }

  updateColor(color) {
    if (!this.serie) {
      return
    }

    this.color = color

    this.serie.applyOptions(this.getColorOptions())
  }

  removeSerie(chart: IChartApi) {
    if (!this.serie) {
      return
    }

    chart.removeSeries(this.serie)

    delete this.serie
  }
}
