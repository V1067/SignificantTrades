export default {
  price: {
    type: 'candlestick',
    input: `ohlc_avg_price(bar)`,
    options: {
      upColor: '#c3a87a',
      downColor: '#e53935',
      borderUpColor: '#c3a87a',
      borderDownColor: '#e53935',
      wickUpColor: 'rgba(223, 195, 148, .8)',
      wickDownColor: 'rgba(224, 91, 95, .8)',
      priceLineColor: 'rgba(255, 255, 255, .5)',
      priceLineWidth: 1,
      priceLineStyle: 2,
      lastValueVisible: true,
      priceLineVisible: true,
      borderVisible: false,
      scaleMargins: {
        top: 0,
        bottom: 0
      }
    }
  },
  volume_sell_ema: {
    type: 'line',
    input: `ema(bar.vsell,options.ema_length)`,
    options: {
      scaleAsVolume: true,
      ema_length: 14,
      priceScaleId: 'volume_ema',
      color: '#c14047',
      lineWidth: 2,
      overlay: true,
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    }
  },
  volume_buy_ema: {
    type: 'line',
    input: `ema(bar.vbuy, options.ema_length)`,
    options: {
      scaleAsVolume: true,
      ema_length: 14,
      priceScaleId: 'volume_ema',
      color: '#c9b087',
      lineWidth: 2,
      overlay: true,
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    }
  },
  volume_delta: {
    type: 'histogram',
    input: `{
      value: Math.abs(bar.vbuy-bar.vsell),
      color: bar.vbuy - bar.vsell > 0 ? options.upColor : options.downColor
    }`,
    options: {
      scaleAsVolume: true,
      upColor: '#c3a87a',
      downColor: '#e53935',
      priceScaleId: 'volume'
    }
  },
  volume: {
    type: 'histogram',
    input: `bar.vbuy + bar.vsell`,
    options: {
      scaleAsVolume: true,
      color: 'rgba(255, 255, 255, .15)',
      priceScaleId: 'volume'
    }
  },
  liquidations: {
    type: 'histogram',
    input: `bar.lbuy + bar.lsell`,
    options: {
      scaleAsVolume: true,
      priceScaleId: 'volume',
      color: '#9c27b0'
    }
  },
  cvd: {
    type: 'line',
    input: `ohlc((this.open || 0) + (bar.vbuy - bar.vsell))`,
    options: {
      priceScaleId: 'overlay1',
      scaleAsVolume: true,
      color: '#ffffff',
      lineWidth: 2,
      overlay: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.2
      },
      priceFormat: {
        type: 'volume',
        precision: 3,
        minMove: 0.05
      }
    }
  },
  ctd: {
    type: 'line',
    input: `bar.series.ctd.value + (bar.cbuy - bar.csell)`,
    options: {
      scaleAsVolume: true,
      color: '#ffffff',
      lineWidth: 1,
      lineStyle: 2,
      overlay: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.2
      }
    }
  },
  price_sma: {
    type: 'line',
    input: `sma(bar.series.price.point.close,options.length)`,
    options: {
      color: 'rgba(52,100,69,0.38)',
      length: 50,
      lineWidth: 2
    }
  },
  price_sma2: {
    type: 'line',
    input: `sma(bar.series.price.point.close,options.length)`,
    options: {
      color: 'rgba(52,100,69,0.38)',
      length: 50,
      lineWidth: 2
    }
  },
  price_cma: {
    type: 'line',
    input: `cma(bar.series.price.point.close,options.length)`,
    options: {
      length: 21,
      color: '#8c61f5',
      lineWidth: 2
    }
  },
  price_cma2: {
    type: 'line',
    input: `cma(bar.series.price.point.close,options.length)`,
    options: {
      length: 21,
      color: '#8c61f5',
      lineWidth: 2
    }
  }
}
