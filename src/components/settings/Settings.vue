<template>
  <div id="settings" class="settings__container stack__container" @mousedown="$event.target === $el && close()">
    <div class="stack__scroller" v-background="1">
      <div class="stack__wrapper">
        <a href="#" class="stack__toggler icon-cross" @click="close"></a>

        <section>
          <div v-if="settings.indexOf('list') > -1" class="settings-section settings-trades">
            <div class="form-group mb8">
              <label class="checkbox-control -aggr" @change="$store.commit('settings/TOGGLE_AGGREGATION', $event.target.checked)">
                <input type="checkbox" class="form-control" :checked="aggregateTrades" />
                <div></div>
                <span>Trades aggregation is {{ aggregateTrades ? 'enabled' : 'disabled' }}</span>
              </label>
            </div>

            <div class="form-group mb8">
              <label
                class="checkbox-control -slippage"
                :title="
                  calculateSlippage === 'price'
                    ? 'Show slippage in $'
                    : calculateSlippage === 'bps'
                    ? 'Show slippage in basis point (bps)'
                    : 'Slippage disabled'
                "
                v-tippy="{ placement: 'left' }"
              >
                <input type="checkbox" class="form-control" :checked="calculateSlippage" @change="$store.commit('settings/TOGGLE_SLIPPAGE')" />
                <div></div>
                <span v-if="calculateSlippage === 'price'"> Calculate slippage in price difference (<i class="icon-dollar"></i>) </span>
                <span v-if="calculateSlippage === 'bps'"> Calculate slippage in bps <i class="icon-bps"></i> </span>
                <span v-if="!calculateSlippage">Do not show slippage</span>
              </label>
            </div>

            <div class="form-group">
              <label class="checkbox-control checkbox-control-input -auto" v-tippy="{ placement: 'left' }" title="Size display preference">
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="preferQuoteCurrencySize"
                  @change="$store.commit('settings/SET_QUOTE_AS_PREFERED_CURRENCY', $event.target.checked)"
                />
                <span>Size in</span>
                <div on="quote currency" off="base currency"></div>
                <span>(<i :class="preferQuoteCurrencySize ? 'icon-quote' : 'icon-base'"></i>)</span>
              </label>
            </div>
          </div>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'list')">
            Trades list
            <i class="icon-up"></i>
          </div>
        </section>

        <section>
          <audio-settings v-if="settings.indexOf('audio') > -1"></audio-settings>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'audio')">
            Audio
            <i class="icon-up"></i>
          </div>
        </section>

        <section>
          <div v-if="settings.indexOf('chart') > -1" class="settings-section settings-chart">
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
              <verte :value="backgroundColor" @input="$event !== backgroundColor && $store.dispatch('settings/setBackgroundColor', $event)"></verte>
              <label class="-fill -center ml8">Background color</label>
            </div>
            <div class="form-group column mb8">
              <verte
                picker="square"
                menuPosition="left"
                model="rgb"
                :value="textColor"
                @input="$event !== textColor && $store.commit('settings/SET_CHART_COLOR', $event)"
              ></verte>
              <label for="" class="-fill -center ml8"
                >Text color <a><i class="icon-cross text-small" v-if="textColor" @click="$store.commit('settings/SET_CHART_COLOR', null)"></i></a
              ></label>
            </div>
          </div>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'chart')">
            Chart
            <i class="icon-up"></i>
          </div>
        </section>

        <section>
          <div class="form-group" v-if="settings.indexOf('exchanges') > -1">
            <div class="settings-exchanges">
              <Exchange v-for="(active, exchangeId) in activeExchanges" :key="exchangeId" :id="exchangeId" />
            </div>
          </div>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'exchanges')">
            Exchanges
            <i class="icon-up"></i>
          </div>
        </section>

        <section>
          <other-settings v-if="settings.indexOf('other') > -1"></other-settings>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'other')">
            Other
            <i class="icon-up"></i>
          </div>
        </section>

        <section class="mt16 settings__footer">
          <div class="form-group">
            <div v-if="version" class="column">
              <div class="-grow">
                v{{ version }}
                <sup class="version-date">{{ buildDate }}</sup>
              </div>
              <a href="javascript:void(0);" @click="reset()">reset</a>
              <i class="divider">|</i>
              <a
                target="_blank"
                href="bitcoin:3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz"
                v-tippy="{
                  animateFill: false,
                  interactive: true,
                  theme: 'blue'
                }"
              >
                donate
              </a>
              <i class="divider">|</i>
              <a href="javascript:void(0);" @click="exportSettings">export</a>
              <i class="divider">|</i>
              <a href="javascript:void(0);" class="settings__browse-import">import<input type="file" @change="confirmImport"/></a>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import { downloadJson } from '../../utils/helpers'

import Exchange from './Exchange.vue'
import SettingsImportConfirmation from './ImportConfirmation.vue'

import dialogService from '../../services/dialogService'
import AudioSettings from './AudioSettings.vue'
import OtherSettings from './OtherSettings.vue'
import { dumpSettings } from '@/utils/store'

@Component({
  name: 'Settings',
  components: {
    Exchange,
    AudioSettings,
    OtherSettings
  }
})
export default class extends Vue {
  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  get version() {
    return this.$store.state.app.version
  }

  get buildDate() {
    return this.$store.state.app.buildDate
  }

  get settings() {
    return this.$store.state.settings.settings
  }

  get timezoneOffset() {
    return this.$store.state.settings.timezoneOffset
  }

  get backgroundColor() {
    return this.$store.state.settings.backgroundColor
  }

  get textColor() {
    return this.$store.state.settings.textColor
  }

  get aggregateTrades() {
    return this.$store.state.settings.aggregateTrades
  }

  get preferQuoteCurrencySize() {
    return this.$store.state.settings.preferQuoteCurrencySize
  }

  get calculateSlippage() {
    return this.$store.state.settings.calculateSlippage
  }

  created() {
    document.body.classList.add('-translate')
  }

  beforeDestroy() {
    document.body.classList.remove('-translate')
  }

  reset() {
    window.localStorage && window.localStorage.clear()

    window.location.reload(true)
  }

  close() {
    this.$store.commit('app/TOGGLE_SETTINGS')
  }

  exportSettings() {
    downloadJson(dumpSettings(), 'aggr')
  }

  confirmImport(event) {
    const reader = new FileReader()

    reader.onload = async ({ target }) => {
      event.target.value = ''

      const states = this.validateImport(target.result)

      if (!states) {
        return
      }

      if (
        await dialogService.openAsPromise(SettingsImportConfirmation, {
          states
        })
      ) {
        this.importSettings(states)
      }
    }
    reader.readAsText(event.target.files[0])
  }

  validateImport(content) {
    let states = null

    try {
      states = JSON.parse(content)
    } catch (error) {
      alert('invalid states')

      return false
    }

    return states
  }

  importSettings(states) {
    for (const id of states) {
      localStorage.setItem(id, JSON.stringify(states[id]))
    }

    window.location.reload(true)
  }
}
</script>

<style lang="scss">
@media screen and (min-width: 500px) {
  body {
    overflow-x: hidden;
  }

  body.-translate {
    .stack__container,
    #app {
      overflow: visible !important;
      z-index: 10;
    }

    #app {
      transform: translateX(-260px);

      .stack__scroller {
        transform: translateX(100%);
      }
    }
  }
}

@media screen and (min-width: 840px) {
  body.-translate {
    #app {
      transform: translateX(-320px);
    }
  }
}

.settings__report {
  display: block;
  padding: 7px 6px 6px;
  background-color: $red;
}

.settings__title {
  display: flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  &:hover {
    opacity: 1;
    cursor: pointer;
  }

  .icon-up {
    transition: transform 0.2s $ease-elastic;
    margin-left: 0.5em;
  }
}

.settings__container {
  color: white;

  &.-stack__container {
    z-index: 10;
  }

  .stack__wrapper {
    padding: 0;
  }

  .stack__scroller {
    background-color: $dark;
  }

  @media screen and (min-width: 500px) {
    position: fixed;
    height: 100%;
    width: 100%;
    right: 0;

    .stack__scroller {
      width: 260px;
      height: 100%;
      position: absolute;
      right: 0;
    }

    .stack__wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100%;

      > div:last-child {
        margin-top: auto;
        padding-top: 16px;
      }
    }
  }

  @media screen and (min-width: 840px) {
    .stack__scroller {
      width: 320px;
    }
  }

  .stack__wrapper {
    > section {
      display: flex;
      flex-direction: column-reverse;
      padding: 1rem;
      position: relative;

      &:hover {
        background-color: rgba(black, 0.05);
      }

      .settings__title {
        margin: -1rem -1rem 1rem;
        padding: 1rem 1rem 0;

        &:first-child {
          margin: -1rem;
          padding-bottom: 1rem;

          .icon-up {
            transform: rotateZ(180deg);
          }
        }
      }
    }
  }

  .settings__footer {
    margin-top: auto;
    background: 0 !important;
    font-size: 80%;

    a {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }

    .form-group {
      flex-basis: auto;
      max-width: none;
      flex-grow: 1;
    }

    .version-date {
      opacity: 0.75;
      line-height: 0;
    }

    .divider {
      opacity: 0.5;
      margin: 0 0.25rem;
    }

    .settings__browse-import {
      position: relative;
      input[type='file'] {
        opacity: 0;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        max-width: 100%;
        overflow: hidden;

        &,
        &::-webkit-file-upload-button {
          cursor: pointer;
        }
      }
    }
  }

  .settings-audio {
    align-items: center;

    label {
      margin: 0;
    }

    input[type='range'] {
      width: 100%;
      margin: 0;
    }
  }

  .settings-section {
    position: relative;
  }

  .settings-exchanges {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  &.open {
    background-color: #222;
  }

  .settings-chart {
    &__sub-settings {
      margin-left: 2.4em;
      margin-bottom: 0.5em;

      > div {
        + div {
          margin-top: 0.75em;
        }
      }

      > div + div {
        margin-top: 0.75em;
      }

      input[type='range'] {
        font-size: 0.5em;
        vertical-align: middle;
      }
    }
  }
}

#app.-light {
  .settings__container .stack__wrapper > section:hover {
    background-color: rgba(black, 0.025);
  }

  .settings__title {
    opacity: 1;
  }

  .form-group {
    .checkbox-control {
      opacity: 1;
    }
  }
}
</style>
