<template>
  <transition name="scale">
    <div
      v-if="open"
      class="dialog dialog-mask"
      @click="$emit('clickOutside')"
      :class="{ '-open': open, '-medium': medium, '-large': large, '-small': small }"
    >
      <div class="dialog-content" @click.stop :style="`transform: translate(${delta.x}px, ${delta.y}px)`">
        <header @mousedown="handleMenuDrag" @touchstart="handleMenuDrag">
          <slot name="header"></slot>
          <div class="dialog-controls">
            <slot name="controls"></slot>

            <a href="javascript:void(0);" class="dialog-controls__close -link" @click="$emit('clickOutside')">
              <i class="icon-cross"></i>
            </a>
          </div>
        </header>
        <div class="dialog-body custom-scrollbar">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { getEventCords } from '../../utils/picker'
export default {
  props: ['open', 'medium', 'large', 'small'],
  data: () => ({
    delta: { x: 0, y: 0 }
  }),
  methods: {
    handleMenuDrag(event) {
      if (event.button === 2) return
      event.preventDefault()
      const lastMove = Object.assign({}, this.delta)
      const startPosition = getEventCords(event)
      const handleDragging = evnt => {
        window.requestAnimationFrame(() => {
          const endPosition = getEventCords(evnt)
          this.delta.x = lastMove.x + endPosition.x - startPosition.x
          this.delta.y = lastMove.y + endPosition.y - startPosition.y
        })
      }
      const handleRelase = () => {
        document.removeEventListener('mousemove', handleDragging)
        document.removeEventListener('mouseup', handleRelase)
        document.removeEventListener('touchmove', handleDragging)
        document.removeEventListener('touchup', handleRelase)
      }
      document.addEventListener('mousemove', handleDragging)
      document.addEventListener('mouseup', handleRelase)
      document.addEventListener('touchmove', handleDragging)
      document.addEventListener('touchup', handleRelase)
    }
  }
}
</script>
<style lang="scss" scoped>
.scale-enter-active,
.scale-leave-active {
  transition: opacity 0.2s $ease-out-expo, transform 0.2s $ease-out-expo;
}
.scale-enter, .scale-leave-to /* .scale-leave-active below version 2.1.8 */ {
  opacity: 0;
  transform: scale(0.8);
}
</style>
