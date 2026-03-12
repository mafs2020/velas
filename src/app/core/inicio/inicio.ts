import { HttpClient, httpResource } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { forkJoin, map, Observable, tap } from 'rxjs';

import {
  CandlestickSeries,
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';

import { Candle, BinanceService } from './servicios/prueba';

import { calculateEMA, calculateBollinger } from '../indicadores';
@Component({
  selector: 'app-inicio',
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio implements AfterViewInit {
  binance = inject(BinanceService);
  @ViewChild('chart') chartEl!: ElementRef;
  @ViewChild('chart2') chartEl2!: ElementRef;
  private chart!: IChartApi;
  private series!: ISeriesApi<'Candlestick'>;
  hl2Series!: ISeriesApi<'Candlestick'>;
  ema3!: ISeriesApi<'Line'>;
  ema9!: ISeriesApi<'Line'>;
  ema20!: ISeriesApi<'Line'>;
  ema50!: ISeriesApi<'Line'>;
  ema200!: ISeriesApi<'Line'>;
  bbUpper!: ISeriesApi<'Line'>;
  bbMiddle!: ISeriesApi<'Line'>;
  bbLower!: ISeriesApi<'Line'>;
  macdLine!: ISeriesApi<'Line'>;
  signalLine!: ISeriesApi<'Line'>;
  histogram!: ISeriesApi<'Histogram'>;
  nuevo = forkJoin({
    historical: this.binance.getHistorical('btcusdt', '5m'),
    realTime: this.binance.connect('btcusdt', '5m'),
  });
  otro = this.binance.getHistorical('btcusdt', '5m').pipe(
    tap((history) => {
      this.chart.subscribeCrosshairMove(() => {
        this.drawHL2(history);
      });
      this.ema3.setData(calculateEMA(history, 3));
      this.ema9.setData(calculateEMA(history, 9));
      this.ema20.setData(calculateEMA(history, 20));
      this.ema50.setData(calculateEMA(history, 50));
      this.ema200.setData(calculateEMA(history, 200));
      const bbData = calculateBollinger(history);
      // this.bbUpper.setData([...bbData, bbData.map((d) => ({ time: d.time, value: d.upper }))]);
      // this.bbMiddle.setData([...bbData, bbData.map((d) => ({ time: d.time, value: d.middle }))]);
      // this.bbLower.setData([...bbData, bbData.map((d) => ({ time: d.time, value: d.lower }))]);
    }),
    map((data) => data[0]), // Convertir a milisegundos
  );
  sub?: Observable<Candle> = this.binance.connect('btcusdt', '5m').pipe(
    tap((c: Candle) => {
      this.series.update({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });

      this.hl2Series.update({
        time: c.time as any,
      });
    }),
  );
  ngAfterViewInit() {
    this.chart = createChart(this.chartEl.nativeElement, {
      width: window.innerWidth - 20,
      height: 800,
      layout: { background: { color: '#0e0e0e' }, textColor: '#ccc' },
      grid: { vertLines: { color: '#1f1f1f' }, horzLines: { color: '#1f1f1f' } },
    });

    this.series = this.chart.addSeries(CandlestickSeries);

    this.ema3 = this.chart.addSeries(LineSeries, { color: '#ff0000', lineWidth: 2 });
    this.ema9 = this.chart.addSeries(LineSeries, { color: '#ff9900', lineWidth: 2 });
    this.ema20 = this.chart.addSeries(LineSeries, { color: '#00ffff', lineWidth: 2 });
    this.ema50 = this.chart.addSeries(LineSeries, { color: '#00ff00', lineWidth: 2 });
    this.ema200 = this.chart.addSeries(LineSeries, { color: '#ffffff', lineWidth: 2 });

    // this.bbUpper = this.chart.addSeries(LineSeries, { color: '#8888ff' });
    // this.bbMiddle = this.chart.addSeries(LineSeries, { color: '#ffffff' });
    // this.bbLower = this.chart.addSeries(LineSeries, { color: '#8888ff' });

    this.macdLine = this.chart.addSeries(LineSeries);
    this.signalLine = this.chart.addSeries(LineSeries);
    this.histogram = this.chart.addSeries(HistogramSeries);

    const timeScale = this.chart.timeScale();
    const priceScale = this.series.priceScale();
    // this.hl2Series = this.chart.addSeries(LineSeries, {
    //   lineWidth: 2,
    //   priceLineVisible: false,
    // });

    // velas = rxResource({ stream })
    // velasDos = httpResource<any[]>(
    //   () => 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=10',
    // );

    // velas$ = this.#http
    //   .get<any[]>('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=10')
    //   // .pipe(map((val) => val[0]));
    //   .pipe(
    //     map((val) => [...val]),
    //     map((val) =>
    //       val.map((f: string[]) => {
    //         const dataVelas = Object.entries(f);
    //         // console.log('dataVelas :>> ', dataVelas);
    //         const nuevogg = {
    //           fecha: dataVelas[0][1],
    //           abrio: dataVelas[1][1],
    //           maximo: dataVelas[2][1],
    //           minimo: dataVelas[3][1],
    //           close: dataVelas[4][1],
    //           volumen: dataVelas[5][1],
    //           cierre: dataVelas[6][1],
    //           nose1: dataVelas[7][1],
    //           nose2: dataVelas[8][1],
    //           nose3: dataVelas[9][1],
    //           nose4: dataVelas[10][1],
    //           nose5: dataVelas[11][1],
    //         };
    //         return nuevogg;
    //       }),
    //     ),
    //     tap((data) => console.log(typeof data)),
    //   );
    // tap());
  }
  drawHL2(data: any[]) {
    const ctx = this.chartEl.nativeElement.querySelector('canvas').getContext('2d');

    ctx.save();
    ctx.strokeStyle = '#a333ba';
    ctx.lineWidth = 1;

    data.forEach((c) => {
      const x = this.chart.timeScale().timeToCoordinate(c.time);
      const y = this.series.priceToCoordinate((c.high + c.low) / 2);

      if (x && y) {
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y);
        ctx.stroke();
      }
    });

    ctx.restore();
  }
}
