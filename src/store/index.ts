import Vue from 'vue'
import Vuex, { Module, Store, StoreOptions } from 'vuex'
import { prepareModules, scheduleSync } from '@/utils/store'

import app, { AppState } from './app'
import settings, { SettingsState } from './settings'
import exchanges, { ExchangesState } from './exchanges'
import panes, { PanesState } from './panes'

Vue.use(Vuex)

Vue.use(Vuex)

export interface AppModuleTree<R> {
  [key: string]: Module<any, R>
}

export interface AppModule<R> extends Module<any, R> {
  boot?: (store: Store<ModulesState>) => void
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
  for (const id in modules) {
    const module = modules[id]

    if (typeof module.boot === 'function') {
      await module.boot(store, module.state)
    }
  }
}

export default store
