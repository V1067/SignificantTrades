<template>
  <Dialog :open="open" @clickOutside="close" class="serie-dialog">
    <template v-slot:header>
      <div class="title">
        <editable :class="{ '-no-grab': renaming }" :content="name" :editable="renaming" @output="name = $event" placeholder="Nom"></editable>
        <code class="text-lowercase">({{ id }})</code>
        <i class="icon-sm -no-grab" style="cursor: pointer" :class="{ 'icon-check': renaming, 'icon-edit': !renaming }" @click="renameSerie"></i>
      </div>
      <div class="column -center"></div>
    </template>
    <p v-if="description" style="opacity: .5" class="mb15 mt0"><i class="icon-info mr8"></i> {{ description }}</p>
    <div class="mb15">
      <dropdown
        class="form-control -left -center"
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
      <textarea ref="behaveInput" class="form-control" rows="5" :value="input" @change="setInput($event.target.value)"></textarea>
      <p v-if="error" class="form-feedback"><i class="icon-warning mr15"></i> {{ error }}</p>
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

          <dropdown
            v-if="option.key === 'lineType'"
            class="form-control -left -center"
            :selected="currentValues[option.key]"
            :options="{ 0: 'Simple', 1: 'with steps' }"
            placeholder="lineType"
            @output="validate(option, $event)"
          ></dropdown>
          <dropdown
            v-else-if="option.key === 'lineStyle' || option.key === 'priceLineStyle'"
            class="form-control -left -center"
            :selected="currentValues[option.key]"
            :options="{ 0: 'Solid', 1: 'Dotted', 2: 'Dashed', 3: 'LargeDashed', 4: 'SparseDotted' }"
            placeholder="lineStyle"
            @output="validate(option, $event)"
          ></dropdown>
          <template v-else-if="option.type === 'string' || option.type === 'number'">
            <editable class="form-control" :content="currentValues[option.key]" @output="validate(option, $event)"></editable>
          </template>
          <template v-else-if="option.type === 'boolean'">
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
        <div class="form-group mb15">
          <label>top</label>
          <editable class="form-control" :content="positionOption.value.top" :step="0.01" @output="setScale('top', $event)"></editable>
        </div>
        <div class="form-group">
          <label>bottom</label>
          <editable class="form-control" :content="positionOption.value.bottom" :step="0.01" @output="setScale('bottom', $event)"></editable>
        </div>
      </div>
      <div class="-fill column mr15 serie__scale-margins">
        <input class="w-100" type="range" min="0" max="1" step=".1" :value="positionOption.value.top" @input="setScale('top', $event.target.value)" />
        <input
          class="w-100"
          type="range"
          min="0"
          max="1"
          step=".1"
          :value="positionOption.value.bottom"
          @input="setScale('bottom', $event.target.value)"
        />
      </div>
    </div>
    <div v-if="formatOption" class="column mt15">
      <div class="form-group">
        <label>price format</label>
        <dropdown
          class="form-control -left -center"
          :selected="formatOption.value.type"
          :options="{ price: 'Price', volume: 'Volume', percent: 'Percent' }"
          placeholder="lineType"
          @output="validate(formatOption, { ...formatOption.value, type: $event })"
        ></dropdown>
      </div>
      <div>
        <div class="form-group mb15">
          <label>precision</label>
          <editable
            class="form-control"
            :content="formatOption.value.minMove"
            @output="validate(formatOption, { ...formatOption.value, precision: +$event || 1 })"
          ></editable>
        </div>
        <div class="form-group">
          <label>minMove</label>
          <editable
            class="form-control"
            :content="formatOption.value.precision"
            @output="validate(formatOption, { ...formatOption.value, minMove: +$event || 0.1 })"
          ></editable>
        </div>
      </div>
    </div>
    <hr />
    <div class="form-group column">
      <label class="checkbox-control -on-off" v-tippy :title="!enabled ? 'Enable' : 'Disable'" @change="$store.dispatch('settings/toggleSerie', id)">
        <input type="checkbox" class="form-control" :checked="enabled" />
        <div></div>
        <span>
          {{ enabled ? 'Active' : 'Disabled' }}
        </span>
      </label>
      <button class="btn -blue mr15" v-tippy title="Duplicate" @click="duplicateSerie">
        <i class="icon-duplicate"></i>
      </button>
      <button class="btn -red" v-tippy title="Serie will be lost forever" @click="removeSerie">
        <i class="icon-trash"></i>
      </button>
    </div>
  </Dialog>
</template>

<script>
import store from '../../store'
import Dialog from '../ui/Dialog.vue'
import DialogMixin from '../../mixins/dialogMixin'
import { defaultPlotsOptions, defaultSerieOptions } from './chartOptions'
import Behave from 'behave-js'
import SerieDialog from './SerieDialog.vue'
import dialogService from '../../services/dialog'
import { defaultChartSeries } from './chartSeries'

const ignoredOptionsKeys = ['crosshairMarkerVisible']

export default {
  props: ['id'],
  mixins: [DialogMixin],
  components: {
    Dialog
  },
  data: () => ({
    editor: null,
    newName: null,
    renaming: false,
    currentValues: {},
    // inputOptionsKeys: [],
    otherOptionsKeys: [],
    colorOptionsKeys: [],
    colorOptions: [],
    otherOptions: [],
    availableTypes: { line: 'Line', area: 'Area', histogram: 'Histogram', candlestick: 'Candlestick', bar: 'Bar' }
  }),
  computed: {
    serieSettings: function() {
      return store.state.settings.series[this.id]
    },
    defaultSettings: function() {
      return defaultChartSeries[this.id] || {}
    },
    error: function() {
      return store.state.app.activeSeriesErrors[this.id]
    },
    name: {
      get: function() {
        return this.serieSettings.name || this.defaultSettings.name
      },
      set: function(newName) {
        this.newName = newName
      }
    },
    type: function() {
      return this.serieSettings.type || this.defaultSettings.type
    },
    input: function() {
      return this.serieSettings.input || this.defaultSettings.input
    },
    description: function() {
      return this.serieSettings.description || this.defaultSettings.description
    },
    enabled: function() {
      return typeof this.serieSettings.enabled === 'undefined' ? true : this.serieSettings.enabled
    },
    positionOption() {
      return {
        key: 'scaleMargins',
        label: 'scaleMargins',
        value: this.getValue('scaleMargins'),
        type: 'position'
      }
    },
    formatOption() {
      return {
        key: 'priceFormat',
        label: 'priceFormat',
        value: this.getValue('priceFormat'),
        type: 'position'
      }
    }
  },
  created() {
    if (!this.serieSettings.options) {
      this.$store.commit('settings/CUSTOMIZE_SERIE', this.id)
    }

    this.$nextTick(() => {
      this.refreshOptions()
    })
  },
  mounted() {
    this.$nextTick(function() {
      this.createInputEditor()
    })
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
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

      store.dispatch('settings/setSerieOption', {
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

      this.validate(option, scale)
    },
    getDefaultValue(key) {
      let value

      if (typeof defaultPlotsOptions[this.type] !== 'undefined' && typeof defaultPlotsOptions[this.type][key] !== 'undefined') {
        return defaultPlotsOptions[this.type][key]
      }

      if (typeof value === 'undefined' && typeof defaultSerieOptions[key] !== 'undefined') {
        return defaultSerieOptions[key]
      }

      if (typeof value === 'undefined' && /length$/i.test(key)) {
        return 14
      }

      if (typeof value === 'undefined' && /color$/i.test(key)) {
        return '#c3a87a'
      }

      if (typeof value === 'undefined' && /width$/i.test(key)) {
        return 1
      }

      if (typeof value === 'undefined' && key === 'scaleMargins') {
        return {
          top: 0.1,
          bottom: 0.2
        }
      }

      return value
    },
    getValue(key) {
      if (!this.serieSettings) {
        return null
      }

      let preferedValue

      if (typeof this.serieSettings.options[key] !== 'undefined') {
        preferedValue = this.serieSettings.options[key]
      } else if (this.defaultSettings.options) {
        preferedValue = this.serieSettings.options[key]
      }
      const defaultValue = this.getDefaultValue(key)
      let finalValue = ''

      if (typeof preferedValue !== 'undefined') {
        if (preferedValue && typeof preferedValue === 'object' && defaultValue && typeof defaultValue === 'object') {
          finalValue = Object.assign({}, defaultValue, preferedValue)
        } else {
          finalValue = preferedValue
        }
      } else if (typeof defaultValue !== 'undefined') {
        finalValue = defaultValue
      }

      this.currentValues[key] = finalValue
      /*
      if (
        finalValue &&
        typeof finalValue !== 'object' &&
        typeof preferedValue === 'undefined' &&
        typeof (defaultPlotsOptions[this.type] || {})[key] === 'undefined'
      ) {
        debugger
        store.dispatch('settings/setSerieOption', {
          id: this.id,
          key,
          value: finalValue
        })
      }
*/
      return this.currentValues[key]
    },
    setType(newType) {
      this.$store.commit('settings/SET_SERIE_TYPE', { id: this.id, value: newType })

      this.refreshOptions()
    },
    setInput(newInput) {
      this.$store.commit('settings/SET_SERIE_INPUT', { id: this.id, value: newInput })

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
      const serieDefaultOptionsKeys = Object.keys(this.serieSettings.options)
      const exampleSerieOptionsKeys = Object.keys(this.defaultSettings.options || {})

      const inputOptionsKeys = this.getInputOptions(this.input)
      const typeOptionsKeys = Object.keys({ ...defaultSerieOptions, ...defaultPlotsOptions[this.type] })
      const mergedOptionsKeys = [...exampleSerieOptionsKeys, ...serieDefaultOptionsKeys, ...inputOptionsKeys, ...typeOptionsKeys].filter(
        (x, i, a) => {
          return ignoredOptionsKeys.indexOf(x) === -1 && a.indexOf(x) == i
        }
      )

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

      /*for (let key of this.inputOptionsKeys) {
        if (mergedOptionsKeys.indexOf(key) === -1) {
          this.removeOption(key)
        }
      }*/

      this.colorOptionsKeys = colorOptionsKeys
      this.otherOptionsKeys = otherOptionsKeys

      for (let i = 0; i < this.otherOptions.length; i++) {
        if (this.otherOptionsKeys.indexOf(this.otherOptions[i].key) === -1) {
          this.otherOptions.splice(this.otherOptions.indexOf(this.otherOptions[i]), 1)
          i--
        }
      }

      for (let i = 0; i < this.colorOptions.length; i++) {
        if (this.colorOptionsKeys.indexOf(this.colorOptions[i].key) === -1) {
          this.colorOptions.splice(this.colorOptions.indexOf(this.colorOptions[i]), 1)
          i--
        }
      }
    },
    async removeSerie() {
      await this.close()

      store.dispatch('settings/removeSerie', this.id)
    },
    async renameSerie() {
      if (!this.renaming) {
        this.renaming = true

        return
      }

      if (this.newName && this.newName.length) {
        this.id = await store.dispatch('settings/renameSerie', { id: this.id, name: this.newName })
        this.renaming = false
        this.newName = null
      }
    },
    async duplicateSerie() {
      const id = await store.dispatch('settings/createSerie', store.state.settings.series[this.id])

      await this.close()
      dialogService.open(
        SerieDialog,
        {
          id
        },
        'serie'
      )
    },
    createInputEditor() {
      setTimeout(() => {
        this.editor = new Behave({
          textarea: this.$refs.behaveInput,
          replaceTab: true,
          softTabs: true,
          tabSize: 2,
          autoOpen: true,
          overwrite: true,
          autoStrip: true,
          autoIndent: true,
          fence: false
        })
      })
    }
  }
}
</script>
