<template>
  <div contenteditable="true" @keydown="onKeyDown" @input="changed = true" @focus="onFocus" @blur="onBlur" @click="onClick" @wheel="onWheel"></div>
</template>

<script>
import { countDecimals } from '../../utils/helpers'
export default {
  props: ['content', 'step', 'min', 'max'],
  data() {
    return {
      changed: false
    }
  },
  mounted: function() {
    this.$el.innerText = this.content
  },
  watch: {
    content: function() {
      if (this.$el.innerText !== this.content) {
        this.$el.innerText = this.content
      }
    }
  },
  methods: {
    selectAll() {
      window.setTimeout(() => {
        var sel, range
        if (window.getSelection && document.createRange) {
          range = document.createRange()
          range.selectNodeContents(this.$el)
          sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(range)
        } else if (document.body.createTextRange) {
          range = document.body.createTextRange()
          range.moveToElementText(this.$el)
          range.select()
        }
      }, 1)
    },
    onBlur(event) {
      if (event.which === 13) {
        event.preventDefault()
        return
      }

      this.changed && this.$emit('output', event.target.innerText)
      this.focused = false

      if (window.getSelection) {
        window.getSelection().removeAllRanges()
      } else if (document.selection) {
        document.selection.empty()
      }
    },
    onKeyDown(event) {
      if (event.which === 13) {
        event.preventDefault()

        this.$el.blur()

        return
      }

      if (!isNaN(event.target.innerText) && (event.which === 38 || event.which === 40)) {
        const max = typeof this.max === 'undefined' ? Infinity : this.max
        const min = typeof this.min === 'undefined' ? 0 : this.min
        const step = this.step || 1
        const precision = countDecimals(step)
        const change = step * (event.which === 40 ? -1 : 1)
        const value = +Math.max(min, Math.min(max, +event.target.innerText + change)).toFixed(precision)

        this.$emit('output', value)
      }
    },
    onFocus() {
      !this.focused && this.selectAll()

      this.changed = false
      this.focused = true
    },
    onClick() {
      const now = +new Date()

      if (this.clickAt && now - this.clickAt < 250) {
        this.selectAll()
      }

      this.clickAt = now
    },
    onWheel(event) {
      if (!document.activeElement.isContentEditable) {
        return
      }

      event.preventDefault()

      if (!isNaN(event.target.innerText)) {
        this.$emit('output', +event.target.innerText + Math.sign(event.deltaY) * -1)
      }
    }
  }
}
</script>
