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
          @change="$store.commit(paneId + '/SET_MAX_ROWS', $event.target.value)"
        />
      </div>

      <div class="form-group -tight" title="Show exchange's logo when available" v-tippy>
        <label>Logo</label>
        <label class="checkbox-control checkbox-control-input flex-right">
          <input type="checkbox" class="form-control" :checked="showLogos" @change="$store.commit(paneId + '/TOGGLE_LOGOS', $event.target.checked)" />
          <div></div>
        </label>
      </div>
    </div>

    <div class="form-group mb8">
      <label class="checkbox-control" v-tippy="{ placement: 'left' }" title="eg: BTC-USD">
        <input type="checkbox" class="form-control" :checked="showTradesPairs" @change="$store.commit(paneId + '/TOGGLE_TRADES_PAIRS')" />
        <div></div>
        <span>Trades symbols are {{ showTradesPairs ? 'visible' : 'hidden' }}</span>
      </label>
    </div>

    <div class="form-group mb8">
      <label class="checkbox-control -rip" @change="$store.commit(paneId + '/TOGGLE_LIQUIDATIONS_ONLY', $event.target.checked)">
        <input type="checkbox" class="form-control" :checked="liquidationsOnly" />
        <div></div>
        <span>List will {{ liquidationsOnly ? 'only show liquidation' : 'show trades and liquidations' }}</span>
      </label>
    </div>

    <div class="settings-thresholds settings-section">
      <div class="settings-section__controls">
        <a
          href="javascript:void(0);"
          class="settings-thresholds__display-toggle"
          v-tippy
          title="Switch thresholds display"
          @click="$store.commit(paneId + '/TOGGLE_THRESHOLDS_TABLE', !showThresholdsAsTable)"
          >{{ showThresholdsAsTable ? 'slider' : 'table' }}</a
        >
        |
        <a href="javascript:void(0);" class="settings-section__add" v-tippy title="Add threshold" @click="$store.commit(paneId + '/ADD_THRESHOLD')">
          Add
          <i class="icon-add"></i>
        </a>
      </div>
      <thresholds :paneId="paneId" />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Thresholds from '../settings/Thresholds.vue'

@Component({
  components: { Thresholds },
  name: 'TradesSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string

  get maxRows() {
    return this.$store.state[this.paneId].maxRows
  }

  get showLogos() {
    return this.$store.state[this.paneId].showLogos
  }

  get liquidationsOnly() {
    return this.$store.state[this.paneId].liquidationsOnly
  }

  get showTradesPairs() {
    return this.$store.state[this.paneId].showTradesPairs
  }

  get thresholds() {
    return this.$store.state[this.paneId].thresholds
  }

  get showThresholdsAsTable() {
    return this.$store.state[this.paneId].showThresholdsAsTable
  }
}
</script>
<style scoped lang="scss">
.checkbox-control {
  &.-rip input ~ div {
    &:before,
    &:after {
      content: unicode($icon-tomb);
    }

    &:before {
      font-size: 1.5em;
    }
  }
}
</style>
