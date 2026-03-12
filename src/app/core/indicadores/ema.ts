import { Candle } from '../inicio/servicios/prueba';

export function calculateEMA(data: Candle[], period: number): any[] {
  const k = 2 / (period + 1);
  let emaPrev = data[0].close;

  return data.map((c) => {
    const ema = c.close * k + emaPrev * (1 - k);
    emaPrev = ema;

    return {
      time: c.time,
      value: ema,
    };
  });
}
