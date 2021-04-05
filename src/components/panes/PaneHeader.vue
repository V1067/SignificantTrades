<template>
  <div class="pane-header">
    <div class="pane-name">{{ name }}</div>
    <div class="pane-controls">
      <button type="button" v-if="showSearch" @click="openSearch">
        <span class="icon-search"></span>
      </button>

      <dropdown
        v-if="showTimeframe"
        :options="timeframes"
        :selected="timeframe"
        placeholder="tf."
        @output="$store.commit(paneId + '/SET_TIMEFRAME', +$event)"
      ></dropdown>

      <button type="button" @click="openSettings">
        <span class="icon-cog"></span>
      </button>
      <button type="button" @click="remove">
        <span class="icon-close-thin"></span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import dialogService from '@/services/dialogService'

import CountersPaneDialog from '@/components/counters/CountersPaneDialog.vue'
import TradesPaneDialog from '../trades/TradesPaneDialog.vue'
import ChartPaneDialog from '../chart/ChartPaneDialog.vue'
import StatsPaneDialog from '../stats/StatsPaneDialog.vue'

@Component({
  name: 'PaneHeader',
  props: {
    paneId: {
      type: String
    },
    showSearch: {
      type: Boolean,
      default: true
    },
    showTimeframe: {
      type: Boolean,
      default: false
    }
  }
})
export default class extends Vue {
  paneId: string
  timeframes = {
    1: '1s',
    3: '3s',
    5: '5s',
    10: '10s',
    15: '15s',
    30: '30s',
    60: '1m',
    [60 * 3]: '3m',
    [60 * 5]: '5m',
    [60 * 15]: '15m'
  }

  get name() {
    return this.$store.state.panes.panes[this.paneId].name || this.paneId
  }

  get type() {
    return this.$store.state.panes.panes[this.paneId].type
  }

  get timeframe() {
    return this.$store.state[this.paneId].timeframe
  }

  openSettings() {
    switch (this.type) {
      case 'counters':
        dialogService.open(CountersPaneDialog, { paneId: this.paneId })
        break
      case 'stats':
        dialogService.open(StatsPaneDialog, { paneId: this.paneId })
        break
      case 'chart':
        dialogService.open(ChartPaneDialog, { paneId: this.paneId })
        break
      case 'trades':
        dialogService.open(TradesPaneDialog, { paneId: this.paneId })
        break
    }
  }

  openSearch() {
    this.$store.dispatch('app/showSearch', this.paneId)
  }

  remove() {
    this.$store.dispatch('panes/removePane', this.paneId)
  }
}
</script>
