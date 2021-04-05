<template>
  <div class="settings-stats settings-section">
    <div class="settings-section__controls">
      <a href="javascript:void(0);" class="settings-controls__add" v-tippy title="Add a stat" @click="$store.dispatch(paneId + '/createStat')">
        Add
        <i class="icon-add"></i>
      </a>
    </div>
    <div class="form-group -fill">
      <div class="column">
        <div class="form-group -fill">
          <input
            type="text"
            class="form-control"
            :value="statsWindowStringified"
            placeholder="Window (minutes)"
            @change="$store.commit(paneId + '/SET_STATS_WINDOW', $event.target.value)"
          />
        </div>
        <div class="form-group -tight">
          <label class="checkbox-control checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable graph">
            <input
              type="checkbox"
              class="form-control"
              :checked="statsChart"
              @change="$store.commit(paneId + '/TOGGLE_STATS_CHART', $event.target.checked)"
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
              @change="$store.dispatch(paneId + '/updateStat', { id: counter.id, prop: 'enabled', value: $event.target.checked })"
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
  name: 'StatsSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string

  get chart() {
    return this.$store.state[this.paneId].chart
  }

  get buckets() {
    return Object.keys(this.$store.state[this.paneId].buckets).map(id => this.$store.state[this.paneId].buckets[id])
  }

  get window() {
    return this.$store.state[this.paneId].window
  }

  get statsWindowStringified() {
    return getHms(this.window || 0)
  }

  openStat(id) {
    dialogService.open(StatDialog, { statId: id })
  }
}
</script>
