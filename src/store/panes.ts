import { MutationTree, ActionTree, GetterTree } from 'vuex'
import { AppModule } from '.'

export interface Pane {
  x: number
  y: number
  w: number
  h: number
  i: string
  type: 'trades' | 'chart' | 'stats' | 'counters'
  settings: any
}

export interface PanesState {
  panes: Pane[]
}

const state = {
  _id: 'panes',
  panes: [
    {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      i: '1',
      type: 'stats',
      settings: {}
    },
    {
      x: 0,
      y: 1,
      w: 1,
      h: 3,
      i: '2',
      type: 'trades',
      settings: {}
    }
  ]
} as PanesState

const getters = {
  getPaneById: state => (id: string) => {
    for (let i = 0; i < state.panes.length; i++) {
      if (state.panes[i].i === id) {
        return state.panes[i]
      }
    }
  }
} as GetterTree<PanesState, PanesState>

const actions = {
  addItem({ commit, state }, item: Pane) {
    if (state.panes.find(i => i.i === item.i)) {
      throw new Error('add-item-symbol-already-added')
    }

    commit('ADD_ITEM', item)
  },
  removeItem({ commit, getters, state }, id: string) {
    const item = getters.getItemById(id)

    if (!item) {
      return
    }

    const index = state.panes.indexOf(item)

    commit('REMOVE_ITEM', index)
  },
  updateItem({ commit, getters, state }, item: Pane) {
    const index = state.panes.indexOf(getters.getItemById(item.i))

    if (index === -1) {
      throw new Error('update-item-unknown-item')
    }

    commit('UPDATE_ITEM', {
      index,
      item
    })
  }
} as ActionTree<PanesState, PanesState>

const mutations = {
  ADD_PANE: (state, item: Pane) => {
    state.panes.push(item)
  },
  REMOVE_ITEM: (state, index: number) => {
    state.panes.splice(index, 1)
  },
  UPDATE_ITEM: (state, { index, item }: { index: number; item: Pane }) => {
    state.panes[index] = item
  }
} as MutationTree<PanesState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
  async boot() {
    // throw new Error('ok')
  }
} as AppModule<PanesState>
