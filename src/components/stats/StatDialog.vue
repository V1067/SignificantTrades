<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div>
        <div class="title">STAT</div>
        <div class="subtitle">{{ title }}</div>
      </div>
    </template>
    <div class="column mb8">
      <div class="form-group  -fill">
        <label>Name</label>
        <input
          type="text"
          class="form-control"
          :value="model.name"
          @change="
            $store.dispatch('settings/updateStat', {
              id: id,
              prop: 'name',
              value: $event.target.value
            })
          "
        />
      </div>
      <div class="form-group -end mtauto" ref="colorContainer">
        <verte
          picker="square"
          menuPosition="left"
          model="rgb"
          :value="model.color"
          @input="
            $store.dispatch('settings/updateStat', {
              id: id,
              prop: 'color',
              value: $event
            })
          "
        ></verte>
      </div>
    </div>
    <div class="column">
      <div class="form-group mb8">
        <label>Window (m)</label>
        <input
          type="text"
          class="form-control"
          :value="getHms(model.window)"
          :placeholder="getHms($store.state.settings.statsWindow) + ' (default)'"
          @change="
            $store.dispatch('settings/updateStat', {
              id: id,
              prop: 'window',
              value: $event.target.value
            })
          "
        />
      </div>
      <div class="form-group mb8">
        <label>Precision</label>
        <editable
          class="form-control"
          placeholder="auto"
          :content="model.precision"
          @output="
            $store.dispatch('settings/updateStat', {
              id: id,
              prop: 'precision',
              value: $event
            })
          "
        ></editable>
      </div>
    </div>
    <div class="form-group">
      <label for
        >Value
        <span
          class="icon-info"
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
            id: id,
            prop: 'output',
            value: $event.target.value
          })
        "
      ></textarea>
      <p class="help-text mt-8">
        Sum <code>{{ model.output }}</code> over {{ getHms(model.window || $store.state.settings.statsWindow) }} window
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
import store from '@/store'
import { getHms } from '@/utils/helpers'

import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'

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
      window: null
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
      this.$store.dispatch('settings/updateStat', { id: id, prop: 'enabled', value: event.target.checked })
      this.close()
    }
  }
}
</script>
