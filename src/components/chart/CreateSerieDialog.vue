<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">new serie</div>
      <div class="column -center"></div>
    </template>
    <template v-if="inactiveSeries.length">
      <dropdown
        class="form-control -left"
        :options="inactiveSeries"
        :alwaysShowPlaceholder="true"
        placeholder="Choose from available series"
        @output="enableSerie"
      >
        <template v-slot:option="{ value }">
          <div class="serie-dropdown-control">
            <span>{{ value.name }}</span>
            <i class="icon-trash -action" @click.stop="$store.dispatch(paneId + '/removeSerie', value.id)"></i>
          </div>
        </template>
      </dropdown>
      <hr />
    </template>
    <div class="form-group mb15">
      <label>Name</label>
      <input class="form-control" :value="name" @input="getSerieId($event.target.value)" />
      <small class="help-text"> id will be: {{ serieId }} </small>
    </div>
    <div class="form-group mb15" v-if="availableScales.length">
      <label>Align serie with</label>
      <dropdown
        class="form-control -left -center"
        :selected="priceScaleId"
        :options="availableScales"
        placeholder="Default scale"
        @output="priceScaleId = $event"
      ></dropdown>
    </div>
    <hr />
    <footer>
      <a href="javascript:void(0);" class="-text mr15" @click="close(false)">Cancel</a>
      <button class="btn -large" @click="create">Create</button>
    </footer>
  </Dialog>
</template>

<script>
import store from '@/store'
import { slugify, uniqueName, getSerieSettings } from '@/utils/helpers'
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'

export default {
  mixins: [DialogMixin],
  props: {
    paneId: {
      type: String,
      required: true
    }
  },
  components: {
    Dialog
  },
  data: () => ({
    serieId: null,
    name: 'My New Serie',
    priceScaleId: 'price'
  }),
  computed: {
    availableScales: function() {
      return Object.keys(store.state[this.paneId].series)
        .map(id => store.state[this.paneId].series[id].options && store.state[this.paneId].series[id].options.priceScaleId)
        .filter((x, i, a) => {
          return x && a.indexOf(x) == i
        })
    },
    inactiveSeries() {
      const series = Object.keys(this.$store.state[this.paneId].series)
        .map(serieId => getSerieSettings(this.paneId, serieId))
        .filter(serie => {
          return serie.enabled === false
        })

      return series
    }
  },
  mounted() {
    this.getSerieId(this.name)
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
  },
  methods: {
    getSerieId(name) {
      if (name.length) {
        this.serieId = uniqueName(slugify(name), Object.keys(store.state[this.paneId].series))
        this.name = name
      }
    },
    create() {
      this.close({
        id: this.serieId,
        name: this.name,
        priceScaleId: this.priceScaleId || this.serieId
      })
    },
    enableSerie(index) {
      const option = this.inactiveSeries[index]

      this.$store.dispatch(this.paneId + '/toggleSerie', option.id)

      this.close(null)
    }
  }
}
</script>
