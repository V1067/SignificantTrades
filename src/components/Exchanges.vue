<template>
  <transition-group
    :name="transitionGroupAnimation"
    tag="div"
    id="exchanges"
    class="exchanges condensed"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div
      v-for="id in list"
      :key="id"
      :class="'-' + id + ' -' + status[id].status"
      :title="id"
      @click="$store.commit('settings/TOGGLE_EXCHANGE_VISIBILITY', id)"
    >
      <div class="exchange__price" :class="{ '-hidden': exchanges[id].hidden }">
        <span v-html="$root.formatPrice(status[id].price)"></span> &nbsp;
      </div>
    </div>
  </transition-group>
</template>

<script>
import { mapState } from 'vuex'
import socket from '../services/socket'

export default {
  data() {
    return {
      hovering: false,
      list: [],
      status: {}
    }
  },
  computed: {
    ...mapState('app', ['activeExchanges']),
    ...mapState('settings', ['exchanges', 'animateExchangesBar']),
    transitionGroupAnimation: function() {
      if (this.animateExchangesBar) {
        return 'flip-list'
      } else {
        return null
      }
    }
  },
  created() {
    this.list = Object.keys(this.activeExchanges).filter(id => this.activeExchanges[id])
    this.status = socket.exchanges.reduce((obj, exchange) => {
      obj[exchange.id] = {
        status: 'pending',
        price: null
      }
      return obj
    }, {})
    this.onStoreMutation = this.$store.subscribe(mutation => {
      if (mutation.type === 'app/EXCHANGE_UPDATED' && mutation.payload) {
        const active = mutation.payload.active
        const listed = this.list.indexOf(mutation.payload.exchange) !== -1
        if (active && !listed) {
          this.list.push(mutation.payload.exchange)
        } else if (!active && listed) {
          this.list.splice(this.list.indexOf(mutation.payload.exchange), 1)
        }
      }
    })
    this.updateExchangesPrices()
  },
  beforeDestroy() {
    this.onStoreMutation()
    clearTimeout(this._updateExchangesPricesTimeout)
  },
  methods: {
    updateExchangesPrices() {
      this._updateExchangesPricesTimeout = setTimeout(this.updateExchangesPrices.bind(this), 1000 + Math.random() * 2000)
      const now = +new Date()
      for (let i = 0; i < socket.exchanges.length; i++) {
        const id = socket.exchanges[i].id
        if (!this.activeExchanges[socket.exchanges[i].id] || this.status[id].price === socket.exchanges[i].price) {
          continue
        }
        if (!socket.exchanges[i].price) {
          this.status[id].status = 'pending'
        } else if (now - socket.exchanges[i].timestamp > 10000) {
          this.status[id].status = 'idle'
        } else if (this.status[id].price > socket.exchanges[i].price) {
          this.status[id].status = 'down'
        } else if (this.status[id].price < socket.exchanges[i].price) {
          this.status[id].status = 'up'
        } else {
          this.status[id].status = 'neutral'
        }
        if (this.status[id].price !== socket.exchanges[i].price) {
          this.status[id].price = socket.exchanges[i].price
        }
      }
      if (this.hovering) {
        return
      }
      this.list = this.list.sort((a, b) => this.status[a].price - this.status[b].price)
    }
  }
}
</script>

<style lang="scss">
#exchanges {
  display: flex;
  flex-direction: row;
  height: 1.5em;
  > div {
    padding: 0.5em;
    display: flex;
    flex-direction: row;
    font-size: 0.9em;
    align-items: center;
    flex-grow: 1;
    flex-basis: 0;
    position: relative;
    line-height: 1;
    background-position: 0.5em;
    background-repeat: no-repeat;
    background-size: 1em;
    cursor: pointer;
    .exchange__price {
      margin-left: 1.25em;
      white-space: nowrap;
      &.-hidden {
        text-decoration: line-through;
      }
    }
    &.-up {
      background-color: transparent;
      color: lighten($green, 10%);
    }
    &.-down {
      background-color: transparent;
      color: $red;
    }
    &.-neutral {
      color: rgba(white, 0.75);
      font-style: italic;
    }
    &.-pending {
      background-color: rgba(white, 0.2);
      opacity: 0.5;
    }
    @each $exchange in $exchanges {
      &.-#{$exchange} {
        background-image: url('../assets/exchanges/#{$exchange}.svg');
      }
    }
  }
}
</style>
