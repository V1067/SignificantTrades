<template>
  <div class="settings-audio mb8 -activable column" :class="{ active: useAudio }">
    <div class="form-group -tight">
      <label class="checkbox-control -on-off checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable audio">
        <input type="checkbox" class="form-control" :checked="useAudio" @change="$store.commit('settings/TOGGLE_AUDIO', $event.target.checked)" />
        <div></div>
      </label>
    </div>
    <div class="form-group -tight">
      <label class="checkbox-control checkbox-control-input flex-right" v-tippy title="Include orders down to 10% of significant orders">
        <input
          type="checkbox"
          class="form-control"
          :checked="audioIncludeInsignificants"
          @change="$store.commit('settings/TOGGLE_AUDIO_TEN_PERCENT', $event.target.checked)"
        />
        <div class="icon-expand"></div>
      </label>
    </div>
    <div class="form-group -fill">
      <input
        type="range"
        min="0"
        max="10"
        step=".1"
        :title="'ajust gain (' + audioVolume + ')'"
        v-tippy="{ placement: 'top' }"
        :value="audioVolume"
        @change="$store.commit('settings/SET_AUDIO_VOLUME', $event.target.value)"
      />
    </div>
    <div class="form-group -fill">
      <input
        type="range"
        min=".25"
        max="2.5"
        step=".05"
        :value="audioPitch"
        :title="'ajust pitch (' + audioPitch + ')'"
        v-tippy="{ placement: 'top' }"
        @change="$store.commit('settings/SET_AUDIO_PITCH', $event.target.value)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'AudioSettings'
})
export default class extends Vue {
  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get audioIncludeInsignificants() {
    return this.$store.state.settings.audioIncludeInsignificants
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  get audioPitch() {
    return this.$store.state.settings.audioPitch
  }
}
</script>
