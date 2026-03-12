import { Candle } from '../inicio/servicios/prueba';

export function calculateSAR(candles: Candle[], step = 0.02, max = 0.2) {
  let sar = candles[0].low;
  let ep = candles[0].high;
  let af = step;

  let uptrend = true;

  const result: any[] = [];

  for (let i = 1; i < candles.length; i++) {
    sar = sar + af * (ep - sar);

    if (uptrend) {
      if (candles[i].low < sar) {
        uptrend = false;
        sar = ep;
        ep = candles[i].low;
        af = step;
      }

      if (candles[i].high > ep) {
        ep = candles[i].high;
        af = Math.min(af + step, max);
      }
    } else {
      if (candles[i].high > sar) {
        uptrend = true;
        sar = ep;
        ep = candles[i].high;
        af = step;
      }

      if (candles[i].low < ep) {
        ep = candles[i].low;
        af = Math.min(af + step, max);
      }
    }

    result.push({
      time: candles[i].time,
      value: sar,
    });
  }

  return result;
}
