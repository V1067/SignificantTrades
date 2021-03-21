import { randomString } from '../../utils/helpers'

export default {
  refreshExchange({ commit }, exchange) {
    const active =
      !this.state.settings.exchanges[exchange] ||
      (this.state.settings.exchanges[exchange].match &&
        !this.state.settings.exchanges[exchange].disabled &&
        !this.state.settings.exchanges[exchange].hidden)

    commit('EXCHANGE_UPDATED', {
      exchange,
      active
    })
  },
  showNotice({ commit, getters }, notice) {
    let promise = Promise.resolve()

    if (typeof notice === 'string') {
      notice = {
        title: notice
      }
    }

    if (notice.id && getters.getNoticeById(notice.id)) {
      if (notice.update) {
        return this.dispatch('app/updateNotice', notice)
      } else {
        promise = this.dispatch('app/hideNotice', notice.id)
      }
    }

    return promise
      .then(() => {
        if (!notice.id) {
          notice.id = randomString()
        }

        if (typeof notice.timeout === 'undefined') {
          notice.timeout = notice.type === 'error' ? 10000 : 3000
        }

        if (notice.timeout > 0) {
          notice._timeout = setTimeout(() => {
            delete notice._timeout
            this.dispatch('app/hideNotice', notice.id)
          }, notice.timeout)
        }

        commit('CREATE_NOTICE', notice)
      })
      .catch(() => {
        // notice got duped
      })
  },
  hideNotice({ commit, getters }, id) {
    const notice = getters.getNoticeById(id)

    if (!notice) {
      return Promise.resolve()
    }

    if (notice._timeout) {
      clearTimeout(notice._timeout)
    }

    if (notice._reject) {
      notice._reject()
    }

    return new Promise((resolve, reject) => {
      notice._reject = reject
      notice._timeout = setTimeout(() => {
        commit('REMOVE_NOTICE', notice)
        delete notice._reject
        delete notice._timeout
        resolve()
      }, 100)
    })
  },
  updateNotice({ commit, getters, state }, notice) {
    const currentNotice = getters.getNoticeById(notice.id)
    const index = state.notices.indexOf(currentNotice)

    if (!currentNotice || index === -1) {
      return Promise.resolve()
    }

    commit('UPDATE_NOTICE', {
      index,
      notice
    })
  }
}
