<template>
  <grid-layout
    :layout="panes"
    :col-num="colNum"
    :row-height="rowHeight"
    :is-draggable="draggable"
    :is-resizable="resizable"
    :vertical-compact="false"
    :use-css-transforms="true"
    @layout-updated="onLayoutUpdated"
    @layout-ready="gridReady = true"
  >
    <template v-if="gridReady">
      <grid-item
        v-for="(pane, index) in panes"
        :key="index"
        style="touch-action: none"
        drag-ignore-from=".no-drag"
        :static="pane.static"
        :x="pane.x"
        :y="pane.y"
        :w="pane.w"
        :h="pane.h"
        :i="pane.i"
        @resized="onPaneResize"
      >
        <trades ref="panes" v-if="pane.type === 'trades'" :pane="pane"></trades>
        <chart ref="panes" v-else-if="pane.type === 'chart'" :pane="pane"></chart>
        <stats ref="panes" v-else-if="pane.type === 'stats'" :pane="pane"></stats>
        <counters ref="panes" v-else-if="pane.type === 'counters'" :pane="pane"></counters>
      </grid-item>
    </template>
  </grid-layout>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import VueGridLayout, { GridItemData } from 'vue-grid-layout'
import { Watch } from 'vue-property-decorator'
import { scheduleSync } from '@/utils/store'
import PaneMixin from '@/mixins/paneMixin'

import Chart from './chart/Chart.vue'
import Trades from './trades/Trades.vue'
import Stats from './stats/Stats.vue'
import Counters from './counters/Counters.vue'

@Component({
  components: { GridLayout: VueGridLayout.GridLayout, GridItem: VueGridLayout.GridItem, Chart, Trades, Stats, Counters }
})
export default class extends Vue {
  draggable = true
  resizable = true
  gridReady = false
  watching: string[] = this.$store.state.panes.panes.map(item => item.i)

  $refs!: {
    panes: PaneMixin[]
  }

  protected get panes() {
    console.log(this.$store.state.panes.panes)
    return this.$store.state.panes.panes
  }

  protected get colNum() {
    return 8
  }

  protected get rowNum() {
    return 8
  }

  protected get rowHeight() {
    return 180
  }

  @Watch('$store.state.watchlist.watching')
  onWatchingChange(selection: string[]) {
    const isAdd = selection.length > this.watching.length
    const selectionA = isAdd ? selection : this.watching
    const selectionB = isAdd ? this.watching : selection

    for (const id of selectionA) {
      if (selectionB.indexOf(id) === -1) {
        if (isAdd) {
          this.addChart(id)
        } else {
          this.removeChart(id)
        }
      }
    }
  }

  addChart(id: string) {
    const { x, y } = this.getNextCoordinates()

    const item: GridItemData = {
      x,
      y,
      w: 1,
      h: 1,
      i: id
    }

    this.$store.dispatch('grid/addItem', item)

    this.watching.push(item.i)
  }

  getNextCoordinates() {
    let x = -1
    let y = 0

    for (const item of this.panes.slice().sort((a, b) => a.x + a.y * 2 - (b.x + b.y * 2))) {
      if (item.x + item.y * 2 - (x + y * 2) > 1) {
        break
      }

      x = item.x
      y = item.y
    }

    const baseIndex = x + y * 2 + 1

    console.log('[getNextCoordinates] baseIndex', baseIndex)

    x = baseIndex % this.colNum
    y = Math.floor(baseIndex / this.rowNum)

    return { x, y }
  }

  onLayoutUpdated() {
    scheduleSync(this.$store.state.panes)
  }

  removeChart(id) {
    this.$store.dispatch('grid/removeItem', id)

    this.watching.splice(this.watching.indexOf(id), 1)
  }

  onPaneResize(id, newHeightGrid, newWidthGrid, newHeightPx, newWidthPx) {
    console.log(id, newHeightGrid, newWidthGrid, newHeightPx, newWidthPx)
    this.$refs.panes.find(c => c.id === id).onResize(newWidthPx, newHeightPx)
  }
}
</script>
