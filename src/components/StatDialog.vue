<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div>
        <div class="title">STAT</div>
        <div class="subtitle">{{ title }}</div>
      </div>
    </template>
    <div class="form-group mb8">
      <label>Name</label>
      <input
        type="text"
        class="form-control"
        :value="model.name"
        @change="
          $store.dispatch('settings/updateStat', {
            index: id,
            prop: 'name',
            value: $event.target.value
          })
        "
      />
    </div>
    <div class="column mb15 mt15" ref="colorContainer">
      <label class="-center">Color</label>
      <verte
        picker="square"
        menuPosition="left"
        model="rgb"
        :value="model.color"
        @input="
          $store.dispatch('settings/updateStat', {
            index: id,
            prop: 'color',
            value: $event
          })
        "
      ></verte>
    </div>
    <div class="form-group mb8">
      <label>Period (m)</label>
      <input
        type="text"
        class="form-control"
        :value="getHms(model.period)"
        :placeholder="getHms($store.state.settings.statsPeriod)"
        @change="
          $store.dispatch('settings/updateStat', {
            index: id,
            prop: 'period',
            value: $event.target.value
          })
        "
      />
    </div>
    <div class="form-group mb8">
      <label>Precision</label>
      <input
        type="text"
        class="form-control"
        placeholder="auto"
        :value="model.precision"
        @change="
          $store.dispatch('settings/updateStat', {
            index: id,
            prop: 'precision',
            value: $event.target.value
          })
        "
      />
    </div>
    <div class="form-group">
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
        :value="model.output"
        @change="
          $store.dispatch('settings/updateStat', {
            index: id,
            prop: 'output',
            value: $event.target.value
          })
        "
      ></textarea>
      <p class="help-text mt-8">
        Sum <code>{{ model.output }}</code> over {{ getHms(model.period || $store.state.settings.statsPeriod) }} period
      </p>
    </div>
    <hr />
    <div class="form-group">
      <label class="checkbox-control -on-off" v-tippy="{ placement: 'bottom' }" :title="enabled ? 'Enable' : 'Disable'" @change="disable(id, $event)">
        <input type="checkbox" class="form-control" :checked="enabled" />
        <span>
          {{ enabled ? 'Active' : 'Disabled' }}
        </span>
        <div></div>
      </label>
    </div>
  </Dialog>
</template>

<script>
import store from '../store'
import { getHms } from '../utils/helpers'

import Dialog from './ui/Dialog.vue'
import DialogMixin from '../mixins/dialogMixin'

export default {
  props: ['id'],
  mixins: [DialogMixin],
  components: {
    Dialog
  },
  data: () => ({
    title: 'Stat',
    enabled: true,
    model: {
      color: null,
      enabled: null,
      name: null,
      output: null,
      precision: null,
      period: null
    }
  }),
  created() {
    this.model = store.state.settings.statsCounters[this.id] || {}

    if (this.model.name) {
      this.title = this.model.name
    }
  },
  methods: {
    getHms(value) {
      return getHms(value)
    },
    disable(id, event) {
      this.$store.dispatch('settings/updateStat', { index: id, prop: 'enabled', value: event.target.checked })
      this.close()
    }
  }
}
</script>
