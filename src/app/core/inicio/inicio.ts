import { HttpClient, httpResource } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  resource,
  signal,
  ViewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AsyncPipe, JsonPipe, NgClass } from '@angular/common';
import { count, finalize, map, Observable, retry, take, tap } from 'rxjs';

import {
  CandlestickSeries,
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LineSeries,
  AreaSeries,
  WhitespaceData,
  Time,
  LineData,
  // SeriesMarker,
  // Time,
} from 'lightweight-charts';

import { Candle, BinanceService } from './servicios/prueba';

import { calculateEMA, calculateBollinger } from '../indicadores';
import { FormsModule, NgModel } from '@angular/forms';
import { currency, timeframe } from '../interfaces';
// import { debounce, form, FormField, required } from '@angular/forms/signals';

// interface graficaData {
//   time: string;
//   currency: string;
// }

// type currency = 'btcusdt' | 'ethusdt' | 'bnbusdt' | 'adausdt' | 'xrpusdt';

@Component({
  selector: 'app-inicio',
  imports: [AsyncPipe, FormsModule],
  // imports: [AsyncPipe, JsonPipe, FormField],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio implements AfterViewInit, OnDestroy {
  // fecha = Temporal.now();
  counter = 0;
  time = signal<string>('1m');
  currency = signal<string>('btcusdt');
  binance = inject(BinanceService);
  @ViewChild('chart') chartEl!: ElementRef;
  private chart!: IChartApi;
  private series!: ISeriesApi<'Candlestick'>;
  ema3!: ISeriesApi<'Line'>;
  ema9!: ISeriesApi<'Line'>;
  ema20!: ISeriesApi<'Line'>;
  ema50!: ISeriesApi<'Line'>;
  ema200!: ISeriesApi<'Line'>;
  medio!: ISeriesApi<'Line'>;
  bbUpper!: ISeriesApi<'Line'>;
  bbMiddle!: ISeriesApi<'Line'>;
  bbLower!: ISeriesApi<'Line'>;

  areaSeries!: ISeriesApi<'Area'>;
  areaSeries200!: ISeriesApi<'Area'>;
  n3!: LineData<Time>;
  n9!: LineData<Time>;
  n20!: LineData<Time>;
  n50!: LineData<Time>;
  n200!: LineData<Time>[];
  ema3Anterior!: { time: Time; value: number };
  ema9Anterior!: { time: Time; value: number };
  ema20Anterior!: { time: Time; value: number };
  ema50Anterior!: { time: Time; value: number };
  ema200Anterior!: { time: Time; value: number };
  bollingerDataAnterior!: Candle[];
  lastVela!: number;
  isFirst = true;
  // graficaModel = signal<graficaData>({
  //   time: '1m',
  //   currency: 'btcusdt',
  // });
  // graficaForm = form(this.graficaModel, (schemaPath) => {
  //   debounce(schemaPath.time, 500);
  //   required(schemaPath.time, { message: 'Selecciona un intervalo de tiempo' });
  //   required(schemaPath.currency, { message: 'Selecciona una moneda' });
  // });

  // rx = rxResource({
  //   stream: ({ params }: any) =>
  //     this.binance.connect(params.symbol, params.interval).pipe(
  //       tap((c: Candle) => {
  //         console.log('params.symbol :>> 30 ', params.symbol);
  //         console.log('params.interval :>> 30 ', params.interval);
  //       }),
  //   this.series.update({
  //     time: c.time as UTCTimestamp,
  //     open: c.open,
  //     high: c.high,
  //     low: c.low,
  //     close: c.close,
  //   });
  // }),
  //     ),
  //   params: () => ({
  //     symbol: this.currency(), // signal
  //     interval: this.time(), // signal
  //   }),
  // });
  rxr = resource({
    loader: ({ params, abortSignal }) =>
      fetch(
        `https://api.binance.com/api/v3/klines?symbol=${params.symbol.toUpperCase()}&interval=${params.interval}&limit=500`,
        { signal: abortSignal },
      )
        .then((res) => res.json())
        .then((data) => {
          const velas = this.binance.structureData(data);
          this.isFirst = true;

          this.bollingerDataAnterior = velas.slice(-20); // Guardamos las últimas 20 velas para el cálculo de Bollinger

          this.lastVela = this.bollingerDataAnterior.at(-1)!.time;

          this.series.setData(velas as any);
          const nTres = calculateEMA(velas, 3);
          const nNueve = calculateEMA(velas, 9);
          const nVeinte = calculateEMA(velas, 20);
          const nCincuenta = calculateEMA(velas, 50);
          const nDoscientos = calculateEMA(velas, 200);

          this.ema3Anterior = nTres.at(-1) as LineData<Time>;
          this.ema9Anterior = nNueve.at(-1) as LineData<Time>;
          this.ema20Anterior = nVeinte.at(-1) as LineData<Time>;
          this.ema50Anterior = nCincuenta.at(-1) as LineData<Time>;
          this.ema200Anterior = nDoscientos.at(-1) as LineData<Time>;

          this.ema3.setData(nTres);
          this.ema9.setData(nNueve);
          this.ema20.setData(nVeinte);
          this.ema50.setData(nCincuenta);
          this.ema200.setData(nDoscientos);
          const ff = calculateBollinger(velas);
          this.bbUpper.setData(ff.upper as any);
          this.bbMiddle.setData(ff.middle as any);
          this.bbLower.setData(ff.lower as any);

          const lineData = velas.map((datapoint) => ({
            time: datapoint.time,
            value: datapoint.medio,
          }));

          this.areaSeries.setData(lineData as any);
          this.areaSeries200.setData(nDoscientos);

          // const medianMarkers = velas.map((candle) => ({
          //   time: candle.time,
          //   position: 'inBar', // Ahora TS lo acepta gracias a la interfaz extendida
          //   price: (candle.high + candle.low) / 2,
          //   color: '#0037ff',
          //   shape: 'circle',
          //   size: 0.5,
          // }));

          // this.medio.setData(medianMarkers as any);

          // const medianMarkers = velas.map((candle) => ({
          //   time: candle.time,
          //   // --- ESTAS SON LAS PROPIEDADES "OCULTAS" ---
          //   position: 'inBar', // Fuerza al punto a NO irse arriba o abajo
          //   price: (candle.high + candle.low) / 2, // Coordenada y exacta
          //   // ------------------------------------------
          //   color: '#00FFFF',
          //   shape: 'circle',
          //   size: 0.5,
          //   id: `median_${candle.time}`,
          // }));

          this.medio.setData(
            velas.map((v) => ({
              time: v.time,
              value: v.medio,
              position: 'inBar', // Fuerza al punto a NO irse arriba o abajo
              price: v.medio, // Coordenada y exacta
              // ------------------------------------------
              // color: '#49d7d7',
              shape: 'circle',
              size: 1,
            })) as any,
          );
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            console.log('Fetch aborted');
          }
        })
        .finally(() => {
          console.log('Fetch completed');
        }),
    //   this.series.update({
    //     time: c.time as UTCTimestamp,
    //     open: c.open,
    //     high: c.high,
    //     low: c.low,
    //     close: c.close,
    //   });
    // }),

    params: () => ({
      symbol: this.currency(), // signal
      interval: this.time(), // signal
    }),
  });

  sub?: Observable<Candle> = this.binance.connect(this.currency(), this.time()).pipe(
    tap((c: Candle) => {
      const tiempo = this.calculateTime(c.time);
      console.log('tiempo :>> ', tiempo);
      console.log('tiempo :>> ', new Date(tiempo));
      const isNew = tiempo !== this.lastVela;

      this.series.update({
        time: tiempo as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });

      const jkl3 = this.binance.updateCalculateEMA(c, 3, this.ema3Anterior.value);
      const jkl9 = this.binance.updateCalculateEMA(c, 9, this.ema9Anterior.value);
      const jkl20 = this.binance.updateCalculateEMA(c, 20, this.ema20Anterior.value);
      const jkl50 = this.binance.updateCalculateEMA(c, 50, this.ema50Anterior.value);
      const jkl200 = this.binance.updateCalculateEMA(c, 200, this.ema200Anterior.value);

      if (isNew) {
        // 🟢 CONFIRMAS
        this.ema200Anterior = { time: tiempo as UTCTimestamp, value: jkl200.value };
        this.lastVela = tiempo;
      }

      this.ema200.update({
        time: jkl200.time as UTCTimestamp,
        value: jkl200.value,
      });

      // if (c.time != this.ema3Anterior.time) {
      //   console.log('se actualizo');
      //   this.ema3Anterior = jkl3;
      //   this.ema3.update({
      //     time: jkl3.time as UTCTimestamp,
      //     value: jkl3.value,
      //   });
      //   this.ema3Anterior = { time: c.time as UTCTimestamp, value: jkl3.value };
      // }
      // this.ema3.update({
      //   time: jkl3.time as UTCTimestamp,
      //   value: jkl3.value,
      // });

      // if (c.time != this.ema9Anterior.time) {
      //   this.ema9Anterior = jkl9;
      //   this.ema9.update({
      //     time: jkl9.time as UTCTimestamp,
      //     value: jkl9.value,
      //   });
      //   this.ema9Anterior = { time: c.time as UTCTimestamp, value: jkl9.value };
      // }
      // this.ema9.update({
      //   time: jkl9.time as UTCTimestamp,
      //   value: jkl9.value,
      // });

      // if (c.time != this.ema20Anterior.time) {
      //   this.ema20Anterior = jkl20;
      //   this.ema20.update({
      //     time: jkl20.time as UTCTimestamp,
      //     value: jkl20.value,
      //   });
      //   this.ema20Anterior = { time: c.time as UTCTimestamp, value: jkl20.value };
      // }
      // this.ema20.update({
      //   time: jkl20.time as UTCTimestamp,
      //   value: jkl20.value,
      // });

      // if (c.time != this.ema50Anterior.time) {
      //   this.ema50Anterior = jkl50;
      //   this.ema50.update({
      //     time: jkl50.time as UTCTimestamp,
      //     value: jkl50.value,
      //   });
      //   this.ema50Anterior = { time: c.time as UTCTimestamp, value: jkl50.value };
      // }
      // this.ema50.update({
      //   time: jkl50.time as UTCTimestamp,
      //   value: jkl50.value,
      // });

      // if (c.time != this.ema200Anterior.time) {
      //   this.ema200Anterior = jkl200;
      //   this.ema200.update({
      //     time: jkl200.time as UTCTimestamp,
      //     value: jkl200.value,
      //   });
      //   this.areaSeries200.update({
      //     time: jkl200.time as UTCTimestamp,
      //     value: jkl200.value,
      //   });
      //   this.ema200Anterior = { time: c.time as UTCTimestamp, value: jkl200.value };
      // }
      // this.ema200.update({
      //   time: jkl200.time as UTCTimestamp,
      //   value: jkl200.value,
      // });
      // this.areaSeries.update({
      //   time: c.time as UTCTimestamp,
      //   value: c.medio,
      // });
      // if (c.time != this.bollingerDataAnterior[this.bollingerDataAnterior.length - 1]?.time) {
      //   const bollinger = calculateBollinger([...this.bollingerDataAnterior, c]);
      //   this.bbUpper.update({
      //     time: c.time as UTCTimestamp,
      //     value: bollinger.upper[bollinger.upper.length - 1].value,
      //   });
      //   this.bbMiddle.update({
      //     time: c.time as UTCTimestamp,
      //     value: bollinger.middle[bollinger.middle.length - 1].value,
      //   });
      //   this.bbLower.update({
      //     time: c.time as UTCTimestamp,
      //     value: bollinger.lower[bollinger.lower.length - 1].value,
      //   });

      //   // Mantenemos solo las últimas 20 velas para el cálculo de Bollinger
      //   this.bollingerDataAnterior.push(c);
      //   this.bollingerDataAnterior.shift();
      // }
    }),
    // tap(() => console.log(++this.counter)),
    // retry(2),
    finalize(() => console.log('='.repeat(20) + ' STREAM COMPLETED ' + '='.repeat(20))),
  );
  ngAfterViewInit() {
    this.chart = createChart(this.chartEl.nativeElement, {
      width: window.innerWidth - 20,
      height: 800,
      layout: { background: { color: '#0e0e0e' }, textColor: '#ccc' },
      grid: { vertLines: { color: '#1f1f1f' }, horzLines: { color: '#1f1f1f' } },
      localization: {
        // dateFormat: '',
        locale: 'es-MX',
        priceFormatter: (price: any) => `$ ${price.toFixed(2)}`,
      },
      crosshair: {
        // Change mode from default 'magnet' to 'normal'.
        // Allows the crosshair to move freely without snapping to datapoints
        // mode: LightweightCharts.CrosshairMode.Normal,
        mode: 0, // 0 = normal, 1 = magnet, 2 = only horizontal, 3 = only vertical

        // Vertical crosshair line (showing Date in Label)
        vertLine: {
          width: 1,
          color: '#9B7DFF',
          // color: '#C3BCDB44',
          style: 2,
          labelBackgroundColor: '#9B7DFF',
        },

        // Horizontal crosshair line (showing Price in Label)
        horzLine: {
          color: '#9B7DFF',
          labelBackgroundColor: '#9B7DFF',
          width: 1,
          style: 1,
          // labelVisible: true,
        },
      },
    });

    this.series = this.chart.addSeries(CandlestickSeries, {
      borderVisible: false,
    });

    this.ema3 = this.chart.addSeries(LineSeries, { color: '#2f76aa', lineWidth: 3 });
    this.ema9 = this.chart.addSeries(LineSeries, { color: '#3b9a33', lineWidth: 3, lineStyle: 3 });
    this.ema20 = this.chart.addSeries(LineSeries, { color: '#3b9a33', lineWidth: 3 });
    this.ema50 = this.chart.addSeries(LineSeries, { color: '#f37523', lineWidth: 3 });
    this.ema200 = this.chart.addSeries(LineSeries, { color: '#d71526', lineWidth: 3 });
    this.medio = this.chart.addSeries(LineSeries, { color: '#a5ecb8', lineWidth: 2 });
    // this.medio = this.chart.addSeries(LineSeries, { color: '#8888ff', lineWidth: 2 });

    this.areaSeries = this.chart.addSeries(AreaSeries, {
      lastValueVisible: false, // hide the last value marker for this series
      crosshairMarkerVisible: false, // hide the crosshair marker for this series
      lineColor: 'transparent', // hide the line
      topColor: 'rgba(56, 33, 110,0.6)',
      bottomColor: 'rgba(56, 33, 110, 0.1)',
    });
    this.areaSeries200 = this.chart.addSeries(AreaSeries, {
      lastValueVisible: false, // hide the last value marker for this series
      crosshairMarkerVisible: false, // hide the crosshair marker for this series
      lineColor: 'transparent', // hide the line
      topColor: '#eb5d5d17',
      bottomColor: '#eb5d5d10',
    });

    this.bbUpper = this.chart.addSeries(LineSeries, { color: '#138484', lineWidth: 2 });
    // this.bbUpper = this.chart.addSeries(LineSeries, { color: '#8888ff', lineWidth: 2 });
    this.bbMiddle = this.chart.addSeries(LineSeries, { color: '#872323', lineWidth: 1 });
    this.bbLower = this.chart.addSeries(LineSeries, { color: '#138484', lineWidth: 2 });
    // this.bbLower = this.chart.addSeries(LineSeries, { color: '#8888ff', lineWidth: 2 });

    // this.macdLine = this.chart.addSeries(LineSeries);
    // this.signalLine = this.chart.addSeries(LineSeries);
    // this.histogram = this.chart.addSeries(HistogramSeries);

    // velas = rxResource({ stream })
    // velasDos = httpResource<any[]>(
    //   () => 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=10',
    // ); npm i technicalindicators
  }
  ngOnDestroy() {
    this.chart.remove();
    this.binance.disconnect();
  }

  cambiarTemporalidad(t: string) {
    console.log(t);
    this.time.set(t);
  }

  calculateTime(timestamp: number): number {
    // if (this.time() == '1m') return actual;
    const intervalMap: Record<string, number> = {
      '1m': 60_000,
      '5m': 5 * 60_000,
      '15m': 15 * 60_000,
      '1h': 60 * 60_000,
    };

    const interval = intervalMap[this.time()];

    return Math.floor(timestamp / interval) * interval;
  }
}
