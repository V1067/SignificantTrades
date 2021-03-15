export default {
  getNoticeById: state => id => {
    for (let i = 0; i < state.notices.length; i++) {
      if (state.notices[i].id === id) {
        return state.notices[i]
      }
    }
  }
}
