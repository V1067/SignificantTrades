import Vue from 'vue'
import Vuex, { Module, StoreOptions } from 'vuex'
import { prepareModules, preparePaneSettings, scheduleSync } from '@/utils/store'

import app, { AppState } from './app'
import settings, { SettingsState } from './settings'
import exchanges, { ExchangesState } from './exchanges'
import panes, { PanesState } from './panes'
import panesSettings from './panesSettings'

Vue.use(Vuex)

Vue.use(Vuex)

export interface AppModuleTree<R> {
  [key: string]: Module<any, R>
}

export interface AppModule<R, M> extends Module<R, M> {
  boot?: (store: any, state: any) => void
}

export interface ModulesState {
  app: AppState
  settings: SettingsState
  panes: PanesState
  exchanges: ExchangesState
}

const modules = prepareModules({
  app,
  settings,
  panes,
  exchanges
})

for (const paneId in modules.panes.state.panes) {
  const type = modules.panes.state.panes[paneId].type

  if (panesSettings[type]) {
    modules[paneId] = preparePaneSettings(paneId, panesSettings[type])
  }
}

const store = new Vuex.Store({
  modules
} as StoreOptions<ModulesState>)

store.subscribe((mutation, state: any) => {
  const moduleId = mutation.type.split('/')[0]

  console.log(`[store] ${mutation.type}`)

  if (state[moduleId] && state[moduleId]._id) {
    scheduleSync(state[moduleId])
  }
})

export async function boot() {
  const promises = []

  for (const id in modules) {
    const module = modules[id]

    if (typeof module.boot === 'function') {
      promises.push(module.boot(store, module.state))
    }
  }

  await Promise.all(promises)

  store.dispatch('app/setBooted')
}

export default store
