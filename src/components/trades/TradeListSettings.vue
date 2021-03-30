<template>
  <div>
    <div class="column mb8">
      <div class="form-group -fill">
        <label>
          Max rows
          <span class="icon-info" title="Numbers of trades to keep visible" v-tippy></span>
        </label>
        <input
          type="number"
          min="0"
          max="1000"
          step="1"
          class="form-control"
          :value="maxRows"
          @change="$store.commit('settings/SET_MAX_ROWS', $event.target.value)"
        />
      </div>

      <div class="form-group -tight" title="Show exchange's logo when available" v-tippy>
        <label>Logo</label>
        <label class="checkbox-control checkbox-control-input flex-right">
          <input type="checkbox" class="form-control" :checked="showLogos" @change="$store.commit('settings/TOGGLE_LOGOS', $event.target.checked)" />
          <div></div>
        </label>
      </div>

      <div class="form-group -tight" title="Toggle aggregation" v-tippy>
        <label>Aggr.</label>
        <label
          class="checkbox-control -aggr checkbox-control-input flex-right"
          @change="$store.commit('settings/TOGGLE_AGGREGATION', $event.target.checked)"
        >
          <input type="checkbox" class="form-control" :checked="aggregateTrades" />
          <div></div>
        </label>
      </div>

      <div class="form-group -tight" title="ONLY show liquidation" v-tippy>
        <label class="condensed"><small>Rip only</small></label>
        <label
          class="checkbox-control -rip checkbox-control-input flex-right"
          @change="$store.commit('settings/TOGGLE_LIQUIDATIONS_ONLY', $event.target.checked)"
        >
          <input type="checkbox" class="form-control" :checked="liquidationsOnly" />
          <div></div>
        </label>
      </div>
    </div>

    <div class="form-group mb8">
      <label
        class="checkbox-control -slippage"
        :title="
          calculateSlippage === 'price'
            ? 'Show slippage in $'
            : calculateSlippage === 'bps'
            ? 'Show slippage in basis point (bps)'
            : 'Slippage disabled'
        "
        v-tippy="{ placement: 'left' }"
      >
        <input type="checkbox" class="form-control" :checked="calculateSlippage" @change="$store.commit('settings/TOGGLE_SLIPPAGE')" />
        <div></div>
        <span v-if="calculateSlippage === 'price'"> Calculate slippage in price difference (<i class="icon-dollar"></i>) </span>
        <span v-if="calculateSlippage === 'bps'"> Calculate slippage in bps <i class="icon-bps"></i> </span>
        <span v-if="!calculateSlippage">Do not show slippage</span>
      </label>
    </div>

    <div class="form-group mb8">
      <label class="checkbox-control" v-tippy="{ placement: 'left' }" title="eg: BTC-USD">
        <input type="checkbox" class="form-control" :checked="showTradesPairs" @change="$store.commit('settings/TOGGLE_TRADES_PAIRS')" />
        <div></div>
        <span>Trades symbols are {{ showTradesPairs ? 'visible' : 'hidden' }}</span>
      </label>
    </div>

    <div class="form-group">
      <label class="checkbox-control checkbox-control-input -auto" v-tippy="{ placement: 'left' }" title="Size display preference">
        <input
          type="checkbox"
          class="form-control"
          :checked="preferQuoteCurrencySize"
          @change="$store.commit('settings/SET_QUOTE_AS_PREFERED_CURRENCY', $event.target.checked)"
        />
        <span>Size in</span>
        <div on="quote currency" off="base currency"></div>
        <span>(<i :class="preferQuoteCurrencySize ? 'icon-quote' : 'icon-base'"></i>)</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'TradeListSettings'
})
export default class extends Vue {
  get maxRows() {
    return this.$store.state.settings.maxRows
  }

  get showLogos() {
    return this.$store.state.settings.showLogos
  }

  get aggregateTrades() {
    return this.$store.state.settings.aggregateTrades
  }

  get liquidationsOnly() {
    return this.$store.state.settings.liquidationsOnly
  }

  get calculateSlippage() {
    return this.$store.state.settings.calculateSlippage
  }

  get preferQuoteCurrencySize() {
    return this.$store.state.settings.preferQuoteCurrencySize
  }

  get showTradesPairs() {
    return this.$store.state.settings.showTradesPairs
  }
}
</script>
