// formula for Bollinger Bands:
// Middle = SMA(period)
// Upper = SMA + (stdDev * multiplier)
// Lower = SMA - (stdDev * multiplier)

export interface BollingerBand {
  time: number;
  middle: number;
  upper: number;
  lower: number;
}

import { Candle } from '../inicio/servicios/prueba';

export function calculateBollinger(candles: Candle[], period = 20, multiplier = 2): any[] {
  const result: BollingerBand[] = [];

  for (let i = period; i < candles.length; i++) {
    const slice = candles.slice(i - period, i);

    const closes = slice.map((c) => c.close);

    const mean = closes.reduce((a, b) => a + b, 0) / period;

    const variance = closes.reduce((a, b) => a + (b - mean) ** 2, 0) / period;

    const stdDev = Math.sqrt(variance);

    result.push({
      time: candles[i].time,
      middle: mean,
      upper: mean + stdDev * multiplier,
      lower: mean - stdDev * multiplier,
    });
  }

  return result;
}
