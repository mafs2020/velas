// formula for Bollinger Bands:
// Middle = SMA(period)
// Upper = SMA + (stdDev * multiplier)
// Lower = SMA - (stdDev * multiplier)

import { Candle } from '../inicio/servicios/prueba';

type BollingerResult = {
  upper: Point[];
  middle: Point[];
  lower: Point[];
};

type Point = {
  time: number;
  value: number;
};

export function calculateBollinger(
  candles: Candle[],
  period = 20,
  multiplier = 2,
): BollingerResult {
  const data: BollingerResult = { upper: [], middle: [], lower: [] };

  for (let i = period; i < candles.length; i++) {
    const slice = candles.slice(i - period, i);

    const closes = slice.map((c) => c.close);

    const mean = closes.reduce((a, b) => a + b, 0) / period;

    const variance = closes.reduce((a, b) => a + (b - mean) ** 2, 0) / period;

    const stdDev = Math.sqrt(variance);

    const time = candles[i].time;
    const upper = mean + stdDev * multiplier;
    const lower = mean - stdDev * multiplier;

    data.upper.push({ time, value: upper });
    data.middle.push({ time, value: mean });
    data.lower.push({ time, value: lower });
  }

  return data;
}
