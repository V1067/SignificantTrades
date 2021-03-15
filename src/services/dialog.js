import Vue from 'vue'
import store from '@/store'

import VerteDialog from '@/components/ui/picker/VerteDialog.vue'

class DialogService {
  constructor() {
    this.mountedComponents = {}
  }

  createComponent(component, props = {}, resolve = null) {
    const Factory = Vue.extend(Object.assign({ store }, component))

    const cmp = new Factory(
      Object.assign(
        {},
        {
          propsData: Object.assign({}, props),
          destroyed: () => {
            if (typeof resolve === 'function') {
              resolve(cmp.output)
            }
          }
        }
      )
    )

    const name = component.__file
      .split('\\')
      .pop()
      .split('/')
      .pop()
      .split('.')
      .slice(0, -1)
      .join('.')

    if (!this.mountedComponents[name]) {
      this.mountedComponents[name] = 0
    }

    this.mountedComponents[name]++

    return cmp
  }

  async openAsPromise(component, props = {}) {
    return new Promise(resolve => {
      component = this.createComponent(component, props, resolve)

      this.mountDialog(component)
    })
  }

  open(component, props = {}) {
    component = this.createComponent(component, props)

    console.log(component)

    this.mountDialog(component)

    return component
  }

  mountDialog(cmp) {
    const container = document.querySelector('[data-app=true]') || document.body
    container.appendChild(cmp.$mount().$el)
  }

  isDialogOpened(name) {
    return !!this.mountedComponents[name]
  }

  openPicker(initialColor, cb) {
    const dialog = this.open(VerteDialog, {
      value: initialColor
    })

    if (typeof cb === 'function') {
      dialog.$on('input', cb)
    }

    return dialog
  }
}

export default new DialogService()
