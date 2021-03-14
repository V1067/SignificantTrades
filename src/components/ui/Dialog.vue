<template>
  <transition name="scale">
    <div
      v-if="open"
      class="dialog dialog-mask"
      @click="$emit('clickOutside')"
      :class="{ '-open': open, '-medium': medium, '-large': large, '-small': small }"
    >
      <div class="dialog-content" @click.stop>
        <header>
          <slot name="header"></slot>
          <div class="dialog-controls">
            <slot name="controls"></slot>

            <a href="javascript:void(0);" class="dialog-controls__close -link" @click="$emit('clickOutside')">
              <i class="icon-cross"></i>
            </a>
          </div>
        </header>
        <hr class="-across" />
        <div class="dialog-body">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  props: ['open', 'medium', 'large', 'small']
}
</script>
<style lang="scss" scoped>
.scale-enter-active,
.scale-leave-active {
  transition: opacity 0.2s $easeOutExpo, transform 0.2s $easeOutExpo;
}
.scale-enter, .scale-leave-to /* .scale-leave-active below version 2.1.8 */ {
  opacity: 0;
  transform: scale(0.8);
}
</style>
