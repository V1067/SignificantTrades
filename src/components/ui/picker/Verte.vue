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
    dialogInstance: null
  }),
  beforeDestroy() {
    if (this.dialogInstance) {
      console.log('bout to destroy dialoginstance (picker)', this.dialogInstance)
      this.dialogInstance.$destroy()
    }
  },
  methods: {
    openPicker() {
      this.dialogInstance = dialogService.openPicker(this.value, color => {
        this.value = color
        this.$emit('input', this.value)
      })
    }
  }
}
</script>
