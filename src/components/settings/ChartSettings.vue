<template>
  <div class="settings-chart -activable column" :class="{ active: showChart }">
    <div class="form-group -tight">
      <label class="checkbox-control -on-off checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable chart">
        <input type="checkbox" class="form-control" :checked="showChart" @change="$store.commit('settings/TOGGLE_CHART', $event.target.checked)" />
        <div></div>
      </label>
    </div>
    <div class="-fill">
      <div class="form-group mb8">
        <label>
          Refresh chart every
          <editable :content="chartRefreshRate" @output="$store.commit('settings/SET_CHART_REFRESH_RATE', $event)"></editable>&nbsp;ms
        </label>
      </div>
      <p v-if="chartRefreshRate < 500" class="form-feedback"><i class="icon-warning"></i> Low refresh rate can be very CPU intensive</p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'ChartSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string

  get chartRefreshRate() {
    return this.$store.state[this.paneId].chartRefreshRate
  }
}
</script>
