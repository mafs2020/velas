import { LineData, Time, UTCTimestamp } from 'lightweight-charts';
import { Candle } from '../inicio/servicios/prueba';

export function calculateEMA(data: Candle[], period: number): LineData<Time>[] {
  const k = 2 / (period + 1);
  let emaPrev = data[0].close;

  return data.map((c, i) => {
    const ema = c.close * k + emaPrev * (1 - k);
    emaPrev = ema;

    return {
      time: c.time as UTCTimestamp,
      value: ema,
    };
  });
}
