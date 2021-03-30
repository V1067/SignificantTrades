<template>
  <header id="header" class="header" v-background="60">
    <div class="header__wrapper">
      <div class="header__title">
        <span class="pair">{{ pair }}</span>
        &nbsp;
        <span class="icon-quote"></span>
        &nbsp;
        <span v-html="price" :title="activeMarketsIds" v-tippy></span>
      </div>
      <button type="button" @click="$store.commit('app/TOGGLE_SEARCH')" title="Search" v-tippy="{ placement: 'bottom' }">
        <span class="icon-search"></span>
      </button>
      <dropdown
        v-if="showChart"
        :options="timeframes"
        :selected="timeframe"
        placeholder="tf."
        @output="$store.commit('settings/SET_TIMEFRAME', +$event)"
      ></dropdown>
      <button type="button" v-if="!isPopupMode" @click="togglePopup" title="Open as popup" v-tippy="{ placement: 'bottom' }">
        <span class="icon-external-link-square-alt"></span>
      </button>
      <button type="button" class="-volume" @click="$store.commit('settings/TOGGLE_AUDIO', !useAudio)">
        <span class="icon-volume-off" :class="{ 'icon-volume-high': useAudio }"></span>
      </button>
      <button type="button" @click="$store.commit('app/TOGGLE_SETTINGS')">
        <span class="icon-cog"></span>
      </button>
    </div>
  </header>
</template>

<script lang="ts">
import aggregatorService from '@/services/aggregatorService'
import { Component, Vue } from 'vue-property-decorator'
import { formatPrice } from '@/utils/helpers'
import upFavicon from '../assets/up.png'
import downFavicon from '../assets/down.png'

@Component({
  name: 'Header'
})
export default class extends Vue {
  isPopupMode = window.opener !== null
  showTimeframeDropdown = false
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
  price: string = null

  private _priceUpdateInterval: number
  private _faviconElement: HTMLLinkElement

  get pair() {
    const pairs = this.$store.state.settings.pairs

    if (!pairs.length) {
      return 'SignificantTrades'
    }

    return pairs[0].replace(/^.*:/, '')
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get showChart() {
    return this.$store.state.settings.showChart
  }

  get timeframe() {
    return this.$store.state.settings.timeframe
  }

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  get activeMarketsIds() {
    const enabledActiveMarketsIds = this.$store.state.app.activeMarkets.filter(m => this.activeExchanges[m.exchange]).map(m => m.id)

    if (enabledActiveMarketsIds.length > 1) {
      return 'Avg. of ' + enabledActiveMarketsIds.join(', ')
    } else if (enabledActiveMarketsIds.length === 1) {
      return enabledActiveMarketsIds[0]
    } else {
      return 'Nothing to show'
    }
  }

  mounted() {
    this.updatePrice()
  }

  beforeDestroy() {
    this.stopUpdatingPrice()
  }

  updatePrice() {
    const marketPrices = aggregatorService.getMarketsPrices()

    let price = 0
    let count = 0

    for (const market in marketPrices) {
      const [exchangeId] = market.split(':')

      if (!this.activeExchanges[exchangeId]) {
        continue
      }

      price += marketPrices[market]
      count++
    }

    if (count) {
      price = price / count

      if (this.price !== null) {
        if (price > +this.price) {
          this.updateFavicon('up')
        } else if (price < +this.price) {
          this.updateFavicon('down')
        }
      }

      this.price = formatPrice(price)

      window.document.title = this.pair + ' ' + this.price
    } else {
      this.price = null
      this.updateFavicon('neutral')

      window.document.title = this.pair
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

  togglePopup() {
    window.open(window.location.href, `sig${this.pair}`, 'toolbar=no,status=no,width=350,height=500')

    setTimeout(() => {
      window.close()
    }, 500)
  }

  updateFavicon(direction: 'up' | 'down' | 'neutral') {
    if (!this._faviconElement) {
      this._faviconElement = document.createElement('link')
      this._faviconElement.id = 'favicon'
      this._faviconElement.rel = 'shortcut icon'

      document.head.appendChild(this._faviconElement)
    }

    if (direction === 'up') {
      this._faviconElement.href = upFavicon
    } else {
      this._faviconElement.href = downFavicon
    }
  }
}
</script>

<style lang="scss">
header#header {
  background-color: lighten($dark, 10%);
  color: white;
  position: relative;
  height: 16px;

  button,
  .dropdown__selected {
    padding: 2px;
    font-size: 10px;
    line-height: 1;
  }

  div.header__wrapper {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 4px;

    .dropdown__option {
      span {
        margin-right: 1em;
      }
    }
  }

  .header__title {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    margin-top: -2px;

    .pair {
      opacity: 0.5;
    }

    sup {
      line-height: 0;
      opacity: 0.5;

      span {
        font-size: 80%;
        margin-left: 2px;
      }
    }
  }

  .dropdown {
    align-self: stretch;
    .options {
      position: absolute;
    }
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    position: relative;

    align-self: stretch;
    cursor: pointer;

    > span {
      display: inline-block;
      transition: all 0.5s $ease-elastic;
    }

    &.-volume {
      font-size: 12px;
    }
  }

  &:after,
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    display: block;
    background-clip: padding-box;
    transition: background-color 0.4s $ease-out-expo;
  }
}

#app.-loading header#header {
  &:before {
    background-color: rgba(#f6f6f6, 0.1);
    animation: indeterminate-loading-bar-slow 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
  }

  &:after {
    background-color: rgba(#111111, 0.1);
    animation: indeterminate-loading-bar-fast 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
    animation-delay: 1.15s;
  }
}

@keyframes indeterminate-loading-bar-slow {
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
}

@keyframes indeterminate-loading-bar-fast {
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
}
</style>
