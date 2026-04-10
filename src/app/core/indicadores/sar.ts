import { Candle } from '../inicio/servicios/prueba';

export interface SARPoint {
  time: number;
  value: number;
  isBullish: boolean;
}
export function calculateParabolicSAR(candles: Candle[], step = 0.02, maxAF = 0.2): SARPoint[] {
  if (candles.length < 2) return [];

  const result: SARPoint[] = [];

  let isBullish = candles[1].close > candles[0].close;
  let af = step;

  let ep = isBullish ? candles[0].high : candles[0].low;
  let sar = isBullish ? candles[0].low : candles[0].high;

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];

    // 1. Calculo base
    sar = sar + af * (ep - sar);

    // 2. Protección CORRECTA (solo vela anterior)
    if (isBullish) {
      sar = Math.min(sar, prev.low);
    } else {
      sar = Math.max(sar, prev.high);
    }

    // 3. Cambio de tendencia
    if (isBullish && curr.low < sar) {
      isBullish = false;
      sar = ep;
      ep = curr.low;
      af = step;
    } else if (!isBullish && curr.high > sar) {
      isBullish = true;
      sar = ep;
      ep = curr.high;
      af = step;
    } else {
      // 4. Actualizar EP y AF
      if (isBullish) {
        if (curr.high > ep) {
          ep = curr.high;
          af = Math.min(af + step, maxAF);
        }
      } else {
        if (curr.low < ep) {
          ep = curr.low;
          af = Math.min(af + step, maxAF);
        }
      }
    }

    result.push({
      time: curr.time,
      value: sar,
      isBullish,
    });
  }

  return result;
}
