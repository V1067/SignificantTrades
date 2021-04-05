<template>
  <div v-if="showSearch" class="app__search">
    <Autocomplete :load="search" :query="query" :selected="pairs" @submit="setPairs($event)"></Autocomplete>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import Autocomplete from '@/components/framework/Autocomplete.vue'

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

  get searchTarget() {
    return this.$store.state.app.searchTarget
  }

  get pairs() {
    console.log('get pairs', this.searchTarget)
    if (this.searchTarget) {
      return this.$store.state.panes.panes[this.searchTarget].markets
    } else {
      return Object.keys(this.$store.state.panes.marketsListeners)
    }
  }

  get indexedProducts() {
    return this.$store.state.app.indexedProducts
  }

  @Watch('showSearch')
  onShowSearch(shown) {
    if (shown) {
      this.bindSearchClickOutside()
    } else {
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
    if (this.searchTarget) {
      this.$store.dispatch('panes/setMarketsForAll', pairs)
    } else {
      this.$store.dispatch('panes/setMarketsForPane', {
        id: this.searchTarget,
        markets: pairs
      })
    }

    this.$store.dispatch('app/hideSearch')
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
      this.$store.dispatch('app/showSearch')
    }
  }

  onDocumentClick(event) {
    const element = this.$el.children[0]

    if (element !== event.target && !element.contains(event.target)) {
      this.$store.dispatch('app/hideSearch')
    }
  }
}
</script>
