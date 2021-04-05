<template>
  <header id="header" class="header" v-background="20">
    <button type="button" @click="$store.dispatch('app/showSearch')" title="Search" v-tippy="{ placement: 'bottom' }">
      <span class="icon-search"></span>
    </button>
    <button type="button" v-if="!isPopupMode" @click="togglePopup" title="Open as popup" v-tippy="{ placement: 'bottom' }">
      <span class="icon-external-link-square-alt"></span>
    </button>
    <tippy v-if="useAudio" to="myTrigger" arrow :interactive="true" :delay="[0, 200]">
      <div class="mt4 mb4">
        <slider
          style="width: 100px"
          :min="0"
          :max="10"
          :step="0.1"
          :editable="false"
          :value="audioVolume"
          @input="$store.dispatch('settings/setAudioVolume', $event)"
          @reset="$store.dispatch('settings/setAudioVolume', 1)"
        ></slider>
      </div>
    </tippy>
    <button type="button" class="-volume" @click="$store.commit('settings/TOGGLE_AUDIO', !useAudio)" name="myTrigger">
      <span v-if="!useAudio" class="icon-volume-off"></span>
      <span v-else class="icon-volume-low" :class="{ 'icon-volume-medium': audioVolume >= 1, 'icon-volume-high': audioVolume >= 5 }"></span>
    </button>
    <dropdown :options="paneTypes" placeholder="tf." @output="addPane" title="Add pane" v-tippy>
      <template v-slot:selection>
        <i class="icon-plus"></i>
      </template>
      <template v-slot:option="{ value }">
        <div>
          <div>
            <div class="dropdown-option__title">{{ value.title }}</div>
            <div class="dropdown-option__description">{{ value.description }}</div>
          </div>
          <i class="icon-plus"></i>
        </div>
      </template>
    </dropdown>
    <button type="button" @click="$store.commit('app/TOGGLE_SETTINGS')" title="General settings" v-tippy>
      <span class="icon-settings-lines"></span>
    </button>
  </header>
</template>

<script lang="ts">
import { PaneType } from '@/store/panes'
import { Component, Vue } from 'vue-property-decorator'
import Slider from './framework/picker/Slider.vue'

@Component({
  name: 'Header',
  components: {
    Slider
  }
})
export default class extends Vue {
  isPopupMode = window.opener !== null
  paneTypes = {
    chart: {
      title: 'Chart',
      description: 'Live Chart'
    },
    trades: {
      title: 'Trades',
      description: 'Significant Market Trades'
    },
    stats: {
      title: 'Live Statistics',
      description: 'Custom counters'
    },
    counters: {
      title: 'Counters',
      description: 'Rolling buy/sell counters'
    }
  }

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  togglePopup() {
    const name = this.$store.state.app.activeMarkets.map(market => market.pair).join('+')

    window.open(window.location.href, `sig${name}`, 'toolbar=no,status=no,width=350,height=500')

    setTimeout(() => {
      window.close()
    }, 500)
  }

  addPane(type: PaneType) {
    this.$store.dispatch('panes/addPane', type)
  }
}
</script>

<style lang="scss">
header#header {
  background-color: lighten($dark, 10%);
  color: white;
  position: absolute;
  height: 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 4px;
  top: 0;
  z-index: 1;
  left: 50%;
  transform: translate(-50%);
  border-radius: 0 0 8px 8px;

  button,
  .dropdown__selected {
    padding: 2px;
    font-size: 12px;
    line-height: 1;
  }

  .dropdown {
    align-self: stretch;
    .options {
      position: absolute;
    }
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    position: relative;

    align-self: stretch;
    cursor: pointer;

    > span {
      display: inline-block;
      transition: all 0.5s $ease-elastic;
    }

    &.-volume {
      font-size: 14px;
    }
  }

  &:after,
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    display: block;
    background-clip: padding-box;
    transition: background-color 0.4s $ease-out-expo;
  }
}

#app.-loading header#header {
  &:before {
    background-color: rgba(#f6f6f6, 0.1);
    animation: indeterminate-loading-bar-slow 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
  }

  &:after {
    background-color: rgba(#111111, 0.1);
    animation: indeterminate-loading-bar-fast 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
    animation-delay: 1.15s;
  }
}

@keyframes indeterminate-loading-bar-slow {
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
}

@keyframes indeterminate-loading-bar-fast {
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
}
</style>
