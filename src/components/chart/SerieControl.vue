<template>
  <div class="serie" :class="{ '-error': !!error, '-disabled': !visible }">
    <div class="serie__name" @click="edit">{{ name }}</div>
    <div class="serie__controls" v-if="!error">
      <button class="btn -text -small" @click="toggleVisibility" v-tippy title="show/hide">
        <i :class="{ 'icon-eye': !visible, 'icon-eye-crossed': visible }"></i>
      </button>
      <!--<button class="btn -text -small" @click="bringOnTop" v-tippy title="bring on top"><i class="icon-up"></i></button>-->
      <button class="btn -text -small" @click="edit" v-tippy title="edit"><i class="icon-edit"></i></button>
      <button class="btn -text -small" @click="remove" v-tippy title="disable"><i class="icon-cross"></i></button>
      <div v-if="legend" class="serie__legend">{{ legend }}</div>
    </div>
    <template v-else>
      <i class="icon-warning mr15"></i>
      {{ error }}
    </template>
  </div>
</template>

<script>
import SerieDialog from './SerieDialog.vue'
import dialogService from '../../services/dialog'

export default {
  props: ['id', 'legend'],
  computed: {
    serie: function() {
      return this.$store.state.settings.series[this.id]
    },
    name: function() {
      if (this.serie.name && this.serie.name.length) {
        return this.serie.name
      } else {
        return this.id
      }
    },
    visible: function() {
      return typeof this.serie.options.visible === 'undefined' ? true : this.serie.options.visible
    },
    error: function() {
      return this.$store.state.app.activeSeriesErrors[this.id]
    }
  },
  methods: {
    edit() {
      dialogService.open(SerieDialog, { id: this.id })
    },
    bringOnTop() {
      alert('top')
    },
    toggleVisibility() {
      this.$store.dispatch('settings/toggleSerieVisibility', this.id)
    },
    remove() {
      this.$store.dispatch('settings/toggleSerie', this.id)
    }
  }
}
</script>

<style lang="scss">
.serie {
  display: flex;
  width: 0;
  white-space: nowrap;

  &.-error {
    color: $red;
  }

  &.-disabled {
    opacity: 0.5;
  }

  &__name {
    position: relative;
    cursor: pointer;
    line-height: 1.5;

    &:hover {
      + .serie__controls {
        display: inline-flex;
      }
    }
  }

  &__legend {
    color: lighten($green, 20%);
    margin-left: 0.4em;
    font-family: monospace;
    text-shadow: 1px 1px black;
    pointer-events: none;
  }

  &__controls {
    display: none;
    align-items: center;

    &:hover {
      display: inline-flex;
    }
  }
}
</style>
