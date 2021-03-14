<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">{{ title }}</div>
      <div class="column -center"></div>
    </template>
    <div class="mb15">
      <dropdown
        class="available-types -left -center"
        :selected="type"
        label="Type"
        :options="availableTypes"
        placeholder="type"
        @output="setType($event)"
      ></dropdown>
    </div>
    <div class="form-group mb15">
      <label for
        >Value
        <span
          class="icon-info-circle"
          title="Javascript syntax, use build in variable such as vbuy/vsell (volume) cbuy/csell (trade count) lbuy/lsell (liquidation volume)"
          v-tippy
        ></span
      ></label>
      <textarea
        class="form-control"
        rows="5"
        :value="input"
        @change="$store.commit('settings/SET_SERIE_INPUT', { id, value: $event.target.value })"
      ></textarea>
    </div>
    <hr />
    <div class="column w-100">
      <div v-if="colorOptions.length">
        <div v-for="(option, index) in colorOptions" :key="index" class="column -fill mr15 mb8">
          <label v-if="option.label !== false" class="-center -fill -nowrap mr15">{{ option.label }}</label>
          <verte
            picker="square"
            menuPosition="left"
            model="rgb"
            :value="option.value"
            @input="option.value !== $event && validate(option, $event)"
            :colorHistory="colors"
          ></verte>
        </div>
      </div>
      <div v-if="otherOptions.length" class=" -fill">
        <div v-for="(option, index) in otherOptions" :key="index" class="form-group mb15">
          <label v-if="option.label !== false">{{ option.label }}</label>

          <template v-if="option.type === 'string' || option.type === 'number'">
            <editable class="form-control" :content="option.value" @output="validate(option, $event)"></editable>
          </template>
          <!--<template v-if="option.type === 'type'">
            <dropdown
              class="available-types -left -center"
              :selected="option.value"
              :options="availableTypes"
              @output="$store.commit('settings/SET_SERIE_TYPE', { id, value: $event })"
            ></dropdown>
          </template>-->
          <template v-if="option.type === 'boolean'">
            <label class="checkbox-control">
              <input type="checkbox" class="form-control" :checked="option.value" @change="validate(option, $event.target.checked)" />
              <div></div>
            </label>
          </template>
        </div>
      </div>
    </div>
    <div v-if="positionOption" class="column mt15">
      <div class="-fill mr15">
        <div class="column help-text mb8">
          <div class="text-left text-nowrap">Start at top</div>
          <div class="text-right text-nowrap">Start at bottom</div>
        </div>
        <input class="w-100" type="range" min="0" max="1" step=".1" :value="positionOption.value.top" @input="setScale('top', $event.target.value)" />
      </div>
      <div class="-fill ml15">
        <div class="column help-text mb8">
          <div class="text-left text-nowrap">End at top</div>
          <div class="text-right text-nowrap">End at bottom</div>
        </div>
        <input
          class="w-100  -reverse"
          type="range"
          min="0"
          max="1"
          step=".1"
          :value="positionOption.value.bottom"
          @input="setScale('bottom', $event.target.value)"
        />
      </div>
    </div>
    <hr />
    <div class="form-group">
      <label
        class="checkbox-control -on-off"
        v-tippy="{ placement: 'bottom' }"
        :title="!enabled ? 'Enable ' + id : 'Disable ' + id"
        @change="$store.commit('settings/TOGGLE_SERIE', { id, value: $event.target.checked })"
      >
        <input type="checkbox" class="form-control" :checked="enabled" />
        <div></div>
        <span>
          {{ enabled ? 'Active' : 'Disabled' }}
        </span>
      </label>
    </div>
  </Dialog>
</template>

<script>
import seriesData from '../../data/series'
import store from '../../store'
import { snakeToSentence } from '../../utils/helpers'
import { PALETTE } from '../../utils/colors'

import Dialog from '../ui/Dialog.vue'
import DialogMixin from '../../mixins/dialogMixin'

const optionsByType = {
  line: ['color', 'lineWidth'],
  histogram: ['color', 'upColor', 'downColor'],
  candlestick: ['upColor', 'downColor', 'wickUpColor', 'wickDownColor', 'borderUpColor', 'borderDownColor', 'borderVisible'],
  bars: ['upColor', 'downColor', 'openVisible'],
  area: ['topColor', 'bottomColor', 'lineColor', 'lineStyle', 'lineWidth']
}

export default {
  props: ['id'],
  mixins: [DialogMixin],
  components: {
    Dialog
  },
  data: () => ({
    title: 'Serie',
    enabled: true,
    type: 'line',
    model: [],
    options: [],
    availableTypes: { line: 'Line', histogram: 'Histogram', candlestick: 'Candlestick', bar: 'Bar' }
  }),
  computed: {
    colors: () => PALETTE,
    userPreferences: function() {
      const options = store.state.settings.series[this.id] || {}

      return options
    },
    colorOptions() {
      return optionsByType[this.type]
        .filter(o => /color/i.test(o))
        .map(key => ({
          key,
          label: key,
          value: this.getValue(key),
          type: 'color'
        }))
    },
    otherOptions() {
      return optionsByType[this.type]
        .filter(o => !/color/i.test(o))
        .map(key => ({
          key,
          label: key,
          value: this.getValue(key),
          type: this.getType(this.getDefaultValue(key), key)
        }))
    },
    positionOption() {
      return {
        key: 'scaleMargins',
        label: 'scaleMargins',
        value: this.getValue('scaleMargins'),
        type: 'position'
      }
    }
  },
  created() {
    this.title = snakeToSentence(this.id)
    this.enabled = typeof this.userPreferences.enabled === 'undefined' ? true : this.userPreferences.enabled
    this.type = typeof this.userPreferences.type === 'string' ? this.userPreferences.type : seriesData[this.id].type
    this.input = typeof this.userPreferences.input === 'string' ? this.userPreferences.input : seriesData[this.id].input
  },
  methods: {
    getType(value, key) {
      let type = 'string'

      try {
        value = JSON.parse(value)
      } catch (error) {
        // empty
      }

      if (key === 'type') {
        type = 'type'
      } else if (typeof value === 'number') {
        type = 'number'
      } else if (typeof value === 'boolean') {
        type = 'boolean'
      } else if (/^rgba?/.test(value) || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
        type = 'color'
      } else if (key === 'scaleMargins') {
        type = 'position'
      }

      return type
    },
    validate(option, value) {
      store.dispatch('settings/setSeriePreference', {
        id: this.id,
        key: typeof option === 'string' ? option : option.key,
        value: value
      })

      const modelIndex = this.model.indexOf(option)

      if (modelIndex !== -1) {
        this.$set(this.model[modelIndex], 'value', value)
      }
    },
    setScale(side, value) {
      const option = this.positionOption

      const scale = {
        top: option.value.top,
        bottom: option.value.bottom
      }

      scale[side] = +value || 0

      if (scale.top + scale.bottom > 1) {
        scale[side] = 1 - scale[side === 'top' ? 'bottom' : 'top']
      }

      if (this.id === 'price') {
        store.commit('settings/SET_CHART_PRICE_MARGINS', scale)
      }

      this.validate(option, scale)
    },
    getDefaultValue(key) {
      return seriesData[this.id].options[key]
    },
    getValue(key) {
      const preferedValue = (store.state.settings.series[this.id] || {})[key]
      const defaultValue = this.getDefaultValue(key)

      if (typeof preferedValue !== 'undefined') {
        return preferedValue
      } else if (typeof defaultValue !== 'undefined') {
        return defaultValue
      } else {
        return ''
      }
    },
    setType(type) {
      this.$store.commit('settings/SET_SERIE_TYPE', { id: this.id, value: type })

      this.type = type
    }
  }
}
</script>
