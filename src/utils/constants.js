export const APPLICATION_START_TIME = +new Date()
export const MASTER_DOMAIN = /aggr.trade$/.test(window.location.hostname)
export const MAX_BARS_PER_CHUNKS = 1000
export const MAX_CHUNKS = 100
export const TOUCH_SUPPORTED = (function() {
  var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ')
  var mq = function(query) {
    return window.matchMedia(query).matches
  }

  if ('ontouchstart' in window || (window.DocumentTouch && document instanceof window.DocumentTouch)) {
    return true
  }

  var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('')
  return mq(query)
})()
