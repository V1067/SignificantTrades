<template>
  <transition-group
    :name="transitionGroupName"
    tag="div"
    id="exchanges"
    class="exchanges condensed"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div
      v-for="market in markets"
      :key="market.id"
      :class="'-' + market.exchange + ' -' + market.status"
      :title="market.id"
      @click="$store.commit('settings/TOGGLE_EXCHANGE', market.exchange)"
    >
      <div class="exchange__price" :class="{ '-hidden': exchanges[id].hidden }"><span v-html="formatPrice(status[id].price)"></span> &nbsp;</div>
    </div>
  </transition-group>
</template>

<script lang="ts">
import aggregatorService, { Market } from '@/services/aggregatorService'
import { formatPrice } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'

type ExchangeBarMarketStatus = 'pending' | 'idle' | 'up' | 'down' | 'neutral'

@Component({
  name: 'ExchangesBar'
})
export default class extends Vue {
  hovering = false
  list: string[] = []
  markets: (Market & { price: number; status: ExchangeBarMarketStatus })[] = []

  private onStoreMutation: () => void
  private _updateExchangesPricesTimeout: number

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

  get animateExchangesBar() {
    return !this.disableAnimations && this.$store.state.settings.animateExchangesBar
  }

  get transitionGroupName() {
    if (this.animateExchangesBar) {
      return 'flip-list'
    } else {
      return null
    }
  }

  created() {
    this.onStoreMutation = this.$store.subscribe(mutation => {
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
    this.updateExchangesPrices()
  }
  beforeDestroy() {
    this.onStoreMutation()
    clearTimeout(this._updateExchangesPricesTimeout)
  }
  updateExchangesPrices() {
    const marketsPrices = aggregatorService.getMarketsPrices()

    if (!this.markets) {
      this.markets = this.activeMarkets.map(m => ({
        id: m.id.toString(),
        exchange: m.exchange.toString(),
        pair: m.pair.toString(),
        status: 'pending',
        price: marketsPrices[m.id]
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

    this.markets = this.markets.sort((a, b) => a.price - b.price)

    this._updateExchangesPricesTimeout = setTimeout(this.updateExchangesPrices.bind(this), 1000 + Math.random() * 2000)
  }

  formatPrice() {
    return formatPrice
  }
}
</script>

<style lang="scss">
#exchanges {
  display: flex;
  flex-direction: row;
  height: 1.5em;
  > div {
    padding: 0.5em;
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
    .exchange__price {
      margin-left: 1.25em;
      white-space: nowrap;
      &.-hidden {
        text-decoration: line-through;
      }
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
    @each $exchange in $exchanges {
      &.-#{$exchange} {
        background-image: url('../assets/exchanges/#{$exchange}.svg');
      }
    }
  }
}
</style>
