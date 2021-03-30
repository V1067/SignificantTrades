<template>
  <div id="stats" class="stats">
    <div v-if="statsChart" class="stats__chart" ref="chart"></div>
    <ul class="stats__counters">
      <li v-for="(counter, id) in data" :key="id" class="stat-counter" @click="editCounter(id)">
        <div class="stat-counter__name" :style="{ color: counter.color }">{{ counter.name }}</div>
        <div class="stat-counter__value">{{ counter.value }}</div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import * as TV from 'lightweight-charts'
import aggregatorService from '@/services/aggregatorService'
import Counter from '../../utils/counter'
import { defaultStatsChartOptions } from '../chart/chartOptions'

import StatDialog from './StatDialog.vue'
import dialogService from '@/services/dialogService'

import { formatAmount } from '@/utils/helpers'
import PaneMixin from '@/mixins/paneMixin'

let chart: TV.IChartApi
const counters: { [id: string]: Counter } = {}

@Component({
  name: 'Stats'
})
export default class extends Mixins(PaneMixin) {
  data = {}

  $refs!: {
    chart: HTMLElement
  }

  private _refreshChartDimensionsTimeout: number
  // private _chartUpdateInterval: number

  private onStoreMutation: () => void

  get statsWindow() {
    return this.$store.state.settings.statsWindow
  }

  get statsChart() {
    return this.$store.state.settings.statsChart
  }

  get statsCounters() {
    return this.$store.state.settings.statsCounters
  }

  created() {
    this.onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/TOGGLE_STAT':
          if (mutation.payload.value) {
            this.createCounter(this.statsCounters[mutation.payload.id])
          } else {
            this.removeCounter(mutation.payload.id)
          }
          break
        case 'settings/SET_STAT_WINDOW':
        case 'settings/SET_STAT_OUTPUT':
        case 'settings/SET_STAT_PRECISION':
          this.refreshCounter(mutation.payload.id)
          break
        case 'settings/RENAME_STAT':
          this.refreshCounterName(mutation.payload)
          break
        case 'settings/SET_PAIR':
        case 'settings/SET_STATS_WINDOW':
          this.prepareCounters()
          break
        case 'settings/SET_STAT_COLOR':
          this.recolorCounter(mutation.payload.id, mutation.payload.value)
          break
        case 'settings/TOGGLE_CHART':
        case 'settings/SET_SIDEBAR_WIDTH':
          this.refreshChartDimensions(mutation.payload)
          break
        case 'settings/TOGGLE_STATS_CHART':
          if (mutation.payload) {
            this.createChart()
          } else {
            this.removeChart()
          }
          break
      }
    })

    this.prepareCounters()
  }

  mounted() {
    if (this.statsChart) {
      this.createChart()
    }

    aggregatorService.on('sums', this.onSums)
  }

  beforeDestroy() {
    aggregatorService.off('sums', this.onSums)
    this.clearCounters()
    this.removeChart()
    this.onStoreMutation()

    chart = null
  }

  createChart() {
    setTimeout(() => {
      chart = TV.createChart(this.$refs.chart, defaultStatsChartOptions)

      for (const id in counters) {
        counters[id].createSerie(chart)
      }

      this.refreshChartDimensions(this.$store.state.settings.sidebarWidth)
      // this.chartUpdate()
    }, 100)
  }

  removeChart() {
    if (!chart) {
      return
    }

    // this.stopChartUpdate()

    for (const id in counters) {
      counters[id].removeSerie(chart)
    }

    chart.remove()

    chart = null
  }

  /* chartUpdate() {
    if (!this._chartUpdateInterval) {
      this._chartUpdateInterval = setInterval(this.chartUpdate.bind(this), 100)
      return
    }

    for (const id in counters) {
      counters[id].updateSerie()
    }
  }
  stopChartUpdate() {
    if (this._chartUpdateInterval) {
      clearInterval(this._chartUpdateInterval)
      delete this._chartUpdateInterval
    }
  } */
  refreshChartDimensions(w) {
    if (!this.statsChart) {
      return
    }

    clearTimeout(this._refreshChartDimensionsTimeout)

    this._refreshChartDimensionsTimeout = setTimeout(() => {
      if (!w) {
        w = this.$el.clientWidth
      }

      chart && chart.resize(w, this.$el.clientHeight)
    }, 500)
  }
  prepareCounters() {
    this.clearCounters()

    for (const id in this.statsCounters) {
      this.createCounter(this.statsCounters[id])
    }
  }
  onSums(sums) {
    const now = +new Date()

    for (const id in counters) {
      counters[id].onStats(now, sums)

      if (counters[id].stacks.length) {
        const value = counters[id].getValue()

        this.$set(this.data[id], 'value', formatAmount(value, counters[id].precision))
      }

      if (chart) {
        counters[id].updateSerie()
      }
    }
  }

  clearCounters() {
    for (const id in counters) {
      this.removeCounter(id)
    }
  }

  removeCounter(id) {
    if (!counters[id]) {
      return
    }

    counters[id].unbind()

    if (chart) {
      counters[id].removeSerie(chart)
    }

    this.$delete(this.data, id)

    delete counters[id]
  }
  refreshCounter(id) {
    const options = this.statsCounters[id]

    if (!options) {
      return
    }

    this.removeCounter(id)
    this.createCounter(options)
  }

  recolorCounter(id, color) {
    counters[id].updateColor(color)

    this.$set(this.data[id], 'color', color)
  }

  createCounter(statCounter) {
    if (statCounter.enabled && typeof this.data[statCounter.id] === 'undefined') {
      const outputFunction = this.getCounterFunction(statCounter.output)
      const counter = new Counter(outputFunction, statCounter)

      if (chart) {
        counter.createSerie(chart)
      }

      counters[statCounter.id] = counter

      this.$set(this.data, counter.id, {
        value: 0,
        name: counter.name,
        color: counter.color
      })
    }
  }

  refreshCounterName({ oldId, id }: { oldId: string; id: string }) {
    const counter = counters[oldId]

    this.data[id] = this.data[oldId]
    delete this.data[oldId]
    counter.id = id

    const statCounter = this.statsCounters[id]
    counter.name = statCounter.name
  }

  editCounter(id) {
    dialogService.open(StatDialog, { id })
  }

  getCounterFunction(str) {
    const litteral = str.replace(/([^.]|^)(vbuy|vsell|cbuy|csell|lbuy|lsell)/g, '$1stats.$2')
    return new Function('stats', `'use strict'; return ${litteral};`)
  }

  onResize(newWidth: number, newHeight: number) {
    console.log('trigger resize frome parrent', newWidth, newHeight)
    this.refreshChartDimensions(newWidth)
  }
}
</script>

<style lang="scss">
.stats {
  position: relative;
  background-color: rgba(white, 0.05);

  &__chart {
    width: 100%;
    position: relative;

    &:before {
      content: '';
      display: block;
    }

    > * {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    + .stats__counters {
      position: absolute;
      margin: 0.25em;

      .stat-counter {
        flex-direction: row;
        padding: 0.25em;

        &__value {
          text-align: left;
          flex-grow: 0;
        }

        &__name {
          font-size: 12px;
          margin-left: 1em;
          order: 2;
          opacity: 0;
          transform: translateX(8px);
          transition: transform 0.2s $ease-out-expo, opacity 0.2s $ease-out-expo;
        }

        &:hover {
          .stat-counter__name {
            opacity: 1;
            transform: none;
          }
        }
      }
    }
  }

  &__counters {
    padding: 0;
    margin: 0;
    list-style: none;
    top: 0;
    z-index: 11;
  }

  .stat-counter {
    display: flex;
    align-items: center;
    padding: 0.75em;
    cursor: pointer;

    + .stat-counter {
      padding-top: 0;
    }

    &__name {
      color: rgba(white, 0.5);
      letter-spacing: 0.4px;
      transition: opacity 0.2s $ease-out-expo;
    }

    &__value {
      text-align: right;
      white-space: nowrap;
      font-family: 'Barlow Semi Condensed';
      z-index: 1;
      flex-grow: 1;
    }

    &:hover {
      .custom-stat__name {
        color: white;
      }
    }
  }
}
</style>
