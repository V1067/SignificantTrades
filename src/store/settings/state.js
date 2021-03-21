import { parseQueryString } from '../../utils/helpers'
import { MASTER_DOMAIN } from '../../utils/constants'
import DEFAULTS from './defaults.json'
import { defaultChartSeries } from '../../components/chart/chartSeries'

/**
 *  QUERY STRING PARSER
 *  every options should be settable from querystring using encoded json
 */

const QUERY_STRING = parseQueryString()

/**
 * ACTUAL STORED SETTINGS
 */

let STORED

try {
  STORED = JSON.parse(localStorage.getItem('settings')) || {}
} catch (error) {
  console.log('[store] failed to load settings')

  STORED = {}
}

/**
 *  EXTRA
 *
 *  1.SUBDOMAIN (only for MASTER_DOMAIN)
 *  automaticaly map subdomain as a *pair* and replace it in options
 *  eg: ethusd.aggr.trade will set the *pair* options to ethusd.
 */
const EXTRA = {}

if (MASTER_DOMAIN) {
  const subdomain = window.location.hostname.match(/^([\d\w\-_]+)\..*\./i)
  const except = ['beta', 'www']

  if (subdomain && subdomain.length >= 2 && except.indexOf(subdomain[1]) === -1) {
    EXTRA.pair = subdomain[1].replace(/_/g, '+').toUpperCase()
  }
}

if (STORED.series) {
  for (const serieId in STORED.series) {
    if (!STORED.series[serieId].input) {
      delete STORED.series[serieId]
    }
  }
}

if (!STORED.series || !Object.keys(STORED.series).length) {
  STORED.series = Object.keys(defaultChartSeries)
    .filter(id => defaultChartSeries[id].enabled !== false)
    .reduce((series, id) => {
      series[id] = {}
      return series
    }, {})
}

export default Object.assign({}, DEFAULTS, EXTRA, STORED, QUERY_STRING)
