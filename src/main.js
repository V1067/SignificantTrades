import Vue from 'vue'
import App from './App.vue'
import VueTippy from 'vue-tippy'
import * as ModalDialogs from 'vue-modal-dialogs'
import './assets/sass/app.scss'
import store from './store'

const vueEnv = process.env

for (let key in vueEnv) {
  const match = key.match(/^VUE_APP_(.*)/)
  if (match && match[1]) {
    store.commit(`app/SET_${match[1]}`, vueEnv[key])
  }
}

Vue.use(ModalDialogs)

Vue.use(VueTippy, {
  maxWidth: '200px',
  duration: 200,
  arrow: false,
  animation: 'scale',
  size: 'small',
  delay: 0,
  animateFill: false,
  theme: 'blue'
})

import Verte from './components/ui/picker/Verte.vue'
import Editable from './components/ui/Editable'
import Dropdown from './components/ui/Dropdown'
Vue.component('verte', Verte)
Vue.component('dropdown', Dropdown)
Vue.component('editable', Editable)

import backgroundDirective from './directives/backgroundDirective'
Vue.directive('background', backgroundDirective)

new Vue({
  el: '#app',
  store,
  render: h => h(App),
  props: ['initialized']
})
