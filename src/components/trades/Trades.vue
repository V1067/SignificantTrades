<template>
  <div class="pane-trades custom-scrollbar" :class="{ [scale]: true, '-logos': this.showLogos, '-slippage': this.calculateSlippage }">
    <pane-header :paneId="paneId" />
    <ul ref="tradesContainer"></ul>
    <div v-if="!tradesCount" class="trade -empty">Nothing to show, yet.</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { ago, formatPrice, formatAmount, slugify } from '../../utils/helpers'
import { getColorByWeight, getColorLuminance, getAppBackgroundColor, splitRgba, getLogShade } from '../../utils/colors'

import aggregatorService from '@/services/aggregatorService'
import sfxService from '../../services/sfxService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'
import { Trade } from '@/types/test'

const GIFS = {} // gifs from storages, by threshold gif keyword

@Component({
  components: { PaneHeader },
  name: 'Trades'
})
export default class extends Mixins(PaneMixin) {
  tradesCount = 0
  scale = '-normal'

  private _onStoreMutation: () => void

  private _colors: {
    threshold: number
    range: number
    buy: {
      from: number[]
      to: number[]
      fromLuminance: number
      toLuminance: number
    }
    sell: {
      from: number[]
      to: number[]
      fromLuminance: number
      toLuminance: number
    }
  }[]
  private _lastTradeTimestamp: number
  private _lastSide: 'buy' | 'sell'
  private _minimumAmount: number
  private _significantAmount: number
  private _activeExchanges: { [exchange: string]: boolean }
  private _multipliers: { [identifier: string]: number }
  private _paneMarkets: { [identifier: string]: boolean }
  private _timeAgoInterval: number

  get maxRows() {
    return this.$store.state[this.paneId].maxRows
  }

  get thresholds() {
    return this.$store.state[this.paneId].thresholds
  }

  get liquidationsOnly() {
    return this.$store.state[this.paneId].liquidationsOnly
  }

  get showTradesPairs() {
    return this.$store.state[this.paneId].showTradesPairs
  }

  get showLogos() {
    return this.$store.state[this.paneId].showLogos
  }

  get multipliers() {
    return this.$store.state[this.paneId].multipliers
  }

  get exchanges() {
    return this.$store.state.exchanges
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get calculateSlippage() {
    return this.$store.state.settings.calculateSlippage
  }

  get audioIncludeInsignificants() {
    return this.$store.state.settings.audioIncludeInsignificants
  }

  get preferQuoteCurrencySize() {
    return this.$store.state.settings.preferQuoteCurrencySize
  }

  get decimalPrecision() {
    return this.$store.state.settings.decimalPrecision
  }

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  $refs!: {
    tradesContainer: HTMLElement
  }

  created() {
    this.cacheFilters()

    this.retrieveStoredGifs()
    this.prepareColorsSteps()

    aggregatorService.on('trades', this.onTrades)

    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'app/EXCHANGE_UPDATED':
        case this.paneId + '/SET_THRESHOLD_MULTIPLIER':
          this.cacheFilters()
          break
        case 'panes/SET_PANE_MARKETS':
          if (mutation.payload.id === this.paneId) {
            this.cacheFilters()
            this.clearList()
          }
          break
        case 'settings/TOGGLE_AUDIO':
          if (mutation.payload) {
            sfxService.connect()
          } else {
            sfxService.disconnect()
          }
          break
        case this.paneId + '/SET_THRESHOLD_GIF':
          this.fetchGifByKeyword(mutation.payload.value, mutation.payload.isDeleted)
          break
        case 'settings/SET_CHART_BACKGROUND_COLOR':
        case this.paneId + '/SET_THRESHOLD_COLOR':
        case this.paneId + '/SET_THRESHOLD_AMOUNT':
        case this.paneId + '/DELETE_THRESHOLD':
        case this.paneId + '/ADD_THRESHOLD':
          this.prepareColorsSteps()
          break
      }
    })
  }
  mounted() {
    if (this.useAudio) {
      sfxService.connect()
    }

    this._timeAgoInterval = setInterval(() => {
      const elements = this.$el.getElementsByClassName('-timestamp')

      if (!elements.length) {
        return
      }

      let ref

      for (let i = elements.length - 1; i >= 0; i--) {
        const txt = ago(elements[i].getAttribute('timestamp'))

        if (typeof ref !== 'undefined' && ref === txt) {
          elements[i].textContent = ''
          elements[i].className = 'trade__date'
          i--
          continue
        }

        if (txt !== elements[i].textContent) {
          elements[i].textContent = txt
        }

        ref = txt
      }
    }, 2500)
  }

  beforeDestroy() {
    aggregatorService.off('trades', this.onTrades)

    this._onStoreMutation()

    clearInterval(this._timeAgoInterval)

    sfxService.disconnect()
  }

  onTrades(trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
      const identifier = trades[i].exchange + trades[i].pair

      if (!this._activeExchanges[trades[i].exchange] || !this._paneMarkets[identifier]) {
        continue
      }

      const trade = trades[i]
      const amount = trade.size * (this.preferQuoteCurrencySize ? trade.price : 1)
      const multiplier = this._multipliers[identifier]

      if (trade.liquidation) {
        if (this.useAudio && amount > this._significantAmount * multiplier * 0.1) {
          sfxService.liquidation((amount / this._significantAmount) * multiplier)
        }

        if (amount >= this._minimumAmount * multiplier) {
          let liquidationMessage = `<i class="icon-currency"></i> <strong>${formatAmount(amount, 1)}</strong>`

          liquidationMessage += `&nbsp;liq<span class="-large">uidate</span>d <strong>${
            trade.side === 'buy' ? 'SHORT' : 'LONG'
          }</strong> @<i class="icon-quote ml4"></i> ${formatPrice(trade.price)}`

          this.appendRow(trade, amount, multiplier, '-liquidation', liquidationMessage)
        }
        continue
      } else if (this.liquidationsOnly) {
        continue
      }

      if (amount >= this._minimumAmount * multiplier) {
        this.appendRow(trade, amount, multiplier)
      } else {
        if (this.useAudio && this.audioIncludeInsignificants && amount >= this._significantAmount * 0.1) {
          sfxService.tradeToSong(amount / (this._significantAmount * multiplier), trade.side, 0)
        }
      }
    }
  }

  appendRow(trade: Trade, amount, multiplier, classname = '', message = null) {
    if (!this.tradesCount) {
      this.$forceUpdate()
    }

    this.tradesCount++

    const li = document.createElement('li')
    li.className = ('trade ' + classname).trim()
    li.className += ' -' + trade.exchange

    li.className += ' -' + trade.side

    if (trade.exchange.length > 10) {
      li.className += ' -sm'
    }

    if (amount >= this._significantAmount * multiplier) {
      li.className += ' -significant'
    }

    for (let i = 0; i < this.thresholds.length; i++) {
      li.className += ' -level-' + i

      if (!this.thresholds[i + 1] || amount < this.thresholds[i + 1].amount * multiplier) {
        // THIS IS OUR THRESHOLD
        const color = this._colors[Math.min(this.thresholds.length - 2, i)]
        const threshold = this.thresholds[i]

        if (!this.disableAnimations && threshold.gif && GIFS[threshold.gif]) {
          // get random gif for this threshold
          li.style.backgroundImage = `url('${GIFS[threshold.gif][Math.floor(Math.random() * (GIFS[threshold.gif].length - 1))]}`
        }

        // percentage to next threshold
        const percentToNextThreshold = (Math.max(amount, color.threshold) - color.threshold) / color.range

        // 0-255 luminance of nearest color
        const luminance = color[trade.side][(percentToNextThreshold < 0.5 ? 'from' : 'to') + 'Luminance']

        // background color simple color to color based on percentage of amount to next threshold
        const backgroundColor = getColorByWeight(color[trade.side].from, color[trade.side].to, percentToNextThreshold)
        li.style.backgroundColor = 'rgb(' + backgroundColor[0] + ', ' + backgroundColor[1] + ', ' + backgroundColor[2] + ')'
        if (i >= 1) {
          // ajusted amount > this._significantAmount
          // only pure black or pure white foreground
          li.style.color = luminance < 144 ? 'white' : 'black'
        } else {
          // take background color and apply logarithmic shade based on amount to this._significantAmount percentage
          // darken if luminance of background is high, lighten otherwise
          const thrs = Math.max(percentToNextThreshold, 0.25)
          li.style.color = getLogShade(backgroundColor, thrs * (luminance < 144 ? 1.5 : -3))
        }

        if (this.useAudio && amount >= (this.audioIncludeInsignificants ? this._significantAmount * 0.1 : this._minimumAmount * 1) * multiplier) {
          sfxService.tradeToSong(amount / (this._significantAmount * multiplier), trade.side, i)
        }

        break
      }
    }

    if (!message) {
      if (trade.side !== this._lastSide) {
        const side = document.createElement('div')
        side.className = 'trade__side icon-side'
        li.appendChild(side)
      }

      this._lastSide = trade.side
    }

    const exchange = document.createElement('div')
    exchange.className = 'trade__exchange'
    exchange.innerText = trade.exchange.replace('_', ' ')
    exchange.setAttribute('title', trade.exchange)
    li.appendChild(exchange)

    if (this.showTradesPairs) {
      const pair = document.createElement('div')
      pair.className = 'trade__pair'
      pair.innerText = trade.pair.replace('_', ' ')
      pair.setAttribute('title', trade.pair)
      li.appendChild(pair)
    }

    if (message) {
      const message_div = document.createElement('div')
      message_div.className = 'trade__message'
      message_div.innerHTML = message
      li.appendChild(message_div)
    } else {
      const price = document.createElement('div')
      price.className = 'trade__price'
      price.innerHTML = `<span class="icon-quote"></span> <span>${formatPrice(trade.price)}</span>`
      li.appendChild(price)

      if (this.calculateSlippage === 'price' && Math.abs(trade.slippage) / trade.price > 0.0001) {
        price.setAttribute(
          'slippage',
          (trade.slippage > 0 ? '+' : '') + trade.slippage + document.getElementById('app').getAttribute('data-quote-symbol')
        )
      } else if (this.calculateSlippage === 'bps' && trade.slippage) {
        price.setAttribute('slippage', (trade.slippage > 0 ? '+' : '-') + trade.slippage)
      }

      const amount_div = document.createElement('div')
      amount_div.className = 'trade__amount'

      const amount_quote = document.createElement('span')
      amount_quote.className = 'trade__amount__quote'
      amount_quote.innerHTML = `<span class="icon-quote"></span> <span>${formatAmount(trade.price * trade.size)}</span>`

      const amount_base = document.createElement('span')
      amount_base.className = 'trade__amount__base'
      amount_base.innerHTML = `<span class="icon-base"></span> <span>${formatAmount(trade.size)}</span>`

      amount_div.appendChild(amount_quote)
      amount_div.appendChild(amount_base)
      li.appendChild(amount_div)
    }

    const date = document.createElement('div')
    date.className = 'trade__date'

    const timestamp = Math.floor(trade.timestamp / 1000) * 1000

    if (timestamp !== this._lastTradeTimestamp) {
      this._lastTradeTimestamp = timestamp

      date.setAttribute('timestamp', trade.timestamp.toString())
      date.innerText = ago(timestamp)

      date.className += ' -timestamp'
    }

    li.appendChild(date)

    this.$refs.tradesContainer.prepend(li)

    while (this.tradesCount > this.maxRows) {
      this.tradesCount--
      this.$refs.tradesContainer.removeChild(this.$refs.tradesContainer.lastChild)
    }
  }

  retrieveStoredGifs(refresh = false) {
    this.thresholds.forEach(threshold => {
      if (!threshold.gif || GIFS[threshold.gif]) {
        return
      }

      const slug = slugify(threshold.gif)
      const storage = localStorage ? JSON.parse(localStorage.getItem('threshold_' + slug + '_gifs')) : null

      if (!refresh && storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7) {
        GIFS[threshold.gif] = storage.data
      } else {
        this.fetchGifByKeyword(threshold.gif)
      }
    })
  }

  fetchGifByKeyword(keyword, isDeleted = false) {
    if (!keyword || !GIFS) {
      return
    }

    const slug = slugify(keyword)

    if (isDeleted) {
      if (GIFS[keyword]) {
        delete GIFS[keyword]
      }

      localStorage.removeItem('threshold_' + slug + '_gifs')

      return
    }

    fetch('https://g.tenor.com/v1/search?q=' + keyword + '&key=LIVDSRZULELA&limit=100&key=DF3B0979C761')
      .then(res => res.json())
      .then(res => {
        if (!res.results || !res.results.length) {
          return
        }

        GIFS[keyword] = []

        for (const item of res.results) {
          GIFS[keyword].push(item.media[0].gif.url)
        }

        localStorage.setItem(
          'threshold_' + slug + '_gifs',
          JSON.stringify({
            timestamp: +new Date(),
            data: GIFS[keyword]
          })
        )
      })
  }
  prepareColorsSteps() {
    const appBackgroundColor = getAppBackgroundColor()

    this._colors = []
    this._minimumAmount = this.thresholds[0].amount
    this._significantAmount = this.thresholds[1].amount

    for (let i = 0; i < this.thresholds.length - 1; i++) {
      const buyFrom = splitRgba(this.thresholds[i].buyColor, appBackgroundColor)
      const buyTo = splitRgba(this.thresholds[i + 1].buyColor, appBackgroundColor)
      const sellFrom = splitRgba(this.thresholds[i].sellColor, appBackgroundColor)
      const sellTo = splitRgba(this.thresholds[i + 1].sellColor, appBackgroundColor)

      this._colors.push({
        threshold: this.thresholds[i].amount,
        range: this.thresholds[i + 1].amount - this.thresholds[i].amount,
        buy: {
          from: buyFrom,
          to: buyTo,
          fromLuminance: getColorLuminance(buyFrom),
          toLuminance: getColorLuminance(buyTo)
        },
        sell: {
          from: sellFrom,
          to: sellTo,
          fromLuminance: getColorLuminance(sellFrom),
          toLuminance: getColorLuminance(sellTo)
        }
      })
    }
  }

  clearList() {
    this.$refs.tradesContainer.innerHTML = ''
    this.tradesCount = 0
  }

  cacheFilters() {
    this._activeExchanges = { ...this.activeExchanges }
    this._multipliers = {}
    this._paneMarkets = this.$store.state.panes.panes[this.paneId].markets.reduce((output, market) => {
      const identifier = market.replace(/:/g, '')
      const multiplier = this.multipliers[identifier]

      this._multipliers[identifier] = !isNaN(multiplier) ? multiplier : 1

      output[identifier] = true
      return output
    }, {})
  }
}
</script>

<style lang="scss">
@mixin tradesVariant($base: 20) {
  font-size: $base * 0.7px;
  .trade {
    height: round($base * 1px);

    &.-level-1 {
      height: round($base * 1.1px);
    }

    &.-level-2 {
      height: round($base * 1.33px);
      font-weight: 600;
    }

    &.-level-3 {
      font-size: round($base * 0.8px);
      height: round($base * 1.5px);
    }
  }
}

@keyframes highlight {
  0% {
    opacity: 0.75;
  }

  100% {
    opacity: 0;
  }
}

.pane-trades {
  line-height: 1;
  overflow: auto;

  ul {
    margin: 0;
    padding: 0;
  }

  &.-normal ul {
    @include tradesVariant(22);
  }

  &.-small ul {
    @include tradesVariant(18);

    .-large {
      display: none;
    }
  }

  &.-large ul {
    @include tradesVariant(24);
  }

  &.-wide ul {
    @include tradesVariant(26);
  }

  &.-slippage {
    .trade__price {
      flex-grow: 1.5;
    }
  }

  &.-logos {
    .trade__exchange {
      text-indent: -9999px;
      flex-basis: 0;
      flex-grow: 0.4;
    }

    @each $exchange in $exchanges {
      .-#{$exchange} .trade__exchange {
        background-image: url('../../assets/exchanges/#{$exchange}.svg');
      }
    }

    .-liquidation {
      .trade__exchange {
        position: absolute;
        width: 1em;
      }
    }
  }

  &:not(.-logos) .trade.-sm {
    .trade__exchange {
      font-size: 0.75em;
      letter-spacing: -0.5px;
      margin-top: -5px;
      margin-bottom: -5px;
      white-space: normal;
      word-break: break-word;
      line-height: 0.9;
    }

    &.-liquidation .trade__exchange {
      max-width: 4em;
    }
  }
}

.trade {
  display: flex;
  flex-flow: row nowrap;
  background-position: center center;
  background-size: cover;
  background-blend-mode: exclusion;
  position: relative;
  align-items: center;
  height: 1.8em;
  padding: 0 0.5em 2px;

  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0;
    background-color: white;
    animation: 1s $ease-out-expo highlight;
    pointer-events: none;
  }

  &.-empty {
    justify-content: center;
    padding: 20px;
    font-size: 0.8rem;

    &:after {
      display: none;
    }
  }

  &.-sell {
    background-color: lighten($red, 35%);
    color: $red;

    .icon-side:before {
      content: unicode($icon-down);
    }
  }

  &.-buy {
    background-color: lighten($green, 50%);
    color: $green;

    .icon-side:before {
      content: unicode($icon-up);
    }
  }

  &.-level-1 {
    color: white;
  }

  &.-level-3 {
    box-shadow: 0 0 20px rgba(red, 0.5);
    z-index: 1;
  }

  > div {
    flex-grow: 1;
    flex-basis: 0;
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.5;
  }

  .trade__side {
    flex-grow: 0;
    flex-basis: 1em;
    font-size: 1em;
    position: absolute;

    + .trade__message {
      margin-left: 0.5em;
    }
  }

  .icon-currency,
  .icon-quote,
  .icon-base {
    line-height: 0;
  }

  .trade__exchange {
    background-repeat: no-repeat;
    background-position: center center;
    flex-grow: 0.75;
    margin-left: 5%;
    line-height: 1;

    small {
      opacity: 0.8;
    }
  }

  &.-liquidation {
    background-color: $pink !important;
    color: white !important;

    .trade__exchange {
      flex-grow: 0;
      flex-basis: auto;
      margin-left: 0;
    }
  }

  .trade__price:after {
    content: attr(slippage);
    font-size: 80%;
    position: relative;
    top: -2px;
    left: 2px;
    opacity: 0.75;
  }

  .trade__amount {
    flex-grow: 1;
    position: relative;

    > span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: transform 0.1s ease-in-out;
      display: block;

      &.trade__amount__quote {
        position: absolute;
      }

      &.trade__amount__base {
        transform: translateX(25%);
        opacity: 0;
      }
    }

    &:hover {
      > span.trade__amount__base {
        transform: none;
        opacity: 1;
      }

      > span.trade__amount__quote {
        transform: translateX(-25%);
        opacity: 0;
      }
    }
  }

  .trade__date {
    text-align: right;
    flex-basis: 2em;
    flex-grow: 0;
  }

  .trade__message {
    flex-grow: 2;
    text-align: center;
    font-size: 90%;
    line-height: 1.5;

    + .trade__date {
      overflow: visible;
      flex-basis: auto;
      font-size: 0.8em;
      margin-left: -0.2em;
    }
  }
}

#app[data-prefered-sizing-currency='base'] .trade .trade__amount {
  .trade__amount__quote {
    transform: translateX(-25%);
    opacity: 0;
  }

  .trade__amount__base {
    transform: none;
    opacity: 1;
  }

  &:hover {
    > span.trade__amount__base {
      transform: translateX(25%);
      opacity: 0;
    }

    > span.trade__amount__quote {
      transform: none;
      opacity: 1;
    }
  }
}
</style>
