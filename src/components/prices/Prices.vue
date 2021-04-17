<template>
  <div class="pane-prices" :class="{ [scale]: true, [mode]: true }">
    <pane-header :paneId="paneId" />
    <transition-group
      v-if="markets"
      :name="transitionGroupName"
      tag="div"
      class="markets-bar condensed custom-scrollbar pane"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
    >
      <div
        v-for="market in markets"
        :key="market.id"
        class="market"
        :class="{ ['-' + market.exchange]: true, ['-' + market.status]: true, '-hidden': exchanges[market.exchange].hidden }"
        :title="market.id"
        @click="$store.commit('settings/TOGGLE_EXCHANGE', market.exchange)"
      >
        <div v-if="showPairs" class="market__pair" v-text="market.pair"></div>
        <div class="market__price" v-text="formatPrice(market.price)"></div>
      </div>
    </transition-group>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { formatPrice } from '../../utils/helpers'

import aggregatorService from '@/services/aggregatorService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import { Market } from '@/types/test'

type MarketsBarMarketStatus = 'pending' | 'idle' | 'up' | 'down' | 'neutral'

@Component({
  components: { PaneHeader },
  name: 'Prices'
})
export default class extends Mixins(PaneMixin) {
  tradesCount = 0
  mode = '-vertical'

  hovering = false
  list: string[] = []
  markets: (Market & { price: number; status: MarketsBarMarketStatus })[] = null

  private _onStoreMutation: () => void

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  get activeMarkets() {
    return this.$store.state.app.activeMarkets
  }

  get exchanges() {
    return this.$store.state.exchanges
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  get showPairs() {
    return this.$store.state[this.paneId].showPairs
  }

  get animateSort() {
    return this.$store.state[this.paneId].animateSort
  }

  get transitionGroupName() {
    if (this.animateSort) {
      return 'flip-list'
    } else {
      return null
    }
  }

  created() {
    this._onStoreMutation = this.$store.subscribe(mutation => {
      if (mutation.type === 'app/EXCHANGE_UPDATED' && mutation.payload) {
        const active = mutation.payload.active
        const listed = this.list.indexOf(mutation.payload.exchange) !== -1
        if (active && !listed) {
          this.list.push(mutation.payload.exchange)
        } else if (!active && listed) {
          this.list.splice(this.list.indexOf(mutation.payload.exchange), 1)
        }
      }
    })
  }

  mounted() {
    aggregatorService.on('prices', this.updateExchangesPrices)
  }

  beforeDestroy() {
    this._onStoreMutation()
    aggregatorService.off('prices', this.updateExchangesPrices)
  }

  updateExchangesPrices(marketsPrices) {
    if (!this.markets) {
      this.markets = this.activeMarkets.map(m => ({
        id: m.exchange + m.pair,
        exchange: m.exchange.toString(),
        pair: m.pair.toString(),
        status: 'pending',
        price: marketsPrices[m.exchange + m.pair]
      }))
    } else {
      for (const market of this.markets) {
        const price = marketsPrices[market.id]

        if (price === market.price) {
          continue
        }

        if (!price) {
          market.status = 'pending'
        } else if (market.price > price) {
          market.status = 'down'
        } else if (market.price < price) {
          market.status = 'up'
        } else {
          market.status = 'neutral'
        }

        market.price = price
      }
    }

    if (this.hovering) {
      return
    }

    if (this.mode === '-horizontal') {
      this.markets = this.markets.sort((a, b) => a.price - b.price)
    } else {
      this.markets = this.markets.sort((a, b) => b.price - a.price)
    }
  }

  formatPrice(amount) {
    return formatPrice(amount)
  }

  onResize(width: number, height: number) {
    this.mode = width > height ? '-horizontal' : '-vertical'
  }
}
</script>

<style lang="scss">
.markets-bar {
  display: flex;
  flex-direction: row;
  height: 30px;
  overflow-x: auto;

  @each $exchange in $exchanges {
    .market.-#{$exchange} {
      background-image: url('../../assets/exchanges/#{$exchange}.svg');
    }
  }

  .market {
    padding: 0.5em 0.5em 0.5em 2em;
    display: flex;
    flex-direction: row;
    font-size: 0.9em;
    align-items: center;
    flex-grow: 1;
    flex-basis: 0;
    position: relative;
    line-height: 1;
    background-position: 0.5em;
    background-repeat: no-repeat;
    background-size: 1em;
    cursor: pointer;

    &__pair {
      white-space: nowrap;
    }

    &__price {
      margin-left: 0.5rem;
    }

    &.-up {
      background-color: transparent;
      color: lighten($green, 10%);
    }
    &.-down {
      background-color: transparent;
      color: $red;
    }
    &.-neutral {
      color: rgba(white, 0.75);
      font-style: italic;
    }
    &.-pending {
      background-color: rgba(white, 0.2);
      opacity: 0.5;
    }
  }
}

.pane-prices {
  &.-vertical .markets-bar {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    width: 100%;
    height: 100%;
  }
}
</style>
