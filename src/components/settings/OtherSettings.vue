<template>
  <div>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="!!decimalPrecision"
          @change="$store.commit('settings/SET_DECIMAL_PRECISION', decimalPrecision ? null : 2)"
        />
        <div></div>
        <span @click.stop.prevent="$event.currentTarget.children[0].focus()">
          Round up to
          <editable placeholder="auto" :content="decimalPrecision" @output="$store.commit('settings/SET_DECIMAL_PRECISION', $event)"></editable
          >&nbsp;decimal(s)
        </span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control -animations">
        <input type="checkbox" class="form-control" :checked="disableAnimations" @change="$store.commit('settings/TOGGLE_ANIMATIONS')" />
        <div></div>
        <span>Animation are {{ disableAnimations ? 'disabled' : 'enabled' }} globaly 🚀</span>
      </label>
    </div>
    <div class="-activable column" :class="{ active: showExchangesBar }">
      <div class="form-group -tight">
        <label class="checkbox-control">
          <input
            type="checkbox"
            id="showExchangesBar"
            class="form-control"
            :checked="showExchangesBar"
            @change="$store.commit('settings/TOGGLE_EXCHANGES_BAR', $event.target.checked)"
          />
          <div></div>
        </label>
      </div>
      <div class="-fill form-group">
        <div class="form-group mb8">
          <label for="showExchangesBar">
            Show exchanges bar
          </label>
        </div>
        <div class="form-group">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :disabled="disableAnimations"
              :checked="animateExchangesBar"
              @change="$store.commit('settings/TOGGLE_EXCHANGES_BAR_ANIMATION', $event.target.checked)"
            />
            <div></div>
            <span>Animate order change</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'OtherSettings'
})
export default class extends Vue {
  get decimalPrecision() {
    return this.$store.state.settings.decimalPrecision
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }

  get showExchangesBar() {
    return this.$store.state.settings.showExchangesBar
  }

  get animateExchangesBar() {
    return this.$store.state.settings.animateExchangesBar
  }
}
</script>
