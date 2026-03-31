export enum timeframe {
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
  '1M',
}
export enum currency {
  BTCUSDT = 'btcusdt',
  ETHUSDT = 'ethusdt',
}

export interface BollingerBand {
  time: number;
  middle: number;
  upper: number;
  lower: number;
}

export interface LineaGrafica {
  time: number;
  value: number;
}
