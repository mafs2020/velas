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
import { AsyncPipe, JsonPipe } from '@angular/common';
import { map, Observable, tap } from 'rxjs';

import {
  CandlestickSeries,
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LineSeries,
  AreaSeries,
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
        `https://api.binance.com/api/v3/klines?symbol=${params.symbol.toUpperCase()}&interval=${params.interval}&limit=400`,
        { signal: abortSignal },
      )
        .then((res) => res.json())
        .then((data) => {
          const velas = this.binance.structureData(data);
          this.series.setData(velas as any);

          this.ema3.setData(calculateEMA(velas, 3) as any);
          this.ema9.setData(calculateEMA(velas, 9) as any);
          this.ema20.setData(calculateEMA(velas, 20) as any);
          this.ema50.setData(calculateEMA(velas, 50) as any);
          this.ema200.setData(calculateEMA(velas, 200) as any);
          this.areaSeries200.setData(calculateEMA(velas, 200) as any);
          const ff = calculateBollinger(velas);
          this.bbUpper.setData(ff.upper as any);
          this.bbMiddle.setData(ff.middle as any);
          this.bbLower.setData(ff.lower as any);

          const lineData = velas.map((datapoint) => ({
            time: datapoint.time,
            value: (datapoint.close + datapoint.open) / 2,
          }));

          this.areaSeries.setData(lineData as any);

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
              // shape: 'circle',
              // size: 1,
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
      this.series.update({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });

      this.ema3.update(calculateEMA([c], 3) as any);
      this.ema9.update(calculateEMA([c], 9) as any);
      this.ema20.update(calculateEMA([c], 20) as any);
      this.ema50.update(calculateEMA([c], 50) as any);
      this.ema200.update(calculateEMA([c], 200) as any);
      this.areaSeries200.update(calculateEMA([c], 200) as any);
    }),
  );
  ngAfterViewInit() {
    this.chart = createChart(this.chartEl.nativeElement, {
      width: window.innerWidth - 20,
      height: 800,
      layout: { background: { color: '#0e0e0e' }, textColor: '#ccc' },
      grid: { vertLines: { color: '#1f1f1f' }, horzLines: { color: '#1f1f1f' } },
      localization: {
        dateFormat: 'dd/MM/yyyy ',
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

    this.ema3 = this.chart.addSeries(LineSeries, { color: '#ff0000', lineWidth: 2 });
    this.ema9 = this.chart.addSeries(LineSeries, { color: '#ff9900', lineWidth: 2, lineStyle: 3 });
    this.ema20 = this.chart.addSeries(LineSeries, { color: '#00ffff', lineWidth: 2 });
    this.ema50 = this.chart.addSeries(LineSeries, { color: '#00ff00', lineWidth: 2 });
    this.ema200 = this.chart.addSeries(LineSeries, { color: '#eb5d5d', lineWidth: 2 });
    this.medio = this.chart.addSeries(LineSeries, { color: '#8888ff', lineWidth: 2 });

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

    this.bbUpper = this.chart.addSeries(LineSeries, { color: '#8888ff', lineWidth: 2 });
    this.bbMiddle = this.chart.addSeries(LineSeries, { color: '#ffffff', lineWidth: 1 });
    this.bbLower = this.chart.addSeries(LineSeries, { color: '#8888ff', lineWidth: 2 });

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
}
