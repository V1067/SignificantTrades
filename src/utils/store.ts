import Vue from 'vue'
import store, { AppModule } from '../store/index'
import { ModuleTree } from 'vuex'

const persistModulesTimers = {}

export function syncState(state): Promise<void> {
  if (!state._id) {
    // unsupported module?
    return
  }

  if (typeof persistModulesTimers[state._id] === 'number') {
    clearTimeout(persistModulesTimers[state._id])
    delete persistModulesTimers[state._id]
  }

  const doc = JSON.stringify(store.state[state._id])

  localStorage.setItem(state._id, doc)

  return Promise.resolve()
}

export async function cleanDocument(state) {
  if (!state._id) {
    // unsupported module?
    return
  }

  const model = (await import('./' + state._id)).default.model
  const merge = Object.assign({}, store.state[state._id], model)

  for (const prop in merge) {
    if (typeof model[prop] === 'undefined' && typeof store.state[state._id] !== 'undefined') {
      Vue.delete(store.state[state._id], prop)
    } else if (typeof model[prop] !== 'undefined') {
      Vue.set(store.state[state._id], prop, model[prop])
    }
  }
}

export function scheduleSync(state, delay = 500) {
  if (!state._id) {
    // unsupported module?
    return
  }

  if (typeof persistModulesTimers[state._id] === 'number') {
    clearTimeout(persistModulesTimers[state._id])
  }

  persistModulesTimers[state._id] = setTimeout(() => {
    syncState(state)
  }, delay)
}

export function prepareModules(modules: ModuleTree<any>): AppModule<any> {
  for (const name in modules) {
    if (!modules[name].state._id) {
      // unsupported module?
      continue
    }

    try {
      const storedState = JSON.parse(localStorage.getItem(modules[name].state._id))

      if (storedState) {
        modules[name].state = Object.assign({}, modules[name].state, storedState)
      }
    } catch (error) {
      localStorage.removeItem(modules[name].state._id)
    }

    ;(modules[name] as any).model = Object.assign({}, modules[name].state)
  }

  return modules
}

export const normalizeSymbol = (symbol: string) => {
  return symbol.replace(/(?:%7F)+/g, '_').trim()
}
