import '../../data/typedef'
import { MAX_CHUNKS } from '../../utils/constants'
import { getHms } from '../../utils/helpers'

/**
 * @type Chunk[]
 */
export const cache = []

/**
 * @type Range
 */
export const cacheRange = { from: null, to: null }

/**
 * append or prepend chunk to cache array
 * and recalculate cacheRange
 * @param{Chunk} chunk Chunk to add
 */
export function saveChunk(chunk) {
  // console.log(`[cache/saveChunk]`, formatTime(chunk.from), formatTime(chunk.to), chunk.bars.length, 'bars', chunk.active ? '[active chunk]' : '')

  let index

  if (!cache.length || cache[cache.length - 1].to < chunk.from) {
    // console.log(`\t-> push chunk at the end of cache array (chunk contain latest data)`)
    index = cache.push(chunk) - 1
  } else if (cache[0].from > chunk.to) {
    // console.log(`\t-> prepend chunk at the beginning of cache array (chunk contain old data)`)
    cache.unshift(chunk)
    index = 0
  } else {
    console.warn(`\t-> couldn't push or prepend the chunk -> abort`)
    return
  }

  if (index === 0) {
    if (cacheRange.from) {
      // console.log(`\t-> increase cacheRange (start) by ${getHms((cacheRange.from - chunk.from) * 1000)}`)
    } else {
      // console.log(`\t-> set cacheRange (start) = ${formatTime(chunk.from)}`)
    }
    cacheRange.from = chunk.from
  }

  if (index === cache.length - 1) {
    if (cacheRange.to) {
      // console.log(`\t-> increase cacheRange (end) by ${getHms((chunk.to - cacheRange.to) * 1000)}`)
    } else {
      // console.log(`\t-> set cacheRange (end) = ${formatTime(chunk.to)}`)
    }

    cacheRange.to = chunk.to
  }

  return chunk
}

export function clearCache() {
  console.log(`[chart/cache] clear cache`)

  cache.splice(0, cache.length)
  cacheRange.from = cacheRange.to = null
}

export function trimCache() {
  if (cache.length > MAX_CHUNKS) {
    const previousStart = cache[0].from

    console.log(`[cache/trimCache] remove ${cache.length - MAX_CHUNKS} expired chunks (max: ${MAX_CHUNKS})`)
    cache.splice(0, cache.length - MAX_CHUNKS)

    console.log(`\t-> decrease cacheRange (start) by ${getHms(cache[0].from - previousStart)}`)

    cacheRange.from = cache[0].from
  }
}
