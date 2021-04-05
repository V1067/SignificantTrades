<template>
  <div class="pane-chart">
    <pane-header :paneId="paneId" :showTimeframe="true" />
    <div class="chart__container" ref="chartContainer"></div>
    <div class="chart__series">
      <SerieControl v-for="(serie, index) in activeSeries" :key="index" :serieId="serie" :paneId="paneId" :legend="legend[serie]" />

      <div class="column mt8">
        <a href="javascript:void(0);" @click="addSerie" v-tippy="{ placement: 'bottom' }" title="Add" class="mr4">
          <i class="icon-plus"></i>
        </a>
      </div>
    </div>
    <div class="chart__controls">
      <!--<button class="btn -small" @click="refreshChart">Refresh</button>-->
    </div>
    <!--<div class="chart__positions">
      <div>
        from: {{ visibleRangeFrom }}<br />
        logicalfrom: {{ visibleRangeLogicalFrom }}
      </div>
      <div>
        {{ scrollPosition }}
      </div>
      <div>
        to: {{ visibleRangeTo }}<br />
        logicalto: {{ visibleRangeLogicalTo }}
      </div>
    </div>-->
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import ChartController, { TimeRange } from './chartController'

import dialogService from '../../services/dialogService'
import { formatPrice, formatAmount, formatTime } from '../../utils/helpers'

import SerieControl from './SerieControl.vue'
import { MAX_BARS_PER_CHUNKS } from '../../utils/constants'
import SerieDialog from './SerieDialog.vue'
import CreateSerieDialog from './CreateSerieDialog.vue'
import aggregatorService from '@/services/aggregatorService'
import historicalService from '@/services/historicalService'
import PaneMixin from '@/mixins/paneMixin'
import { getCustomColorsOptions } from './chartOptions'
import PaneHeader from '../panes/PaneHeader.vue'

let chart: ChartController = null

@Component({
  name: 'Chart',
  components: {
    SerieControl,
    PaneHeader
  }
})
export default class extends Mixins(PaneMixin) {
  resizing = {}
  fetching = false
  reachedEnd = false
  legend = {}

  private onStoreMutation: () => void
  private _refreshChartDimensionsTimeout: number
  private _keepAliveTimeout: number
  private _onPanTimeout: number

  get activeSeries() {
    return this.$store.state[this.paneId].activeSeries
  }

  get timeframe() {
    return this.$store.state[this.paneId].timeframe
  }

  get exchanges() {
    return this.$store.state.exchanges
  }

  get markets() {
    return this.$store.state.panes.panes[this.paneId].markets
  }

  get refreshRate() {
    return this.$store.state[this.paneId].refreshRate
  }

  get series() {
    return this.$store.state[this.paneId].series
  }

  get theme() {
    return this.$store.state.settings.theme
  }

  get timezoneOffset() {
    return this.$store.state.settings.timezoneOffset
  }

  $refs!: {
    chartContainer: HTMLElement
  }

  created() {
    chart = new ChartController(this.paneId)

    this.onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/SET_CHART_COLOR':
          if (mutation.payload) {
            chart.chartInstance.applyOptions(getCustomColorsOptions(mutation.payload))
          }
          break
        case 'settings/SET_CHART_THEME':
          chart.chartInstance.applyOptions(getCustomColorsOptions())
          break
        case 'settings/SET_TIMEZONE_OFFSET':
          chart.clearChart()
          chart.renderVisibleChunks()
          break
        case 'app/EXCHANGE_UPDATED':
          chart.renderVisibleChunks()
          break
        case 'panes/SET_PANE_MARKETS':
          if (mutation.payload.id === this.paneId) {
            chart.setMarkets(mutation.payload.markets)

            this.clear()
            this.fetch()
          }
          break
        case this.paneId + '/SET_TIMEFRAME':
          this.clear()
          this.fetch()
          break
        case this.paneId + '/SET_REFRESH_RATE':
          chart.clearQueue()
          chart.setupQueue()
          break
        case this.paneId + '/SET_SERIE_OPTION':
          chart.setSerieOption(mutation.payload)
          break
        case this.paneId + '/SET_SERIE_TYPE':
        case this.paneId + '/SET_SERIE_INPUT':
          chart.rebuildSerie(mutation.payload.id)
          break
        case this.paneId + '/TOGGLE_SERIE':
          chart.toggleSerie(mutation.payload)
          break
        case 'app/SET_OPTIMAL_DECIMAL':
        case this.paneId + '/SET_DECIMAL_PRECISION':
          if (this.$store.state[this.paneId].decimalPrecision && mutation.payload.type === 'app/SET_OPTIMAL_DECIMAL') {
            break
          }

          for (const id of this.activeSeries) {
            const serie = this.$store.state[this.paneId].series[id]

            if (!serie.options) {
              continue
            }

            if (serie.options.priceFormat && serie.options.priceFormat.type === 'price') {
              chart.setSerieOption({
                id: serie.id,
                key: 'priceFormat.precision',
                value: mutation.payload
              })

              chart.setSerieOption({
                id: serie.id,
                key: 'priceFormat.minMove',
                value: 1 / Math.pow(10, mutation.payload)
              })
            }
          }

          break
      }
    })
  }

  mounted() {
    console.log(`[chart.mounted]`)
    chart.setupQueue()

    this.createChart()

    this.keepAlive()
  }

  async createChart() {
    await this.$nextTick()

    chart.createChart(this.$refs.chartContainer)

    this.bindChartEvents()

    this.fetch()
  }

  destroyChart() {
    this.unbindChartEvents()

    chart.destroy()

    clearTimeout(this._keepAliveTimeout)
  }

  beforeDestroy() {
    this.destroyChart()
    this.onStoreMutation()
  }

  /**
   * fetch whatever is missing based on visiblerange
   * @param {boolean} clear will clear the chart / initial fetch
   */
  fetch(rangeToFetch?: TimeRange) {
    const historicalMarkets = historicalService.getHistoricalMarktets(this.markets)

    if (!historicalMarkets) {
      return Promise.reject('Fetch is disabled')
    }

    const visibleRange = chart.chartInstance.timeScale().getVisibleRange() as TimeRange
    const timeframe = +this.$store.state[this.paneId].timeframe

    if (!rangeToFetch) {
      const barsCount = window.innerWidth / 2

      let leftTime

      if (chart.chartCache.cacheRange && chart.chartCache.cacheRange.from) {
        leftTime = chart.chartCache.cacheRange.from
      } else if (visibleRange && visibleRange.from) {
        leftTime = visibleRange.from + this.timezoneOffset / 1000
      } else {
        leftTime = +new Date() / 1000
      }

      rangeToFetch = {
        from: leftTime - timeframe * barsCount,
        to: leftTime - timeframe
      }
    }

    rangeToFetch.from = Math.floor(Math.round(rangeToFetch.from) / timeframe) * timeframe
    rangeToFetch.to = Math.ceil(Math.round(rangeToFetch.to) / timeframe) * timeframe - 1

    console.log(`[chart/fetch] final rangeToFetch: FROM: ${formatTime(rangeToFetch.from)} | TO: ${formatTime(rangeToFetch.to)}`)

    chart.lockRender()

    return historicalService
      .fetch(Math.round(rangeToFetch.from * 1000), Math.round(rangeToFetch.to * 1000 - 1), timeframe, historicalMarkets)
      .then(({ data, from, to, format }) => {
        /**
         * @type {Chunk}
         */
        let chunk

        switch (format) {
          case 'point':
            chunk = {
              from,
              to,
              bars: data
            }
            break
          default:
            throw new Error('unsupported-historical-data-format')
        }

        if (chunk && chunk.bars.length) {
          /**
           * @type {Chunk[]}
           */
          const chunks = [
            {
              from: chunk.from,
              to: chunk.from,
              bars: []
            }
          ]

          console.log(`[chart/fetch] success (${data.length} new ${format}s)`)

          if (chunk.bars.length > MAX_BARS_PER_CHUNKS) {
            console.log(`[chart/fetch] response chunk is too large (> ${MAX_BARS_PER_CHUNKS} bars) -> start splitting`)
          }

          while (chunk.bars.length) {
            const bar = chunk.bars.shift()

            if (chunks[0].bars.length >= MAX_BARS_PER_CHUNKS && chunks[0].to < bar.timestamp) {
              chunks.unshift({
                from: bar.timestamp,
                to: bar.timestamp,
                bars: []
              })
            }

            chunks[0].bars.push(bar)
            chunks[0].to = bar.timestamp
          }

          if (chunks.length > 1) {
            console.log(`[chart/fetch] splitted result into ${chunks.length} chunks`)
          }

          console.log(`[chart/fetch] save ${chunks.length} new chunks`)
          console.log(
            `\t-> [first] FROM: ${formatTime(chunks[0].from)} | TO: ${formatTime(chunks[0].to)} (${formatAmount(chunks[0].bars.length)} bars)`
          )
          console.log(
            `\t-> [last] FROM: ${formatTime(chunks[chunks.length - 1].from)} | TO: ${formatTime(chunks[chunks.length - 1].to)} (${formatAmount(
              chunks[chunks.length - 1].bars.length
            )} bars)`
          )
          console.log(
            `\t-> [current cacheRange] FROM: ${formatTime(chart.chartCache.cacheRange.from)} | TO: ${formatTime(chart.chartCache.cacheRange.to)}`
          )
          for (const chunk of chunks) {
            chart.chartCache.saveChunk(chunk)
          }

          chart.renderVisibleChunks()
        }
      })
      .catch(err => {
        if (err === 'no-more-data') {
          this.reachedEnd = true
        }

        console.error(err)
      })
      .then(() => {
        chart.unlockRender()
      })
  }

  /**
   * TV chart mousemove event
   * @param{TV.MouseEventParams} param tv mousemove param
   */
  onCrosshair(param) {
    if (
      param === undefined ||
      param.time === undefined ||
      param.point.x < 0 ||
      param.point.x > this.$refs.chartContainer.clientWidth ||
      param.point.y < 0 ||
      param.point.y > this.$refs.chartContainer.clientHeight
    ) {
      this.legend = {}
    } else {
      for (const serie of chart.activeSeries) {
        const data = param.seriesPrices.get(serie.api)

        if (!data) {
          this.$set(this.legend, serie.id, '')
          continue
        }

        const formatFunction = serie.options.priceFormat && serie.options.priceFormat.type === 'volume' ? formatAmount : formatPrice

        if (data.close) {
          this.$set(
            this.legend,
            serie.id,
            `O: ${formatFunction(data.open)} H: ${formatFunction(data.high)} L: ${formatFunction(data.low)} C: ${formatFunction(data.close)}`
          )
        } else {
          this.$set(this.legend, serie.id, formatFunction(data))
        }
      }
    }
  }

  /**
   * @param{Trade[]} trades trades to process
   */
  onTrades(trades) {
    if (chart.preventRender || this.refreshRate) {
      chart.queueTrades(trades)
      return
    }

    chart.renderRealtimeTrades(trades)
  }

  refreshChartDimensions(debounceTime = 500) {
    if (!chart || !chart.chartInstance) {
      return
    }

    clearTimeout(this._refreshChartDimensionsTimeout)

    this._refreshChartDimensionsTimeout = setTimeout(() => {
      if (!chart || !chart.chartInstance) {
        return
      }

      chart.chartInstance.resize(this.$el.clientWidth, this.$el.clientHeight)
    }, debounceTime)
  }

  /**
   * on chart pan
   */
  onPan(visibleLogicalRange) {
    // this.debugPosition()

    if (!visibleLogicalRange || chart.panPrevented) {
      return
    }

    if (this._onPanTimeout) {
      clearTimeout(this._onPanTimeout)
      this._onPanTimeout = null
    }

    this._onPanTimeout = setTimeout(() => {
      if (chart.chartCache.cacheRange.from === null) {
        return
      }

      this.fetchOrRecover(visibleLogicalRange)
    }, 200)
  }

  bindChartEvents() {
    aggregatorService.on('trades', this.onTrades)

    chart.chartInstance.subscribeCrosshairMove(this.onCrosshair)
    chart.chartInstance.timeScale().subscribeVisibleLogicalRangeChange(this.onPan)
  }

  unbindChartEvents() {
    aggregatorService.off('trades', this.onTrades)

    chart.chartInstance.unsubscribeCrosshairMove(this.onCrosshair)
    chart.chartInstance.timeScale().unsubscribeVisibleLogicalRangeChange(this.onPan)
  }

  keepAlive() {
    if (this._keepAliveTimeout) {
      chart.chartCache.trim()

      chart.redraw()
    }

    this._keepAliveTimeout = setTimeout(this.keepAlive.bind(this), 1000 * 60 * 30)
  }

  refreshChart() {
    chart.chartCache.trim()

    chart.redraw()
  }

  async addSerie() {
    const serie = await dialogService.openAsPromise(CreateSerieDialog, { paneId: this.paneId })

    if (serie) {
      this.$store.dispatch(this.paneId + '/createSerie', serie)
      dialogService.open(SerieDialog, { paneId: this.paneId, serieId: serie.id }, 'serie')
    }
  }

  fetchOrRecover(visibleLogicalRange) {
    if (!visibleLogicalRange || visibleLogicalRange.from > 0) {
      return
    }

    const barsToLoad = Math.abs(visibleLogicalRange.from)
    const rangeToFetch = {
      from: chart.chartCache.cacheRange.from - barsToLoad * this.timeframe,
      to: chart.chartCache.cacheRange.from
    }

    console.log(`[chart/pan] timeout fired`)
    console.log(`\t-> barsToLoad: ${barsToLoad}`)
    console.log(`\t-> rangeToFetch: FROM: ${formatTime(rangeToFetch.from)} | TO: ${formatTime(rangeToFetch.to)}`)
    console.log(`\t-> current cacheRange: FROM: ${formatTime(chart.chartCache.cacheRange.from)} | TO: ${formatTime(chart.chartCache.cacheRange.to)}`)
    // this.debugPosition()

    if (!this.reachedEnd && (!chart.chartCache.cacheRange.from || rangeToFetch.to <= chart.chartCache.cacheRange.from)) {
      this.fetch(rangeToFetch)
    } else {
      console.warn(
        `[chart/pan] wont fetch this range\n\t-> rangeToFetch.to (${formatTime(rangeToFetch.to)}) > chart.chartCache.cacheRange.from (${formatTime(
          chart.chartCache.cacheRange.from
        )})`
      )
      console.warn('(might trigger redraw with more cached chunks here...)')

      chart.renderVisibleChunks()
    }
  }

  onResize(newWidth: number, newHeight: number) {
    console.log('trigger resize frome parrent', newWidth, newHeight)
    this.refreshChartDimensions()
  }

  clear() {
    chart.clear()

    this.reachedEnd = false
  }
}
</script>

<style lang="scss">
.pane-chart {
  &:hover .chart__series,
  &:hover .chart__controls {
    opacity: 1;
  }
}

.chart__container {
  position: relative;
  width: 100%;
  height: 100%;

  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.chart__series {
  position: absolute;
  top: 2em;
  left: 1em;
  font-family: 'Barlow Semi Condensed';
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s $ease-out-expo;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  font-size: 12px;
}

.chart__layout {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
}

.chart__handler {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;

  &.-width {
    top: 0;
    left: auto;
    width: 16px;
    margin-right: -8px;
    cursor: ew-resize;
    display: none;

    @media screen and (min-width: 768px) {
      display: block;
    }
  }

  &.-height {
    height: 8px;
    margin-top: -4px;
    cursor: row-resize;

    @media screen and (min-width: 768px) {
      display: none;
    }
  }
}

.chart__positions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 2rem;
  font-family: 'Barlow Semi Condensed';
  background-color: rgba(black, 0.8);
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  text-align: center;
  z-index: 10;

  > div {
    &:first-child {
      text-align: left;
    }
    &:last-child {
      text-align: right;
    }
  }
}

.chart__controls {
  position: absolute;
  top: 1em;
  right: 5em;
  font-family: 'Barlow Semi Condensed';
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s $ease-out-expo;
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  @media screen and (max-width: 767px) {
    display: none;
  }
}
</style>
