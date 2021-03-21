/**
 * @typedef {{
 *  exchange: string,
 *  timestamp: number,
 *  price: number,
 *  size: number,
 *  side: 'buy' | 'sell',
 *  liquidation?: boolean,
 *  slippage?: number,
 * }} Trade
 */

/**
 * @typedef {{
 *  from: number,
 *  to: number
 * }} Range
 */

/**
 * @typedef {{
 *  id: string,
 *  input: string,
 *  type: string,
 *  options: Object,
 *  model: TranspilationResult,
 *  api: import('lightweight-charts').ISeriesApi
 * }} ActiveSerie
 */

/**
 * @typedef {{
 *  output: string,
 *  references: string[],
 *  exchanges: string[],
 *  variables: Instruction[],
 *  functions: Instruction[],
 * }} TranspilationResult
 */

/**
 * @typedef {{
 *  name: string,
 *  type: string,
 *  state: any
 * }} Instruction
 */

/**
 * @typedef {{
 *  from: number,
 *  to: number,
 *  bars: Bar[],
 * }} Chunk
 */

/**
 * @typedef {{
 *  timestamp: number,
 *  exchanges: {[name: string]: Bar},
 *  series: {[id: string]: RendererSerieData},
 *  vbuy: number,
 *  vsell: number,
 *  cbuy: number,
 *  csell: number,
 *  lbuy: number,
 *  lsell: number,
 * }} Renderer
 */

/**
 * @typedef {{
 *  value: number,
 *  memory?: RendererSerieMemory,
 * }} RendererSerieData
 */

/**
 * @typedef {{
 *  output: number,
 *  count: number,
 *  sum: number,
 *  points: [],
 * }} RendererSerieMemory
 */

/**
 * @typedef {{
 *  exchange: number,
 *  timestamp: number,
 *  vbuy: number,
 *  vsell: number,
 *  cbuy: number,
 *  csell: number,
 *  lbuy: number,
 *  lsell: number,
 *  open: number,
 *  high: number,
 *  low: number,
 *  close: number,
 * }} Bar
 */
