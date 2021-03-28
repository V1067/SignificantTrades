<template>
  <div
    id="app"
    :data-prefered-sizing-currency="preferedSizingCurrency"
    :data-base="baseCurrency"
    :data-base-symbol="baseCurrencySymbol"
    :data-quote="quoteCurrency"
    :data-quote-symbol="quoteCurrencySymbol"
    :class="{
      '-loading': isLoading,
      '-no-animations': disableAnimations,
      '-light': chartTheme === 'light'
    }"
    v-background
  >
    <Notices />
    <Settings v-if="showSettings" />
    <div class="app__wrapper">
      <Header />
      <SearchProducts />

      <div class="app__layout">
        <div class="app__left">
          <Chart v-if="showChart" />
          <ExchangesBar v-if="showChart && showExchangesBar" />
        </div>
        <div class="app__right">
          <Counters v-if="showCounters" />
          <Stats v-if="showStats" />
          <TradeList />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import aggregatorService from './services/aggregatorService'

import Notices from './components/ui/Notices.vue'
import Header from './components/ui/Header.vue'
import Settings from './components/Settings.vue'
import SearchProducts from './components/SearchProducts.vue'

import ExchangesBar from '@/components/ExchangesBar.vue'
import TradeList from '@/components/TradeList.vue'
import Chart from '@/components/chart/Chart.vue'
import Counters from '@/components/Counters.vue'
import Stats from '@/components/Stats.vue'
import { boot } from './store'

@Component({
  name: 'App',
  components: {
    Header,
    SearchProducts,
    Settings,
    Notices,

    TradeList,
    Chart,
    Counters,
    Stats,
    ExchangesBar
  }
})
export default class extends Vue {
  get showSettings() {
    return this.$store.state.app.showSettings
  }

  get isLoading() {
    return this.$store.state.app.isLoading
  }

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  get chartBackgroundColor() {
    return this.$store.state.settings.chartBackgroundColor
  }

  get chartTheme() {
    return this.$store.state.settings.chartTheme
  }

  get showExchangesBar() {
    return this.$store.state.settings.showExchangesBar
  }

  get showChart() {
    return this.$store.state.settings.showChart
  }

  get showCounters() {
    return this.$store.state.settings.showCounters
  }

  get showStats() {
    return this.$store.state.settings.showStats
  }
  get pairs() {
    return this.$store.state.settings.pairs
  }

  get preferedSizingCurrency() {
    return this.$store.state.settings.preferQuoteCurrencySize ? 'quote' : 'base'
  }

  get baseCurrency() {
    return this.$store.state.app.baseCurrency
  }

  get baseCurrencySymbol() {
    return this.$store.state.app.baseCurrencySymbol
  }

  get quoteCurrency() {
    return this.$store.state.app.quoteCurrency
  }

  get quoteCurrencySymbol() {
    return this.$store.state.app.quoteCurrencySymbol
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  async created() {
    await boot()

    await aggregatorService.initialize()

    await aggregatorService.fetchProducts()

    await aggregatorService.connect(this.pairs)
  }
}
</script>
