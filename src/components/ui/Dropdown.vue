<template>
  <div class="dropdown">
    <div v-if="label" class="dropdown__label" @click="toggle" v-html="label"></div>
    <div class="dropdown__selected" @click="toggle">
      {{ (alwaysShowPlaceholder && options[selected]) || placeholder || 'Selection' }}
      <transition name="scale">
        <div class="dropdown__options" v-if="isOpen">
          <div class="dropdown__scroller custom-scrollbar">
            <div
              class="dropdown__option"
              v-for="(value, index) in options"
              :key="index"
              :class="{ active: !alwaysShowPlaceholder && index === selected }"
              @click="set(index)"
            >
              <slot :value="value" :index="index">
                <div>{{ value }}</div>
              </slot>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    options: {
      required: true
    },
    label: {
      required: false
    },
    selected: {
      required: false
    },
    placeholder: {
      required: false
    },
    alwaysShowPlaceholder: {
      default: true
    }
  },

  data() {
    return {
      isOpen: false
    }
  },

  methods: {
    toggle() {
      if (!this.isOpen) {
        this.show()
      } else {
        this.hide()
      }
    },

    show() {
      this.isOpen = true

      this.bindClickOutside()
    },

    hide() {
      this.isOpen = false

      this.unbindClickOutside()
    },

    bindClickOutside() {
      if (!this._clickOutsideHandler) {
        this._clickOutsideHandler = (event => {
          if (!this.$el.contains(event.target)) {
            this.hide()
          }
        }).bind(this)

        document.addEventListener('mousedown', this._clickOutsideHandler)
      }
    },

    unbindClickOutside() {
      if (this._clickOutsideHandler) {
        document.removeEventListener('mousedown', this._clickOutsideHandler)
        delete this._clickOutsideHandler
      }
    },

    set(index) {
      // this.selected = index
      this.$emit('output', index)
      this.hide()
    }
  }
}
</script>
