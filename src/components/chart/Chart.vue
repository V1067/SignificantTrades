<template>
  <div id="chart">
    <div class="chart__container" ref="chartContainer"></div>
    <div
      class="chart__handler -width"
      ref="chartWidthHandler"
      @mousedown="startManualResize($event, 'width')"
      @dblclick.stop.prevent="resetWidth"
    ></div>
    <div
      class="chart__handler -height"
      ref="chartHeightHandler"
      @mousedown="startManualResize($event, 'height')"
      @dblclick.stop.prevent="resetHeight"
    ></div>

    <div class="chart__series">
      <SerieControl v-for="(serie, index) in activeSeries" :key="index" :id="serie" :legend="legend[serie]" />

      <dropdown
        class="available-series -left"
        v-if="inactiveSeries.length"
        :options="inactiveSeries"
        :alwaysShowPlaceholder="false"
        placeholder="+ serie"
        @output="addSerie"
      ></dropdown>
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

<script>
import '../../data/typedef'
import { mapState } from 'vuex'
import ChartController from './chartController'
import socket from '../../services/socket'

import dialogService from '../../services/dialog'
import { formatPrice, formatAmount, formatTime } from '../../utils/helpers'

import SerieControl from './SerieControl.vue'
import { MAX_BARS_PER_CHUNKS } from '../../utils/constants'
import SerieDialog from './SerieDialog.vue'
import CreateSerieDialog from './CreateSerieDialog.vue'

/**
 * @type {ChartController}
 */
let chart = null

export default {
  components: {
    SerieControl
  },

  data() {
    return {
      resizing: {},
      fetching: false,
      legend: {},
      visibleRangeFrom: null,
      visibleRangeTo: null,
      visibleRangeLogicalFrom: null,
      visibleRangeLogicalTo: null,
      scrollPosition: null
    }
  },

  computed: {
    ...mapState('app', ['activeSeries']),
    ...mapState('settings', [
      'debug',
      'pair',
      'timeframe',
      'exchanges',
      'chartHeight',
      'sidebarWidth',
      'chartRefreshRate',
      'showExchangesBar',
      'timezoneOffset',
      'series',
      'chartTheme'
    ]),
    inactiveSeries: function() {
      return Object.keys(this.$store.state.settings.series)
        .filter(id => this.$store.state.settings.series[id].enabled === false)
        .concat(['+ create'])
    }
  },

  created() {
    chart = new ChartController()

    // setInterval(this.debugPosition.bind(this), 1000)

    socket.$on('trades', this.onTrades)

    this.onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/SET_TIMEZONE_OFFSET':
          chart.clearChart()
          chart.renderVisibleChunks()
          break
        case 'app/EXCHANGE_UPDATED':
          chart.renderVisibleChunks()
          break
        case 'settings/SET_PAIR':
          chart.clear()
          break
        case 'settings/SET_TIMEFRAME':
          chart.clear()
          this.fetch()
          break
        case 'settings/SET_CHART_REFRESH_RATE':
          chart.clearQueue()
          chart.setupQueue()
          break
        case 'settings/SET_SERIE_OPTION':
          chart.setSerieOption(mutation.payload)
          break
        case 'settings/SET_SERIE_TYPE':
        case 'settings/SET_SERIE_INPUT':
          chart.rebuildSerie(mutation.payload.id)
          break
        case 'settings/SET_CHART_COLOR':
          if (mutation.payload) {
            chart.setChartColor(mutation.payload)
          }
          break
        case 'settings/SET_CHART_THEME':
          chart.setChartColor(this.chartTheme === 'light' ? '#111111' : '#f6f6f6')
          break
        case 'settings/TOGGLE_SERIE':
          chart.toggleSerie(mutation.payload)
          break
        case 'settings/TOGGLE_EXCHANGES_BAR':
          setTimeout(this.refreshChartDimensions.bind(this))
          break
        /* case 'app/SET_OPTIMAL_DECIMAL':
        case 'settings/SET_DECIMAL_PRECISION':
          // eslint-disable-next-line no-case-declarations
          const priceFormat = { precision: mutation.payload, minMove: 1 / Math.pow(10, mutation.payload) }

          for (const serie of this.activeSeries) {
            if (serie.options.priceScaleId === 'right') {
              chart.setSerieOption({
                id: serie.id,
                key: 'priceFormat.precision',
                value: priceFormat.precision
              })

              chart.setSerieOption({
                id: serie.id,
                key: 'priceFormat.minMove',
                value: priceFormat.minMove
              })
            }
          }

          break */
      }
    })
  },

  mounted() {
    console.log(`[chart.mounted]`)

    chart.createChart(this.$refs.chartContainer, this.getChartDimensions())
    chart.setupQueue()

    this.bindChartEvents()
    this.bindBrowserResize()

    this.fetch()

    this.keepAlive()
  },

  beforeDestroy() {
    this.unbindChartEvents()
    this.unbindBrowserResize()

    this.onStoreMutation()

    chart.destroy()

    clearTimeout(this._keepAliveTimeout)

    socket.$off('trades', this.onTrades)
  },

  methods: {
    debugPosition() {
      if (!chart.chartInstance) {
        return
      }

      let visibleRange = chart.chartInstance.timeScale().getVisibleRange()
      let visibleRangeLogical = chart.chartInstance.timeScale().getVisibleLogicalRange()
      let scrollPosition = chart.chartInstance.timeScale().scrollPosition()

      if (visibleRange) {
        this.visibleRangeFrom = formatTime(visibleRange.from)
        this.visibleRangeTo = formatTime(visibleRange.to)
      }
      if (visibleRangeLogical) {
        this.visibleRangeLogicalFrom = Math.round(visibleRangeLogical.from)
        this.visibleRangeLogicalTo = Math.round(visibleRangeLogical.to)
      }
      this.scrollPosition = Math.round(scrollPosition)
    },

    /**
     * fetch whatever is missing based on visiblerange
     * @param {boolean} clear will clear the chart / initial fetch
     */
    fetch(rangeToFetch) {
      if (!socket.canFetch()) {
        return Promise.reject('Fetch is disabled')
      }

      const visibleRange = chart.chartInstance.timeScale().getVisibleRange()
      const timeframe = +this.$store.state.settings.timeframe

      if (!rangeToFetch) {
        const barsCount = 200

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

      rangeToFetch.from = Math.floor(parseInt(rangeToFetch.from) / timeframe) * timeframe
      rangeToFetch.to = Math.ceil(parseInt(rangeToFetch.to) / timeframe) * timeframe - 1

      console.log(`[chart/fetch] final rangeToFetch: FROM: ${formatTime(rangeToFetch.from)} | TO: ${formatTime(rangeToFetch.to)}`)

      chart.lockRender()

      return socket
        .fetchHistoricalData(parseInt(rangeToFetch.from * 1000), parseInt(rangeToFetch.to * 1000 - 1))
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
              chunk = chart.groupTradesIntoBars(data)
              break
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

              bar.timestamp

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
          console.error(err)
        })
        .then(() => {
          chart.unlockRender()
        })
    },

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
        for (let serie of chart.activeSeries) {
          const data = param.seriesPrices.get(serie.api)

          if (!data) {
            this.$set(this.legend, serie.id, 'n/a')
            continue
          }

          let formatFunction = serie.options.valueAsVolume ? formatAmount : formatPrice

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
    },

    /**
     * @param{Trade[]} trades trades to process
     */
    onTrades(trades) {
      if (chart.preventRender || this.chartRefreshRate) {
        chart.queueTrades(trades)
        return
      }

      chart.renderRealtimeTrades(trades)
    },

    /**
     * on click on height handler
     * @param {MouseEvent} event mousedown event
     */
    startManualResize(event, side) {
      if (event.which === 3) {
        return
      }

      if (!this._doManualResize) {
        this._doManualResize = this.doManualResize.bind(this)

        window.addEventListener('mousemove', this._doManualResize, false)
      }

      if (!this._stopManualResize) {
        this._stopManualResize = this.stopManualResize.bind(this)

        window.addEventListener('mouseup', this._stopManualResize, false)
      }

      if (side === 'height') {
        this.resizing[side] = event.pageY
      } else {
        this.resizing[side] = event.pageX
      }

      console.info(`[chart] lock pan until further notice`)
      chart.panPrevented = true
    },

    /**
     * on drag height handler
     * @param {MouseEvent} event mousemove event
     */
    doManualResize(event) {
      if (!isNaN(this.resizing.width)) {
        let referenceWidth

        if (this.sidebarWidth !== null) {
          referenceWidth = window.innerWidth - this.sidebarWidth
        } else {
          referenceWidth = chart.chartInstance.options().width
        }

        this.refreshChartDimensions(referenceWidth + (event.pageX - this.resizing.width))
      } else if (!isNaN(this.resizing.height)) {
        this.refreshChartDimensions(null, (this.chartHeight || chart.options().height) + (event.pageY - this.resizing.height))
      }
    },

    /**
     * on end of drag height handler
     * @param {MouseEvent} event mouseup event
     */
    stopManualResize() {
      if (this.resizing.width) {
        this.$store.commit('settings/SET_SIDEBAR_WIDTH', window.innerWidth - this.$refs.chartContainer.clientWidth)

        delete this.resizing.width
      } else if (this.resizing.height) {
        this.$store.commit('settings/SET_CHART_HEIGHT', this.$refs.chartContainer.clientHeight)

        delete this.resizing.height
      }

      if (this._doManualResize) {
        window.removeEventListener('mousemove', this._doManualResize)
        delete this._doManualResize
      }

      if (this._stopManualResize) {
        window.removeEventListener('mouseup', this._stopManualResize)
        delete this._stopManualResize
      }

      console.info(`[chart] unlock pan`)
      chart.panPrevented = false
    },

    /**
     * on dblclick on height handler
     * @param {MouseEvent} event dbl click event
     */
    resetHeight() {
      delete this.resizing.height

      this.$store.commit('settings/SET_CHART_HEIGHT', null)

      this.refreshChartDimensions()
    },

    /**
     * on dblclick on width handler
     * @param {MouseEvent} event dbl click event
     */
    resetWidth() {
      delete this.resizing.width

      this.$store.commit('settings/SET_SIDEBAR_WIDTH', null)

      this.refreshChartDimensions()
    },

    /**
     * refresh chart dimensions based on container dimensions
     */
    refreshChartDimensions(width, height) {
      const dimensions = this.getChartDimensions()

      chart.chartInstance.resize(width || dimensions.width, height || dimensions.height)

      this.$el.parentElement.style.width = (width || dimensions.width) + 'px'
    },

    /**
     * get chart height based on container dimensions
     */
    getChartDimensions() {
      const w = document.documentElement.clientWidth
      const h = document.documentElement.clientHeight

      return {
        width: window.innerWidth < 768 ? window.innerWidth : this.sidebarWidth > 0 ? window.innerWidth - this.sidebarWidth : w - 320,
        height:
          window.innerWidth >= 768
            ? this.$el.parentElement.clientHeight - (this.showExchangesBar ? 24 : 0)
            : this.chartHeight > 0
            ? this.chartHeight
            : +Math.min(w / 2, Math.max(300, h / 3)).toFixed()
      }
    },

    /**
     * on browser resize
     * @param {Event} event resize event
     */
    doWindowResize() {
      clearTimeout(this._resizeTimeout)

      this._resizeTimeout = setTimeout(() => {
        this.refreshChartDimensions()
      }, 250)
    },

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
        // const visibleRangeLogical = chart.chartInstance.timeScale().getVisibleLogicalRange()

        if (visibleLogicalRange.from > 0) {
          return
        }

        const barsToLoad = Math.abs(visibleLogicalRange.from)
        const rangeToFetch = {
          from: chart.chartCache.cacheRange.from - barsToLoad * this.$store.state.settings.timeframe,
          to: chart.chartCache.cacheRange.from
        }

        console.log(`[chart/pan] timeout fired`)
        console.log(`\t-> barsToLoad: ${barsToLoad}`)
        console.log(`\t-> rangeToFetch: FROM: ${formatTime(rangeToFetch.from)} | TO: ${formatTime(rangeToFetch.to)}`)
        console.log(
          `\t-> current cacheRange: FROM: ${formatTime(chart.chartCache.cacheRange.from)} | TO: ${formatTime(chart.chartCache.cacheRange.to)}`
        )
        // this.debugPosition()

        if (!chart.chartCache.cacheRange.from || rangeToFetch.to <= chart.chartCache.cacheRange.from) {
          this.fetch(rangeToFetch)
        } else {
          console.warn(
            `[chart/pan] wont fetch this range\n\t-> rangeToFetch.to (${formatTime(
              rangeToFetch.to
            )}) > chart.chartCache.cacheRange.from (${formatTime(chart.chartCache.cacheRange.from)})`
          )
          console.warn('(might trigger redraw with more cached chunks here...)')

          chart.renderVisibleChunks()
        }
      }, 200)
    },

    bindChartEvents() {
      // chart.chartInstance.subscribeClick(this.onClick)
      chart.chartInstance.subscribeCrosshairMove(this.onCrosshair)
      chart.chartInstance.timeScale().subscribeVisibleLogicalRangeChange(this.onPan)
    },

    unbindChartEvents() {
      // chart.chartInstance.unsubscribeClick(this.onClick)
      chart.chartInstance.unsubscribeCrosshairMove(this.onCrosshair)
      chart.chartInstance.timeScale().unsubscribeVisibleLogicalRangeChange(this.onPan)
    },

    bindBrowserResize() {
      this._doWindowResize = this.doWindowResize.bind(this)
      window.addEventListener('resize', this._doWindowResize, false)
    },

    unbindBrowserResize() {
      window.removeEventListener('resize', this._doWindowResize)
    },

    keepAlive() {
      if (this._keepAliveTimeout) {
        chart.trimCache()

        chart.redraw()
      }

      this._keepAliveTimeout = setTimeout(this.keepAlive.bind(this), 1000 * 60 * 30)
    },

    refreshChart() {
      chart.chartCache.trimCache()

      chart.redraw()
    },

    async addSerie(index) {
      if (index === this.inactiveSeries.length - 1) {
        const serie = await dialogService.openAsPromise(CreateSerieDialog)

        if (serie) {
          this.$store.dispatch('settings/createSerie', serie)
          dialogService.open(SerieDialog, { id: serie.id })
        }

        return
      }

      const id = this.inactiveSeries[index]

      this.$store.dispatch('settings/toggleSerie', id)
    }
  }
}
</script>

<style lang="scss">
#chart {
  position: relative;

  &:hover .chart__series,
  &:hover .chart__controls {
    opacity: 1;
  }
}

.chart__container {
  position: relative;
  width: calc(100% + 1px);

  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  &.-fetching {
    opacity: 0.5;
  }
}

.chart__series {
  position: absolute;
  top: 1em;
  left: 1em;
  font-family: 'Barlow Semi Condensed';
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s $ease-out-expo;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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
