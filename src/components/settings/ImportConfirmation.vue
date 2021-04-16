<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">Import settings</div>
    </template>
    <pre class="pretty-print" v-html="pretty"></pre>
    <footer>
      <a href="javascript:void(0);" class="btn -text" @click="close(false)">Annuler</a>
      <button class="btn -large" @click="close(true)">IMPORT</button>
    </footer>
  </Dialog>
</template>

<script>
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'

export default {
  props: ['settings'],
  mixins: [DialogMixin],
  computed: {
    pretty() {
      let json = this.settings

      if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 4)
      } else {
        json = JSON.stringify(JSON.parse(json), null, 2)
      }

      json = json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      const content = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function(
        match
      ) {
        let cls = 'number'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key'
          } else {
            cls = 'string'
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean'
        } else if (/null/.test(match)) {
          cls = 'null'
        }
        return '<span class="' + cls + '">' + match + '</span>'
      })

      return content
    }
  },
  components: {
    Dialog
  },
  data: () => ({}),
  methods: {}
}
</script>
