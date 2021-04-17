import store from '../store/index'
import { Module, ModuleTree } from 'vuex'

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

export function getStoredState(state: any) {
  try {
    const storedState = JSON.parse(localStorage.getItem(state._id))

    if (storedState) {
      return Object.assign({}, state, storedState)
    }
  } catch (error) {
    localStorage.removeItem(state._id)
  }

  return Object.assign({}, state)
}

export function prepareModules(modules: ModuleTree<any>): any {
  for (const name in modules) {
    if (!modules[name].state._id) {
      // unsupported module?
      continue
    }

    modules[name].state = getStoredState(modules[name].state)
  }

  return modules
}

export function preparePaneSettings(id: string, paneSettingsModule: Module<any, any>) {
  const state = JSON.parse(JSON.stringify(paneSettingsModule.state))

  state._id = id

  return { ...paneSettingsModule, state: getStoredState(state) }
}

export const normalizeSymbol = (symbol: string) => {
  return symbol.replace(/(?:%7F)+/g, '_').trim()
}

export function dumpSettings(): { [id: string]: any } {
  return JSON.parse(
    JSON.stringify(
      Object.keys(store.state).reduce((states, id) => {
        if (store.state[id]._id) {
          states[id] = store.state[id]
        }

        return states
      }, {})
    )
  )
}
