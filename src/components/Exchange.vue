<template>
  <div
    class="settings-exchange"
    :class="{
      '-active': exchange.pairs.length,
      '-enabled': !settings.disabled,
      '-loading': exchange.loading,
      '-invisible': settings.hidden,
      '-expanded': expanded
    }"
  >
    <div class="settings-exchange__header" @click="toggleExchange">
      <span v-if="!isNaN(exchangeMultiplier) && exchangeMultiplier !== 1" class="settings-exchange__threshold">{{
        formatAmount(minimumThreshold * exchangeMultiplier)
      }}</span>
      <div class="settings-exchange__identity">
        <div class="settings-exchange__name">{{ exchange.id.replace('_', ' ') }}</div>
        <small class="settings-exchange__error" v-if="exchange.error">
          {{ exchange.error }}
        </small>
        <small class="settings-exchange__price" v-if="price !== null" v-html="price"></small>
      </div>
      <div class="settings-exchange__controls">
        <button
          class="settings-exchange__visibility"
          v-tippy
          :title="settings.hidden ? 'Show' : 'Hide'"
          @click.stop.prevent="$store.dispatch('exchanges/toggleExchangeVisibility', id)"
        >
          <i class="icon-eye"></i>
        </button>
        <button class="settings-exchange__more" @click.stop.prevent="expanded = !expanded">
          <i class="icon-down"></i>
        </button>
      </div>
    </div>
    <div class="settings-exchange__detail" v-if="expanded">
      <div class="form-group">
        <label class="column" style="justify-content:space-between">
          <span class="condensed">Adj. threshold:</span>
          <span v-if="settings.threshold !== 1">{{ formatAmount(minimumThreshold * exchangeMultiplier) }}</span>
        </label>
        <Slider
          :step="0.0001"
          :min="0"
          :max="2"
          :editable="false"
          :value="exchangeMultiplier"
          @input="
            $store.commit('exchanges/SET_EXCHANGE_THRESHOLD', {
              id,
              threshold: $event
            })
          "
          @reset="
            $store.commit('exchanges/SET_EXCHANGE_THRESHOLD', {
              id,
              threshold: 1
            })
          "
        >
        </Slider>
      </div>
      <div v-if="indexedProducts.length" class="form-group mt8">
        <button v-if="canRefreshProducts" class="btn -red -small" @click="refreshProducts">Refresh products ({{ indexedProducts.length }})</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { getExchangeById } from '@/exchanges'
import Exchange from '@/exchanges/exchangeAbstract'
import aggregatorService from '@/services/aggregatorService'
import { formatAmount, formatPrice } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'
import Slider from './ui/picker/Slider.vue'

@Component({
  name: 'Exchange',
  components: {
    Slider
  },
  props: ['id']
})
export default class extends Vue {
  id: string
  canRefreshProducts = true
  expanded = false
  exchange: Exchange = null
  price: number = null

  private _priceUpdateInterval: number

  get settings() {
    return this.$store.state.exchanges[this.id]
  }

  get minimumThreshold() {
    return this.$store.state.settings.thresholds[1].amount
  }

  get exchangeMultiplier() {
    return typeof this.$store.state.exchanges[this.id].threshold === 'undefined' ? 1 : this.$store.state.exchanges[this.id].threshold
  }

  get indexedProducts() {
    return this.$store.state.app.indexedProducts[this.id] || []
  }

  created() {
    this.exchange = getExchangeById(this.id)
  }

  mounted() {
    this.updatePrice()
  }

  beforeDestroy() {
    this.stopUpdatingPrice()
  }

  updatePrice() {
    const marketPrices = aggregatorService.getMarketsPrices()
    const exchangeRegex = new RegExp(`^${this.id}:`, 'i')

    let price = 0
    let count = 0

    for (const market in marketPrices) {
      if (exchangeRegex.test(market)) {
        price += marketPrices[market]
        count++
      }
    }

    if (count) {
      this.price = formatPrice(price / count)
    } else {
      this.price = null
    }

    if (!this._priceUpdateInterval) {
      this._priceUpdateInterval = window.setInterval(this.updatePrice.bind(this), 1000)
    }
  }

  stopUpdatingPrice() {
    if (this._priceUpdateInterval) {
      clearInterval(this._priceUpdateInterval)
      this._priceUpdateInterval = null
    }

    this.price = null
  }

  refreshProducts() {
    this.canRefreshProducts = false

    setTimeout(() => {
      this.canRefreshProducts = true
    }, 3000)

    const exchange = getExchangeById(this.id)

    if (exchange) {
      exchange.refreshProducts().then(() => {
        this.$store.dispatch('app/showNotice', {
          type: 'success',
          title: `${this.id}'s products refreshed`
        })
      })
    }
  }

  async toggleExchange() {
    await this.$store.dispatch('exchanges/toggleExchange', this.id)

    if (this.settings.disabled) {
      this.stopUpdatingPrice()
    } else {
      this.updatePrice()
    }
  }

  formatAmount(amount) {
    return formatAmount(amount)
  }

  formatPrice(price) {
    return formatPrice(price)
  }
}
</script>

<style lang="scss">
.settings-exchange {
  background-color: rgba(white, 0.15);
  color: white;
  transition: all 0.2s $ease-out-expo;
  border-radius: 2px;
  margin-bottom: 8px;
  flex-basis: calc(50% - 4px);
  max-width: calc(50% - 4px);

  &:nth-child(odd) {
    margin-right: 8px;
  }

  &.-loading {
    background-color: $blue;

    .settings-exchange__header:before {
      transition: all 0.2s $ease-elastic;
      display: block;
      opacity: 1;
      width: 16px;
      height: 16px;
    }
  }

  &.-enabled {
    .settings-exchange__threshold {
      display: block;
    }

    .settings-exchange__name:before {
      width: 0%;
    }
  }

  &.-active {
    background-color: $green;
    color: white;

    .settings-exchange__visibility {
      display: flex;
    }

    &.-invisible {
      .icon-visibility:before {
        transform: scale(1.2) rotateY(180deg);
      }
    }
  }

  &.-invisible {
    opacity: 0.8;

    .icon-eye:before {
      content: unicode($icon-eye-crossed);
    }
  }

  &.-error {
    background-color: $red;

    .icon-warning {
      display: block;
      margin-left: 5px;
    }
  }

  &.-unmatched {
    background-color: #555;

    color: rgba(white, 0.75);
  }

  &.-expanded {
    .settings-exchange__more i:before {
      content: unicode($icon-up);
    }
  }
}

.settings-exchange__identity {
  position: relative;
  margin: 0 0 0 0.5rem;
  display: flex;
  flex-direction: column;
  height: 40px;
  justify-content: center;
  font-size: 80%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.settings-exchange__name {
  position: relative;
  margin-right: auto;
  text-transform: uppercase;

  .icon-line-chart {
    position: absolute;
    right: -1.5em;
    top: 0.05em;
  }

  &:before {
    content: '';
    position: absolute;
    top: calc(50% + 1px);
    height: 1px;
    background-color: white;
    transition: width 0.2s $ease-out-expo 0.2s;
    left: -2px;
    width: calc(100% + 4px);
  }
}

.settings-exchange__price {
  opacity: 0.8;
}

.settings-exchange__threshold {
  display: none;
  position: absolute;
  top: -0.5em;
  right: -0.5em;
  pointer-events: none;
  font-size: 90%;
  background-color: $blue;
  border-radius: 2px;
  color: white;
  padding: 0.1em 0.2em;
  box-shadow: 0 0 0 1px rgba(black, 0.2);
}

.settings-exchange__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  cursor: pointer;

  &:before {
    content: '';
    width: 0px;
    height: 0px;

    background-color: #fff;
    border-radius: 50%;
    animation: circle-scaleout 1s infinite ease-in-out;
    transition: all 0.2s $ease-elastic, visibility 0.2s linear 0.2s;
    left: 3px;
    display: none;
    align-self: center;
    position: relative;

    opacity: 0;

    @keyframes circle-scaleout {
      0% {
        -webkit-transform: scale(0);
        transform: scale(0);
      }
      100% {
        -webkit-transform: scale(1);
        transform: scale(1);
        opacity: 0;
      }
    }
  }

  .icon-warning {
    display: none;
  }
}

.settings-exchange__controls {
  display: flex;
  margin-left: auto;
  align-self: stretch;

  .settings-exchange__visibility {
    display: none;
  }

  button {
    border: 0;
    background: none;
    cursor: pointer;
    color: white;
    font-size: 1rem;
    display: flex;
    align-items: center;

    .icon-down,
    .icon-up {
      font-size: 80%;
    }

    &:hover {
      background-color: rgba(white, 0.1);
    }
  }
}

.settings-exchange__detail {
  padding: 10px;
  background-color: rgba(black, 0.25);
}
</style>
