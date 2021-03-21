<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">new serie</div>
      <div class="column -center"></div>
    </template>
    <div class="form-group mb15">
      <label>Name</label>
      <input class="form-control" :value="name" @input="getSerieId($event.target.value)" />
      <small class="help-text"> id will be: {{ id }} </small>
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
import store from '../../store'
import { slugify, uniqueName } from '../../utils/helpers'
import Dialog from '../ui/Dialog.vue'
import DialogMixin from '../../mixins/dialogMixin'

export default {
  mixins: [DialogMixin],
  components: {
    Dialog
  },
  data: () => ({
    id: null,
    name: 'My New Serie',
    priceScaleId: 'price'
  }),
  computed: {
    availableScales: function() {
      return Object.keys(store.state.settings.series)
        .map(id => store.state.settings.series[id].options.priceScaleId)
        .filter((x, i, a) => {
          return x && a.indexOf(x) == i
        })
    },
    serieId: function() {
      return slugify(this.name)
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
        this.id = uniqueName(slugify(name), Object.keys(store.state.settings.series))
        this.name = name
      }
    },
    create() {
      this.close({
        id: this.id,
        name: this.name,
        priceScaleId: this.priceScaleId || this.id
      })
    }
  }
}
</script>
