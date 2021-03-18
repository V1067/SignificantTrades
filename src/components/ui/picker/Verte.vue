<template>
  <button
    class="btn"
    :style="{
      backgroundColor: value
    }"
    @click="openPicker"
  >
    <i class="icon-dropper"></i>
  </button>
</template>

<script>
import dialogService from '../../../services/dialog'

export default {
  name: 'Verte',
  props: {
    value: {
      type: String,
      default: '#000'
    }
  },
  data: () => ({
    currentColor: null,
    dialogInstance: null
  }),
  /* watch: {
    value(newColor) {
      this.currentColor = newColor
    }
  }, */
  beforeDestroy() {
    if (this.dialogInstance) {
      this.dialogInstance.$destroy()
    }
  },
  methods: {
    openPicker() {
      this.dialogInstance = dialogService.openPicker(this.value, color => {
        // this.value = color
        this.$emit('input', color)
      })
    }
  }
}
</script>
