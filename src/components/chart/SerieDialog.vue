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
      <textarea class="form-control" rows="5" :value="input" @change="setInput($event.target.value)"></textarea>
    </div>
    <hr />
    <div class="column w-100">
      <div v-if="colorOptions.length">
        <div v-for="(option, index) in colorOptions" :key="index" class="column form-group -fill mr15 mb8">
          <label v-if="option.label !== false" class="-center -fill -nowrap mr15">{{ option.label }}</label>
          <verte
            picker="square"
            menuPosition="left"
            model="rgb"
            :value="currentValues[option.key]"
            @input="currentValues[option.key] !== $event && validate(option, $event)"
          ></verte>
        </div>
      </div>
      <div v-if="otherOptions.length" class=" -fill">
        <div v-for="option in otherOptions" :key="option.key" class="form-group mb15">
          <label v-if="option.label !== false">{{ option.label }}</label>

          <template v-if="option.type === 'string' || option.type === 'number'">
            <editable class="form-control" :content="currentValues[option.key]" @output="validate(option, $event)"></editable>
          </template>
          <template v-if="option.type === 'boolean'">
            <label class="checkbox-control">
              <input type="checkbox" class="form-control" :checked="currentValues[option.key]" @change="validate(option, $event.target.checked)" />
              <div></div>
            </label>
          </template>
        </div>
      </div>
    </div>
    <div v-if="positionOption" class="column mt15">
      <div class="-fill form-group mr15">
        <label class="column help-text mb8">
          <div class="text-left text-nowrap">Start at top</div>
          <div class="text-right text-nowrap">Start at bottom</div>
        </label>
        <input class="w-100" type="range" min="0" max="1" step=".1" :value="positionOption.value.top" @input="setScale('top', $event.target.value)" />
      </div>
      <div class="-fill form-group ml15">
        <label class="column help-text mb8">
          <div class="text-left text-nowrap">End at top</div>
          <div class="text-right text-nowrap">End at bottom</div>
        </label>
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
        v-tippy="{ placement: 'left' }"
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
import Dialog from '../ui/Dialog.vue'
import DialogMixin from '../../mixins/dialogMixin'
import { defaultPlotsOptions } from './chartOptions'

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
    currentValues: {},
    serieDefaultOptionsKeys: [],
    colorOptionsKeys: [],
    otherOptionsKeys: [],
    inputOptionsKeys: [],
    colorOptions: [],
    otherOptions: [],
    availableTypes: { line: 'Line', histogram: 'Histogram', candlestick: 'Candlestick', bar: 'Bar' }
  }),
  computed: {
    userPreferences: function() {
      const options = store.state.settings.series[this.id] || {}

      return options
    },
    /*colorOptions() {
      return optionsByType[this.type]
        .filter(o => /color/i.test(o))
        .map(key => ({
          key,
          label: key,
          value: this.getValue(key),
          type: 'color'
        }))
    },
    typeOptions() {
      const serieOptionsKeys = this.options.map(o => o.key)
      const typeOptions = optionsByType[this.type]
        .filter(o => serieOptionsKeys.indexOf(o) === -1)
        .map(key => ({
          key,
          label: key,
          value: this.getValue(key),
          type: this.getType(this.getDefaultValue(key), key)
        }))

      return typeOptions
    },
    otherOptions() {
      return this.options.concat(this.typeOptions).filter(o => !/color/i.test(o.key))
    },*/
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

    const serieDefinition = seriesData[this.id]

    if (serieDefinition) {
      this.serieDefaultOptionsKeys = Object.keys(serieDefinition.options)
    }

    this.refreshOptions()
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
      const key = typeof option === 'string' ? option : option.key

      store.dispatch('settings/setSeriePreference', {
        id: this.id,
        key,
        value
      })

      this.currentValues = { ...this.currentValues, [key]: value }
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
      let value = seriesData[this.id].options[key]

      if (typeof value === 'undefined' && defaultPlotsOptions[this.type]) {
        value = defaultPlotsOptions[this.type][key]
      }

      return value
    },
    getValue(key) {
      const preferedValue = (store.state.settings.series[this.id] || {})[key]
      const defaultValue = this.getDefaultValue(key)
      let finalValue = ''

      if (typeof preferedValue !== 'undefined') {
        finalValue = preferedValue
      } else if (typeof defaultValue !== 'undefined') {
        finalValue = defaultValue
      }

      this.currentValues[key] = finalValue

      return this.currentValues[key]
    },
    setType(newType) {
      this.$store.commit('settings/SET_SERIE_TYPE', { id: this.id, value: newType })

      this.type = newType

      this.refreshOptions()
    },
    setInput(newInput) {
      this.$store.commit('settings/SET_SERIE_INPUT', { id: this.id, value: newInput })

      this.input = newInput

      this.refreshOptions()
    },
    getInputOptions(input) {
      const keys = []
      const reg = /options\.([a-zA-Z0-9]+)/g

      let match

      do {
        if ((match = reg.exec(input))) {
          keys.push(match[1])
        }
      } while (match)

      return keys
    },
    removeOption(key) {
      this.$store.commit('settings/REMOVE_SERIE_OPTION', { id: this.id, key })

      for (let options of [this.colorOptions, this.otherOptions]) {
        let option = options.find(o => o.key === key)

        if (option) {
          options.splice(options.indexOf(option), 1)
          break
        }
      }
    },
    refreshOptions() {
      const serieDefaultOptionsKeys = this.serieDefaultOptionsKeys

      const inputOptionsKeys = this.getInputOptions(this.input)
      const typeOptionsKeys = optionsByType[this.type]

      const mergedOptionsKeys = [...serieDefaultOptionsKeys, ...inputOptionsKeys, ...typeOptionsKeys].filter((x, i, a) => a.indexOf(x) == i)

      const colorOptionsKeys = mergedOptionsKeys.filter(k => /color/i.test(k))
      const otherOptionsKeys = mergedOptionsKeys.filter(k => !/color/i.test(k))

      for (let key of colorOptionsKeys) {
        if (this.colorOptionsKeys.indexOf(key) === -1) {
          const value = this.getValue(key)

          if (value && typeof value === 'object') {
            continue
          }

          this.colorOptions.push({
            key,
            label: key,
            type: this.getType(value, key)
          })
        }
      }

      for (let key of otherOptionsKeys) {
        if (this.otherOptionsKeys.indexOf(key) === -1) {
          const value = this.getValue(key)

          if (value && typeof value === 'object') {
            continue
          }

          this.otherOptions.push({
            key,
            label: key,
            type: this.getType(value, key)
          })
        }
      }

      for (let key of this.inputOptionsKeys) {
        if (mergedOptionsKeys.indexOf(key) === -1) {
          this.removeOption(key)
        }
      }

      this.colorOptionsKeys = colorOptionsKeys
      this.inputOptionsKeys = inputOptionsKeys
      this.otherOptionsKeys = otherOptionsKeys
    }
  }
}
</script>
