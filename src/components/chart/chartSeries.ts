export const defaultChartSeries = {
  cvd: {
    name: 'CVD',
    type: 'candlestick',
    description: 'Cumulative Volume Delta',
    input: 'cum_ohlc(vbuy - vsell)',
    options: {
      priceScaleId: 'right',
      priceFormat: {
        type: 'volume'
      },
      upColor: 'rgba(165,214,167,0)',
      borderUpColor: 'rgb(255,235,59)',
      wickUpColor: 'rgb(255,235,59)',
      downColor: 'rgba(239,154,154,0)',
      borderDownColor: 'rgb(255,167,38)',
      wickDownColor: 'rgb(255,152,0)',
      borderVisible: true,
      lastValueVisible: true,
      priceLineVisible: true
    }
  },
  price: {
    name: 'PRICE',
    type: 'area',
    description: 'Price',
    input: 'avg_close(bar)',
    axisLabelVisible: true,
    options: {
      priceScaleId: 'price',
      lineWidth: 1,
      lineStyle: 0,
      priceLineVisible: true,
      lastValueVisible: true,
      topColor: 'rgba(33,150,243,0.26)',
      lineColor: 'rgb(33,150,243)',
      bottomColor: 'rgba(33,150,243,0)'
    }
  },
  volume: {
    name: 'VOL',
    type: 'histogram',
    description: 'Volume',
    input: 'vbuy + vsell',
    options: {
      priceFormat: {
        type: 'volume'
      },
      color: 'rgba(255, 255, 255, .15)',
      priceScaleId: 'volume'
    }
  },
  liquidations: {
    name: 'LIQ',
    type: 'histogram',
    description: 'Forced Liquidations',
    input: '{value: lbuy+lsell,color: lbuy - lsell > 0 ? options.upColor : options.downColor}',
    options: {
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: 'volume_liquidations',
      upColor: 'rgba(255,235,59,0.79)',
      downColor: 'rgba(103,58,183,0.69)',
      scaleMargins: {
        top: 0.9,
        bottom: 0
      }
    }
  },
  volume_delta: {
    name: 'VOL',
    type: 'histogram',
    description: 'Volume Delta',
    input: '{value: Math.abs(vbuy-vsell),color: vbuy - vsell > 0 ? options.upColor : options.downColor}',
    options: {
      priceFormat: {
        type: 'volume'
      },
      upColor: '#c3a87a',
      downColor: '#e53935',
      priceScaleId: 'volume'
    }
  },
  ctd: {
    input: 'cum(cbuy-csell)',
    type: 'line',
    name: 'CTD',
    description: 'Cumulative Trade Delta',
    options: {
      priceScaleId: 'ctd',
      lineStyle: 4,
      lineWidth: 1
    }
  },
  'cvd-50-ma': {
    type: 'line',
    name: 'CVD 50 MA',
    enabled: true,
    input: 'sma($cvd.close, options.smaLength)',
    options: {
      priceScaleId: 'right',
      color: 'rgb(255,235,59)',
      smaLength: 50,
      lineWidth: 1
    }
  }
}
