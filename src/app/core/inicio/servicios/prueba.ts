import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, Subject, tap } from 'rxjs';
import { currency, timeframe } from '../../interfaces';
import { LineData, Time, UTCTimestamp, WhitespaceData } from 'lightweight-charts';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  medio: number;
}

@Injectable({
  providedIn: 'root',
})
export class BinanceService {
  private socket?: WebSocket;
  private candle$ = new Subject<Candle>();
  #http = inject(HttpClient);

  connect(symbol: string, interval: string): Observable<Candle> {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;

    this.socket = new WebSocket(url);

    this.socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      const { k } = data;

      this.candle$.next({
        time: k.t,
        // time: Math.floor(k.t / 1000) || Math.floor(new Date().getTime() / 1000),
        open: +k.o,
        high: +k.h,
        low: +k.l,
        close: +k.c,
        volume: +k.v,
        medio: (+k.h + +k.l) / 2,
      });
    };

    return this.candle$.asObservable();
  }

  getHistorical(symbol: string, interval: string): Observable<Candle[]> {
    // https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=10
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=300`;
    return this.#http.get<Candle[]>(url).pipe(
      map<any[], Candle[]>((data: number[]) => this.structureData(data)),
      tap((candles) => console.log('Historical candles :>> ', candles)),
    );
  }

  disconnect() {
    this.socket?.close();
  }

  structureData(data: any[]): Candle[] {
    return data.map((d: any) => ({
      time: Math.floor(d[0]),
      open: +d[1],
      high: +d[2],
      low: +d[3],
      close: +d[4],
      volume: +d[5],
      medio: (+d[2] + +d[3]) / 2,
    }));
  }

  updateCalculateEMA(vela: Candle, period: number, emaPrev: number): LineData<Time> {
    const alpha = 2 / (period + 1);

    const emaNueva = vela.close * alpha + emaPrev * (1 - alpha);
    return {
      time: vela.time as UTCTimestamp,
      value: emaNueva,
    };
  }
}

// [
//   0  Open time
//   1  Open
//   2  High
//   3  Low
//   4  Close
//   5  Volume
//   6  Close time
//   7  Quote asset volume
//   8  Number of trades
//   9  Taker buy base volume
//   10 Taker buy quote volume
//   11 Ignore
// ]
