// import { Pane } from '@/store/panes'
import { Pane } from '@/store/panes'
import Vue from 'vue'
import Component from 'vue-class-component'
// import Component from 'vue-class-component'

@Component({
  props: {
    pane: {
      required: true,
      type: Object as () => Pane
    }
  }
})
export default class PaneMixin extends Vue {
  private pane: Pane

  get id() {
    return this.pane.i
  }

  get settings() {
    return this.pane.settings
  }

  onResize?(newWidth: number, newHeight: number)
}
