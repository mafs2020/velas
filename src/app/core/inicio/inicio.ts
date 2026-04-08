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
// import { AsyncPipe } from '@angular/common';
import { finalize, Observable, Subscription, tap } from 'rxjs';

import {
  CandlestickSeries,
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LineSeries,
  AreaSeries,
  Time,
  LineData,
} from 'lightweight-charts';

import { Candle, BinanceService } from './servicios/prueba';
import { calculateEMA, calculateBollinger } from '../indicadores';
import { rxResource } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-inicio',
  imports: [],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio implements AfterViewInit {
  // Señales para timeframe y moneda
  time = signal<string>('1m');
  currency = signal<string>('btcusdt');

  // Servicios
  binance = inject(BinanceService);

  // Referencia al elemento del gráfico
  @ViewChild('chart') chartEl!: ElementRef;

  // Gráfico y series
  private chart!: IChartApi;
  private series!: ISeriesApi<'Candlestick'>;
  private ema3!: ISeriesApi<'Line'>;
  private ema9!: ISeriesApi<'Line'>;
  private ema20!: ISeriesApi<'Line'>;
  private ema50!: ISeriesApi<'Line'>;
  private ema200!: ISeriesApi<'Line'>;
  private medio!: ISeriesApi<'Line'>;
  private bbUpper!: ISeriesApi<'Line'>;
  private bbMiddle!: ISeriesApi<'Line'>;
  private bbLower!: ISeriesApi<'Line'>;
  private areaSeries!: ISeriesApi<'Area'>;
  private areaSeries200!: ISeriesApi<'Area'>;

  // Estado de velas e indicadores
  private ema3Anterior!: { time: Time; value: number };
  private ema9Anterior!: { time: Time; value: number };
  private ema20Anterior!: { time: Time; value: number };
  private ema50Anterior!: { time: Time; value: number };
  private ema200Anterior!: { time: Time; value: number };
  private bollingerDataAnterior: Candle[] = [];
  private currentCandle: Candle | null = null;
  private lastVela: number = 0;

  // Suscripciones
  // private streamSubscription?: Subscription;
  // private historicalSubscription?: Subscription;

  // Stream observable para el template
  // sub?: Observable<Candle>;

  // Resource para cargar datos históricos
  historicalData = resource({
    loader: ({ params, abortSignal }) =>
      fetch(
        `https://api.binance.com/api/v3/klines?symbol=${params.symbol.toUpperCase()}&interval=${params.interval}&limit=500`,
        { signal: abortSignal },
      )
        .then((res) => res.json())
        .then((data) => {
          const velas = this.binance.structureData(data);

          // Inicializar datos históricos
          this.initializeHistoricalData(velas);

          return velas;
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            console.log('🛑 Fetch abortado');
          } else {
            console.error('❌ Error cargando datos históricos:', error);
          }
          throw error;
        }),
    params: () => ({
      symbol: this.currency(),
      interval: this.time(),
    }),
  });

  updateRx = rxResource({
    params: () => ({
      symbol: this.currency(),
      interval: this.time(),
    }),
    stream: ({ params, abortSignal }) =>
      this.binance.connect(params.symbol, params.interval).pipe(
        tap((candle: Candle) => this.handleStreamUpdate(candle)),
        tap((candle: Candle) => console.log('se inicio stream en temporalidad: ', this.time())),
        finalize(() => console.log('🔌 Stream finalizado')),
      ),

    // const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    // const url = `wss://stream.binance.com:9443/ws/${stream}`;
  });

  ngAfterViewInit() {
    this.initializeChart();
  }

  // ngOnDestroy() {
  //   this.cleanup();
  // }

  /**
   * Inicializa el gráfico y todas sus series
   */
  private initializeChart(): void {
    this.chart = createChart(this.chartEl.nativeElement, {
      width: window.innerWidth - 20,
      height: 800,
      layout: {
        background: { color: '#0e0e0e' },
        textColor: '#ccc',
      },
      grid: {
        vertLines: { color: '#1f1f1f' },
        horzLines: { color: '#1f1f1f' },
      },
      localization: {
        locale: 'es-MX',
        priceFormatter: (price: any) => `$ ${price.toFixed(2)}`,
      },
      crosshair: {
        mode: 0,
        vertLine: {
          width: 1,
          color: '#9B7DFF',
          style: 2,
          labelBackgroundColor: '#9B7DFF',
        },
        horzLine: {
          color: '#9B7DFF',
          labelBackgroundColor: '#9B7DFF',
          width: 1,
          style: 1,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        // TODO ver configuraciones
      },
    });

    // Inicializar series
    this.series = this.chart.addSeries(CandlestickSeries, {
      borderVisible: false,
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    this.ema3 = this.chart.addSeries(LineSeries, {
      color: '#2f76aa',
      lineWidth: 2,
      title: 'EMA 3',
    });

    this.ema9 = this.chart.addSeries(LineSeries, {
      color: '#3b9a33',
      lineWidth: 2,
      title: 'EMA 9',
    });

    this.ema20 = this.chart.addSeries(LineSeries, {
      color: '#ffeb3b',
      lineWidth: 2,
      title: 'EMA 20',
    });

    this.ema50 = this.chart.addSeries(LineSeries, {
      color: '#f37523',
      lineWidth: 2,
      title: 'EMA 50',
    });

    this.ema200 = this.chart.addSeries(LineSeries, {
      color: '#d71526',
      lineWidth: 2,
      title: 'EMA 200',
    });

    this.medio = this.chart.addSeries(LineSeries, {
      color: '#a5ecb8',
      lineWidth: 1,
      lineStyle: 2,
      title: 'Mediana',
    });

    this.areaSeries = this.chart.addSeries(AreaSeries, {
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineColor: 'transparent',
      topColor: 'rgba(56, 33, 110,0.4)',
      bottomColor: 'rgba(56, 33, 110, 0.05)',
    });

    this.areaSeries200 = this.chart.addSeries(AreaSeries, {
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineColor: 'transparent',
      topColor: '#eb5d5d17',
      bottomColor: '#eb5d5d10',
    });

    this.bbUpper = this.chart.addSeries(LineSeries, {
      color: '#138484',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Upper',
    });

    this.bbMiddle = this.chart.addSeries(LineSeries, {
      color: '#872323',
      lineWidth: 1,
      title: 'BB Middle',
    });

    this.bbLower = this.chart.addSeries(LineSeries, {
      color: '#138484',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Lower',
    });

    // Iniciar stream después de inicializar el gráfico
    // setTimeout(() => this.reconnectStream(), 100);
  }

  /**
   * Inicializa los datos históricos en el gráfico
   */
  private initializeHistoricalData(velas: Candle[]): void {
    if (!this.series || velas.length === 0) return;

    // Guardar últimas 20 velas para Bollinger
    this.bollingerDataAnterior = [...velas.slice(-20)];

    // Establecer última vela
    this.lastVela = velas[velas.length - 1]?.time || 0;

    // Configurar datos de velas
    this.series.setData(velas as any);

    // Calcular y configurar EMAs
    const ema3Data = calculateEMA(velas, 3);
    const ema9Data = calculateEMA(velas, 9);
    const ema20Data = calculateEMA(velas, 20);
    const ema50Data = calculateEMA(velas, 50);
    const ema200Data = calculateEMA(velas, 200);

    this.ema3.setData(ema3Data);
    this.ema9.setData(ema9Data);
    this.ema20.setData(ema20Data);
    this.ema50.setData(ema50Data);
    this.ema200.setData(ema200Data);

    // Guardar últimos valores de EMA
    this.ema3Anterior = ema3Data[ema3Data.length - 1];
    this.ema9Anterior = ema9Data[ema9Data.length - 1];
    this.ema20Anterior = ema20Data[ema20Data.length - 1];
    this.ema50Anterior = ema50Data[ema50Data.length - 1];
    this.ema200Anterior = ema200Data[ema200Data.length - 1];

    // Calcular y configurar Bandas de Bollinger
    const bollinger = calculateBollinger(velas);
    this.bbUpper.setData(bollinger.upper as any);
    this.bbMiddle.setData(bollinger.middle as any);
    this.bbLower.setData(bollinger.lower as any);

    // Configurar series de área
    const medianData = velas.map((v) => ({
      time: v.time,
      value: (v.high + v.low) / 2,
    }));

    this.areaSeries.setData(medianData as any);
    this.areaSeries200.setData(ema200Data);

    // Configurar línea de mediana
    this.medio.setData(
      velas.map((v) => ({
        time: v.time,
        value: (v.high + v.low) / 2,
      })) as any,
    );

    // Ajustar el rango visible
    this.chart.timeScale().fitContent();
  }

  /**
   * Reconecta el stream de WebSocket
   */
  // private reconnectStream(): void {
  // Cancelar suscripción anterior
  // this.streamSubscription?.unsubscribe();
  // Crear nuevo stream
  // this.sub = this.binance.connect(this.currency(), this.time()).pipe(
  //   tap((candle: Candle) => this.handleStreamUpdate(candle)),
  //   finalize(() => console.log('🔌 Stream finalizado')),
  // );
  // Suscribirse al stream
  // this.streamSubscription = this.sub.subscribe({
  //   error: (error) => {
  //     console.error('❌ Error en el stream:', error);
  //     // Intentar reconectar después de 5 segundos
  //     setTimeout(() => this.reconnectStream(), 5000);
  //   },
  // });
  // }

  /**
   * Maneja las actualizaciones del stream en tiempo real
   */
  private handleStreamUpdate(candle: Candle): void {
    // Normalizar el tiempo según el timeframe
    const normalizedTime = this.calculateNormalizedTime(candle.time);

    // Determinar si es una vela nueva
    const isNewCandle = normalizedTime > this.lastVela;

    if (isNewCandle) {
      console.log(`🆕 Nueva vela: ${new Date(normalizedTime).toISOString()}`);
      this.lastVela = normalizedTime;

      // Actualizar buffer de Bollinger
      this.bollingerDataAnterior.push(candle);
      if (this.bollingerDataAnterior.length > 20) {
        this.bollingerDataAnterior.shift();
      }

      // Guardar vela actual
      this.currentCandle = { ...candle, time: normalizedTime };
    } else {
      // Actualizar vela existente
      if (this.currentCandle) {
        this.currentCandle = {
          ...this.currentCandle,
          high: Math.max(this.currentCandle.high, candle.high),
          low: Math.min(this.currentCandle.low, candle.low),
          close: candle.close,
        };
      } else {
        this.currentCandle = { ...candle, time: normalizedTime };
      }

      // Actualizar última vela en buffer de Bollinger
      if (this.bollingerDataAnterior.length > 0) {
        const lastIndex = this.bollingerDataAnterior.length - 1;
        this.bollingerDataAnterior[lastIndex] = {
          ...this.bollingerDataAnterior[lastIndex],
          high: Math.max(this.bollingerDataAnterior[lastIndex].high, candle.high),
          low: Math.min(this.bollingerDataAnterior[lastIndex].low, candle.low),
          close: candle.close,
        };
      }
    }

    // Actualizar vela en el gráfico
    this.series.update({
      time: normalizedTime as UTCTimestamp,
      open: isNewCandle ? candle.open : this.currentCandle!.open,
      high: this.currentCandle!.high,
      low: this.currentCandle!.low,
      close: this.currentCandle!.close,
    });

    // Calcular y actualizar EMAs
    this.updateEMAs(candle, normalizedTime, isNewCandle);

    // Actualizar Bandas de Bollinger
    this.updateBollingerBands(normalizedTime);

    // Actualizar mediana
    const medianValue = (this.currentCandle!.high + this.currentCandle!.low) / 2;
    this.medio.update({
      time: normalizedTime as UTCTimestamp,
      value: medianValue,
    } as any);

    this.areaSeries.update({
      time: normalizedTime as UTCTimestamp,
      value: medianValue,
    } as any);
  }

  /**
   * Actualiza todas las EMAs
   */
  private updateEMAs(candle: Candle, time: number, isNewCandle: boolean): void {
    // Calcular nuevos valores EMA
    const ema3Value = this.calculateUpdatedEMA(
      candle.close,
      3,
      this.ema3Anterior?.value || candle.close,
    );
    const ema9Value = this.calculateUpdatedEMA(
      candle.close,
      9,
      this.ema9Anterior?.value || candle.close,
    );
    const ema20Value = this.calculateUpdatedEMA(
      candle.close,
      20,
      this.ema20Anterior?.value || candle.close,
    );
    const ema50Value = this.calculateUpdatedEMA(
      candle.close,
      50,
      this.ema50Anterior?.value || candle.close,
    );
    const ema200Value = this.calculateUpdatedEMA(
      candle.close,
      200,
      this.ema200Anterior?.value || candle.close,
    );

    // Actualizar series en el gráfico
    this.ema3.update({ time: time as UTCTimestamp, value: ema3Value });
    this.ema9.update({ time: time as UTCTimestamp, value: ema9Value });
    this.ema20.update({ time: time as UTCTimestamp, value: ema20Value });
    this.ema50.update({ time: time as UTCTimestamp, value: ema50Value });
    this.ema200.update({ time: time as UTCTimestamp, value: ema200Value });
    this.areaSeries200.update({ time: time as UTCTimestamp, value: ema200Value });

    // Si es una vela nueva, actualizar valores anteriores
    if (isNewCandle) {
      this.ema3Anterior = { time: time as UTCTimestamp, value: ema3Value };
      this.ema9Anterior = { time: time as UTCTimestamp, value: ema9Value };
      this.ema20Anterior = { time: time as UTCTimestamp, value: ema20Value };
      this.ema50Anterior = { time: time as UTCTimestamp, value: ema50Value };
      this.ema200Anterior = { time: time as UTCTimestamp, value: ema200Value };
    }
  }

  /**
   * Calcula el valor actualizado de una EMA
   */
  private calculateUpdatedEMA(price: number, period: number, previousEMA: number): number {
    const multiplier = 2 / (period + 1);
    return (price - previousEMA) * multiplier + previousEMA;
  }

  /**
   * Actualiza las Bandas de Bollinger
   */
  private updateBollingerBands(time: number): void {
    if (this.bollingerDataAnterior.length < 20) return;

    const bollinger = calculateBollinger(this.bollingerDataAnterior);
    const lastUpper = bollinger.upper[bollinger.upper.length - 1];
    const lastMiddle = bollinger.middle[bollinger.middle.length - 1];
    const lastLower = bollinger.lower[bollinger.lower.length - 1];

    if (lastUpper && lastMiddle && lastLower) {
      this.bbUpper.update({ time: time as UTCTimestamp, value: lastUpper.value });
      this.bbMiddle.update({ time: time as UTCTimestamp, value: lastMiddle.value });
      this.bbLower.update({ time: time as UTCTimestamp, value: lastLower.value });
    }
  }

  /**
   * Normaliza el timestamp según el timeframe seleccionado
   */
  private calculateNormalizedTime(timestamp: number): number {
    const intervalMap: Record<string, number> = {
      '1m': 60_000,
      '5m': 5 * 60_000,
      '15m': 15 * 60_000,
      '1h': 60 * 60_000,
      '2h': 2 * 60 * 60_000,
      '4h': 4 * 60 * 60_000,
      '1d': 24 * 60 * 60_000,
      '7d': 7 * 24 * 60 * 60_000,
      '1M': 30 * 24 * 60 * 60_000,
    };

    const interval = intervalMap[this.time()] || 60_000;

    // Normalizar al inicio del período
    return Math.floor(timestamp / interval) * interval;
  }

  /**
   * Cambia la temporalidad del gráfico
   */
  cambiarTemporalidad(t: string): void {
    console.log(`📊 Cambiando temporalidad a: ${t}`);
    this.time.set(t);
  }

  /**
   * Cambia la moneda del gráfico
   */
  cambiarMoneda(currency: string): void {
    console.log(`💰 Cambiando moneda a: ${currency}`);
    this.currency.set(currency);
  }

  /**
   * Limpia recursos al destruir el componente
   */
  // private cleanup(): void {
  //   this.streamSubscription?.unsubscribe();
  //   this.historicalSubscription?.unsubscribe();
  //   this.chart?.remove();
  //   this.binance.disconnect();
  // }
}
