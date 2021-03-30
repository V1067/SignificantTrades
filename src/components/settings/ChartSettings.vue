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
      <div class="form-group mb8">
        <label class="checkbox-control flex-left">
          <input
            type="checkbox"
            class="form-control"
            :checked="!!timezoneOffset"
            @change="$store.commit('settings/SET_TIMEZONE_OFFSET', !timezoneOffset ? new Date().getTimezoneOffset() * 60000 * -1 : 0)"
          />
          <div></div>
          <span>Show local time</span>
        </label>
      </div>
      <div class="form-group column mb8">
        <verte
          :value="chartBackgroundColor"
          @input="$event !== chartBackgroundColor && $store.dispatch('settings/setBackgroundColor', $event)"
        ></verte>
        <label class="-fill -center ml8">Background color</label>
      </div>
      <div class="form-group column mb8">
        <verte
          picker="square"
          menuPosition="left"
          model="rgb"
          :value="chartColor"
          @input="$event !== chartColor && $store.commit('settings/SET_CHART_COLOR', $event)"
        ></verte>
        <label for="" class="-fill -center ml8"
          >Text color <a><i class="icon-cross text-small" v-if="chartColor" @click="$store.commit('settings/SET_CHART_COLOR', null)"></i></a
        ></label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'ChartSettings'
})
export default class extends Vue {
  get showChart() {
    return this.$store.state.settings.showChart
  }

  get chartRefreshRate() {
    return this.$store.state.settings.chartRefreshRate
  }

  get timezoneOffset() {
    return this.$store.state.settings.timezoneOffset
  }

  get chartBackgroundColor() {
    return this.$store.state.settings.chartBackgroundColor
  }

  get chartColor() {
    return this.$store.state.settings.chartColor
  }
}
</script>
