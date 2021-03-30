<template>
  <div class="settings-thresholds settings-section">
    <div class="settings-section__controls">
      <a
        href="javascript:void(0);"
        class="settings-thresholds__display-toggle"
        v-tippy
        title="Switch thresholds display"
        @click="$store.commit('settings/TOGGLE_THRESHOLDS_TABLE', !showThresholdsAsTable)"
        >{{ showThresholdsAsTable ? 'slider' : 'table' }}</a
      >
      |
      <a href="javascript:void(0);" class="settings-section__add" v-tippy title="Add threshold" @click="$store.commit('settings/ADD_THRESHOLD')">
        Add
        <i class="icon-add"></i>
      </a>
    </div>
    <Thresholds />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import Thresholds from '@/components/settings/Thresholds.vue'

@Component({
  name: 'ThresholdSettings',
  components: {
    Thresholds
  }
})
export default class extends Vue {
  get thresholds() {
    return this.$store.state.settings.thresholds
  }

  get showThresholdsAsTable() {
    return this.$store.state.settings.showThresholdsAsTable
  }
}
</script>
