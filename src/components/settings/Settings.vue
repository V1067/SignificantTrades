<template>
  <div id="settings" class="settings__container stack__container" @mousedown="$event.target === $el && close()">
    <div class="stack__scroller" v-background="33">
      <div class="stack__wrapper">
        <a href="#" class="stack__toggler icon-cross" @click="close"></a>

        <section>
          <trade-list-settings v-if="settings.indexOf('list') > -1" class="mb8"></trade-list-settings>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'list')">
            Trades list
            <i class="icon-up"></i>
          </div>
        </section>

        <section>
          <thresholds-settings v-if="settings.indexOf('thresholds') > -1"></thresholds-settings>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'thresholds')">
            Thresholds ({{ thresholds.length }})
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
          <stats-settings v-if="settings.indexOf('stats') > -1"></stats-settings>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'stats')">Stats <i class="icon-up"></i></div>
        </section>
        <section>
          <counters-settings v-if="settings.indexOf('counters') > -1"></counters-settings>
          <div class="settings__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'counters')">Counter <i class="icon-up"></i></div>
        </section>

        <section>
          <chart-settings v-if="settings.indexOf('chart') > -1"></chart-settings>
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

        <section class="mt15 settings__footer">
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
import TradeListSettings from '../trades/TradeListSettings.vue'
import ThresholdsSettings from './ThresholdsSettings.vue'
import AudioSettings from './AudioSettings.vue'
import StatsSettings from '../stats/StatsSettings.vue'
import CountersSettings from '../counters/CountersSettings.vue'
import OtherSettings from './OtherSettings.vue'
import ChartSettings from './ChartSettings.vue'

@Component({
  name: 'Settings',
  components: {
    Exchange,
    TradeListSettings,
    ThresholdsSettings,
    AudioSettings,
    CountersSettings,
    StatsSettings,
    OtherSettings,
    ChartSettings
  }
})
export default class extends Vue {
  get activeExchanges() {
    return this.$store.state.app.activeExchanges
  }

  get version() {
    return this.$store.state.app.version
  }

  get thresholds() {
    return this.$store.state.settings.thresholds
  }

  get buildDate() {
    return this.$store.state.app.buildDate
  }

  get settings() {
    return this.$store.state.settings.settings
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
    const settings = JSON.parse(JSON.stringify(this.$store.state.settings))

    downloadJson(settings, 'aggr')
  }

  confirmImport(event) {
    const reader = new FileReader()

    reader.onload = async ({ target }) => {
      event.target.value = ''

      const settings = this.validateSettings(target.result)

      if (!settings) {
        return
      }

      if (
        await dialogService.openAsPromise(SettingsImportConfirmation, {
          settings
        })
      ) {
        this.importSettings(settings)
      }
    }
    reader.readAsText(event.target.files[0])
  }

  validateSettings(content) {
    let settings = null

    try {
      settings = JSON.parse(content)
    } catch (error) {
      alert('invalid settings')

      return false
    }

    return settings
  }

  importSettings(settings) {
    localStorage.setItem('settings', JSON.stringify(settings))

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
      transform: translateX(-320px);

      .stack__scroller {
        transform: translateX(100%);
      }
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
  background-color: rgba($dark, 0.5);
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

    .stack__scroller {
      width: 320px;
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

  .stack__wrapper {
    > section {
      display: flex;
      flex-direction: column-reverse;
      padding: 1rem;

      &:hover {
        background-color: rgba(black, 0.2);
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

  .checkbox-control {
    &.-slippage input ~ div {
      &:before,
      &:after {
        content: unicode($icon-slippery);
      }

      &:before {
        font-size: 1.5em;
      }
    }

    &.-aggr input ~ div {
      &:before {
        content: unicode($icon-ms);
        font-size: 1.5em;
      }

      &:after {
        content: unicode($icon-cross);
      }
    }

    &.-animations input ~ div {
      &:before {
        content: unicode($icon-cross);
      }

      &:after {
        content: unicode($icon-magic);
      }
    }

    &.-rip input ~ div {
      &:before,
      &:after {
        content: unicode($icon-tomb);
      }

      &:before {
        font-size: 1.5em;
      }
    }

    &.-auto input {
      ~ div {
        width: auto;
        display: flex;

        &:before,
        &:after {
          font-family: inherit;
          position: relative;
          line-height: 1;
          order: 0;
        }

        i {
          order: 1;
          top: 0;
        }

        &:before {
          content: attr(on);
          display: none;
        }

        &:after {
          content: attr(off);
        }
      }

      &:checked ~ div {
        &:before {
          display: block;
        }

        &:after {
          display: none;
        }
      }
    }

    &.-cml-abs input {
      ~ div {
        &:before,
        &:after {
          font-family: inherit;
        }

        &:before {
          content: 'CML';
        }

        &:after {
          content: 'ABS';
        }
      }

      &:not(:checked) ~ div {
        background-color: $blue;
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

    &__controls {
      position: absolute;
      right: 0;
      top: -2.05rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      z-index: 1;

      > a {
        opacity: 0.5;

        &:hover {
          opacity: 1;
        }
      }
    }
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
</style>
