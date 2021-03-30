<template>
  <div class="settings-stats settings-section -activable column" :class="{ active: showStats }">
    <div class="settings-section__controls">
      <a href="javascript:void(0);" class="settings-controls__add" v-tippy title="Add a stat" @click="$store.dispatch('settings/createStat')">
        Add
        <i class="icon-add"></i>
      </a>
    </div>
    <div class="form-group -tight">
      <label class="checkbox-control -on-off checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable stats">
        <input type="checkbox" class="form-control" :checked="showStats" @change="$store.commit('settings/TOGGLE_STATS', $event.target.checked)" />
        <div></div>
      </label>
    </div>
    <div class="form-group -fill">
      <div class="column">
        <div class="form-group -fill">
          <input
            type="text"
            class="form-control"
            :value="statsWindowStringified"
            placeholder="Window (minutes)"
            @change="$store.commit('settings/SET_STATS_WINDOW', $event.target.value)"
          />
        </div>
        <div class="form-group -tight">
          <label class="checkbox-control checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable graph">
            <input
              type="checkbox"
              class="form-control"
              :checked="statsChart"
              @change="$store.commit('settings/TOGGLE_STATS_CHART', $event.target.checked)"
            />
            <div></div>
          </label>
        </div>
      </div>
      <div v-for="counter in statsCounters" :key="counter.id" class="column mt8">
        <div class="form-group -tight">
          <label class="checkbox-control -on-off checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable counter">
            <input
              type="checkbox"
              class="form-control"
              :checked="counter.enabled"
              @change="$store.dispatch('settings/updateStat', { id: counter.id, prop: 'enabled', value: $event.target.checked })"
            />
            <div></div>
          </label>
        </div>
        <div class="form-group -fill -center">
          {{ counter.name }}
        </div>
        <div class="form-group -tight">
          <button class="btn -green" @click="openStat(counter.id)"><i class="icon-edit"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import StatDialog from '@/components/stats/StatDialog.vue'
import { Component, Vue } from 'vue-property-decorator'
import { getHms } from '@/utils/helpers'

@Component({
  name: 'StatsSettings'
})
export default class extends Vue {
  get showStats() {
    return this.$store.state.settings.showStats
  }

  get statsChart() {
    return this.$store.state.settings.statsChart
  }

  get statsCounters() {
    return Object.keys(this.$store.state.settings.statsCounters).map(id => this.$store.state.settings.statsCounters[id])
  }

  get statsWindow() {
    return this.$store.state.settings.statsWindow
  }

  get statsWindowStringified() {
    return getHms(this.statsWindow || 0)
  }

  openStat(id) {
    dialogService.open(StatDialog, { id })
  }
}
</script>
