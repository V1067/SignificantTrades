<template>
  <div class="serie" :class="{ '-error': !!error, '-disabled': !visible }">
    <div class="serie__name" @click="edit">{{ name }}</div>

    <template v-if="!error">
      <div v-if="legend" class="serie__legend">{{ legend }}</div>

      <div class="serie__controls">
        <button class="btn -small" @click="toggleVisibility" v-tippy title="show/hide">
          <i :class="{ 'icon-eye': !visible, 'icon-eye-crossed': visible }"></i>
        </button>
        <!--<button class="btn -small" @click="bringOnTop" v-tippy title="bring on top"><i class="icon-up"></i></button>-->
        <button class="btn -small" @click="edit" v-tippy title="edit"><i class="icon-edit"></i></button>
        <button class="btn -small" @click="remove" v-tippy title="disable"><i class="icon-cross"></i></button>
      </div>
    </template>
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
        visibility: visible;
        pointer-events: all;
        transition-delay: 0s;
      }
    }
  }

  &__legend {
    color: lighten($green, 20%);
    margin-left: 0.4em;
    font-family: monospace;
    pointer-events: none;
    line-height: 1.8;
    letter-spacing: 0px;

    text-shadow: 1px 1px black;
  }

  &__controls {
    //padding-left: 1rem;
    display: inline-flex;
    align-items: center;
    pointer-events: none;
    visibility: hidden;
    transition: visibility;
    transition-delay: 1s;

    &:hover {
      pointer-events: all;
      visibility: visible;
      transition-delay: 0s;
    }

    > .btn {
      background-color: $orange;
      border-radius: 0;

      &:first-child {
        border-top-left-radius: 2px;
        border-bottom-left-radius: 2px;
      }

      &:last-child {
        border-top-right-radius: 2px;
        border-bottom-right-radius: 2px;
      }
    }
  }
}

#app.-light .serie__legend {
  color: $blue;
  text-shadow: none;
}
</style>
