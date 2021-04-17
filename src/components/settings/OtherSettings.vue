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
    <div class="-activable column" :class="{ active: showMarketsBar }">
      <div class="form-group -tight">
        <label class="checkbox-control">
          <input
            type="checkbox"
            id="showMarketsBar"
            class="form-control"
            :checked="showMarketsBar"
            @change="$store.commit('settings/TOGGLE_MARKETS_BAR', $event.target.checked)"
          />
          <div></div>
        </label>
      </div>
      <div class="-fill form-group">
        <div class="form-group mb8">
          <label for="showMarketsBar">
            Show exchanges bar
          </label>
        </div>
        <div class="form-group mt8">
          <label class="checkbox-control -small">
            <input
              type="checkbox"
              class="form-control"
              :checked="marketsBarPairs"
              @change="$store.commit('settings/TOGGLE_MARKETS_BAR_PAIRS', $event.target.checked)"
            />
            <div></div>
            <span>Show pair name</span>
          </label>
        </div>
        <div class="form-group mt8">
          <label class="checkbox-control -small">
            <input
              type="checkbox"
              class="form-control"
              :disabled="disableAnimations"
              :checked="animateMarketsBar"
              @change="$store.commit('settings/TOGGLE_MARKETS_BAR_ANIMATION', $event.target.checked)"
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

  get showMarketsBar() {
    return this.$store.state.settings.showMarketsBar
  }

  get animateMarketsBar() {
    return this.$store.state.settings.animateMarketsBar
  }

  get marketsBarPairs() {
    return this.$store.state.settings.marketsBarPairs
  }
}
</script>
