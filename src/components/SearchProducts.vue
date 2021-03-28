<template>
  <div v-if="showSearch" class="app__search">
    <Autocomplete :load="search" :query="query" :selected="pairs" @submit="setPairs($event)"></Autocomplete>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import Autocomplete from '@/components/ui/Autocomplete.vue'

@Component({
  name: 'SearchProducts',
  components: {
    Autocomplete
  }
})
export default class extends Vue {
  query = ''

  get showSearch() {
    return this.$store.state.app.showSearch
  }

  get pairs() {
    return this.$store.state.settings.pairs
  }

  get indexedProducts() {
    return this.$store.state.app.indexedProducts
  }

  @Watch('showSearch')
  onShowSearch(shown) {
    if (shown) {
      console.log('bind clic outside')
      this.bindSearchClickOutside()
    } else {
      console.log('unbind clic outside')
      this.unbindSearchClickOutside()
    }
  }

  mounted() {
    this.bindSearchOpenByKey()
  }

  beforeDestroy() {
    this.unbindSearchOpenByKey()
    this.unbindSearchClickOutside()
  }

  search(query) {
    const reg = new RegExp(query, 'i')

    return Array.prototype.concat(...Object.values(this.indexedProducts)).filter(a => reg.test(a))
  }

  setPairs(pairs: string[]) {
    this.$store.dispatch('settings/mergePairs', pairs)
    this.$store.commit('app/TOGGLE_SEARCH', false)
  }

  bindSearchOpenByKey() {
    document.addEventListener('keypress', this.onDocumentKeyPress)
  }

  unbindSearchOpenByKey() {
    document.removeEventListener('keypress', this.onDocumentKeyPress)
  }

  bindSearchClickOutside() {
    document.addEventListener('mousedown', this.onDocumentClick)
  }

  unbindSearchClickOutside() {
    document.removeEventListener('mousedown', this.onDocumentClick)
  }

  onDocumentKeyPress(event: KeyboardEvent) {
    const activeElement = document.activeElement as HTMLElement

    if (
      this.showSearch ||
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.isContentEditable
    ) {
      return
    }

    event = event || (window.event as any)
    const charCode = event.which || event.keyCode
    const charStr = String.fromCharCode(charCode)

    if (/[a-z0-9]/i.test(charStr)) {
      this.query = charStr
      this.$store.commit('app/TOGGLE_SEARCH', true)
    }
  }

  onDocumentClick(event) {
    const element = this.$el.children[0]

    if (element !== event.target && !element.contains(event.target)) {
      this.$store.commit('app/TOGGLE_SEARCH', false)
    }
  }
}
</script>
