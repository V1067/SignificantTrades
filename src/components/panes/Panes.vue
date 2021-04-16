<template>
  <grid-layout
    ref="grid"
    :layout="layout"
    :row-height="rowHeight"
    :margin="[0, 0]"
    :is-draggable="draggable"
    :is-resizable="resizable"
    :vertical-compact="true"
    :use-css-transforms="true"
    :responsive="false"
    @layout-updated="onLayoutUpdated"
    @layout-ready="layoutReady = true"
  >
    <grid-item
      v-for="gridItem in layout"
      :key="gridItem.i"
      drag-allow-from=".pane-header"
      :x="gridItem.x"
      :y="gridItem.y"
      :w="gridItem.w"
      :h="gridItem.h"
      :i="gridItem.i"
      @container-resized="onContainerResized"
      @resized="onPaneResized"
    >
      <component v-if="layoutReady" class="pane" ref="panes" :is="gridItem.type" :paneId="gridItem.i"></component>
    </grid-item>
  </grid-layout>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import VueGridLayout from 'vue-grid-layout'
import PaneMixin from '@/mixins/paneMixin'

import Chart from '../chart/Chart.vue'
import Trades from '../trades/Trades.vue'
import Stats from '../stats/Stats.vue'
import Counters from '../counters/Counters.vue'
import { GridItem } from '@/store/panes'

@Component({
  components: { GridLayout: VueGridLayout.GridLayout, GridItem: VueGridLayout.GridItem, Chart, Trades, Stats, Counters }
})
export default class extends Vue {
  draggable = true
  resizable = true
  layoutReady = false
  rowHeight = 80

  private _resizeTimeout: number

  $refs!: {
    panes: PaneMixin[]
    grid: VueGridLayout.GridLayout
  }

  protected get panes() {
    return this.$store.state.panes.panes
  }

  protected get layout() {
    return this.$store.state.panes.layout
  }

  created() {
    this.calculateRowHeight()
  }

  mounted() {
    window.addEventListener('resize', this.calculateRowHeight)
  }

  beforeDestroy() {
    window.addEventListener('resize', this.calculateRowHeight)
  }

  calculateRowHeight(event?: Event) {
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout)
    }

    if (event) {
      this._resizeTimeout = window.setTimeout(this.calculateRowHeight.bind(this), 1000)
    } else {
      this._resizeTimeout = null

      const headerHeight = 0
      const rowNum = 12

      this.rowHeight = (window.innerHeight - headerHeight) / rowNum
    }
  }

  onLayoutUpdated(gridItems: GridItem[]) {
    this.$store.commit('panes/UPDATE_LAYOUT', gridItems)
  }

  resizePane(id, width, height) {
    if (!this.$refs.panes) {
      return
    }

    const pane: PaneMixin = this.$refs.panes.find(pane => pane.paneId === id)

    if (!pane) {
      return
    }

    if (typeof pane.onResize === 'function') {
      pane.onResize(width, height)
    }
  }

  onPaneResized(id, newHeightGrid, newWidthGrid, newHeightPx, newWidthPx) {
    this.resizePane(id, newHeightPx, newWidthPx)

    this.$store.commit('panes/UPDATE_LAYOUT', this.layout)
  }

  onContainerResized(id, newHeightGrid, newWidthGrid, newHeightPx, newWidthPx) {
    this.resizePane(id, newHeightPx, newWidthPx)
  }
}
</script>
