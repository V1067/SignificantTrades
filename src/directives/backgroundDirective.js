import store from '../store'
import { splitRgba, increaseBrightness, joinRgba, getColorLuminance } from '../utils/colors'

const applyBackgroundColor = (el, rgb, modifier = false) => {
  if (rgb) {
    let color = splitRgba(rgb)
    let luminance = getColorLuminance(color)
    if (typeof modifier === 'number' && modifier) {
      modifier *= (1 - luminance / 255) // prettier-ignore
      color = increaseBrightness(splitRgba(rgb), modifier)
      rgb = joinRgba(color)
    } else {
      color = splitRgba(rgb)
    }

    el.style.backgroundColor = rgb

    luminance = getColorLuminance(color)

    el.style.color = luminance < 175 ? '#f6f6f6' : '#111'
  }
}

export default {
  bind(el, binding) {
    const unwatchBackground = store.watch(
      state => state.settings.chartBackgroundColor,
      rgb => {
        applyBackgroundColor(el, rgb, +binding.value)
      }
    )
    const unwatchColor = store.watch(
      state => state.settings.chartColor,
      rgb => {
        el.style.color = rgb ? rgb : ''
      }
    )

    el.__background_unwatch_background_color__ = unwatchBackground
    el.__background_unwatch_color__ = unwatchColor

    applyBackgroundColor(el, store.state.settings.chartBackgroundColor, +binding.value)
  },
  unbind(el) {
    el.__background_unwatch_color__ && el.__background_unwatch_color__()
    el.__background_unwatch_background_color__ && el.__background_unwatch_background_color__()
  }
}
