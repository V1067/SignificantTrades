export default {
  data: function() {
    return {
      output: null,
      open: false
    }
  },
  created() {
    if (module.hot) {
      module.hot.dispose(() => {
        this.close()
      })
    }
  },
  mounted() {
    this.open = true
  },
  methods: {
    close(data) {
      this.open = false

      if (data) {
        this.output = data
      }

      setTimeout(this.$destroy.bind(this), 500)
    }
  }
}
