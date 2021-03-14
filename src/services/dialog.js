import Vue from 'vue'
import store from '@/store'

export async function showDialog(component, props = {}) {
  const container = document.querySelector('[data-app=true]') || document.body

  if (typeof component === 'string') {
    component = (await import('@/components/' + component + '.vue')).default
  }

  const Factory = Vue.extend(Object.assign({ store }, component))

  return new Promise(resolve => {
    const cmp = new Factory(
      Object.assign(
        {},
        {
          propsData: Object.assign({}, props),
          destroyed: () => {
            // container.removeChild(cmp.$el)

            resolve(cmp.value)
          }
        }
      )
    )

    container.appendChild(cmp.$mount().$el)
  })
}
