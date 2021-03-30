<template>
  <div class="settings-counters -activable column" :class="{ active: showCounters }">
    <div class="form-group -tight">
      <label class="checkbox-control -on-off checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable counters">
        <input
          type="checkbox"
          class="form-control"
          :checked="showCounters"
          @change="$store.commit('settings/TOGGLE_COUNTERS', $event.target.checked)"
        />
        <div></div>
      </label>
    </div>
    <div class="form-group -tight">
      <label
        class="checkbox-control checkbox-control-input -auto flex-right"
        v-tippy="{ placement: 'bottom' }"
        title="Sum amount of trades instead of volume"
      >
        <input
          type="checkbox"
          class="form-control"
          :checked="countersCount"
          @change="$store.commit('settings/TOGGLE_COUNTERS_COUNT', $event.target.checked)"
        />
        <div on="count" off="volume"></div>
      </label>
    </div>
    <div class="form-group -fill">
      <input
        v-tippy
        title="Counters step separed by a comma (ie: 1m, 5m, 10m, 15m)"
        type="string"
        placeholder="Enter a set of timeframe (ie 1m, 15m)"
        class="form-control"
        :value="countersStepsStringified"
        @change="replaceCounters($event.target.value)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { ago } from '@/utils/helpers'
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'CountersSettings'
})
export default class extends Vue {
  get showCounters() {
    return this.$store.state.settings.showCounters
  }

  get countersCount() {
    return this.$store.state.settings.countersCount
  }

  get countersSteps() {
    return this.$store.state.settings.countersSteps
  }

  get countersStepsStringified() {
    const now = +new Date()

    return this.countersSteps.map(a => ago(now - a)).join(', ')
  }

  replaceCounters(value) {
    const counters = value
      .split(',')
      .map(a => {
        a = a.trim()

        if (/[\d.]+s/.test(a)) {
          return parseFloat(a) * 1000
        } else if (/[\d.]+h/.test(a)) {
          return parseFloat(a) * 1000 * 60 * 60
        } else {
          return parseFloat(a) * 1000 * 60
        }
      })
      .filter(function(item, pos, self) {
        return self.indexOf(item) == pos
      })

    if (counters.filter(a => isNaN(a)).length) {
      this.$store.dispatch('app/showNotice', {
        type: 'error',
        title: `Counters (${value}) contains invalid steps.`
      })
      return
    }

    this.$store.commit('settings/REPLACE_COUNTERS', counters)
  }
}
</script>
