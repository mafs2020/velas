import { AsyncPipe, JsonPipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, tap } from 'rxjs';

interface Vela {
  time: Date; // UNIX timestamp en segundos
  open: number;
  high: number;
  low: number;
  close: Date;
}

@Component({
  selector: 'app-inicio',
  imports: [JsonPipe, AsyncPipe],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio {
  #http = inject(HttpClient);
  // velas = rxResource({ stream })
  // velas = httpResource<any[]>(
  //   () => 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=10',
  // );

  velas = this.#http
    .get<any[]>('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=10')
    // .pipe(map((val) => val[0]));
    .pipe(
      map((val) => [...val]),
      map((val) =>
        val.map((f: string[]) => {
          const dataVelas = Object.entries(f);
          // console.log('dataVelas :>> ', dataVelas);
          const nuevogg = {
            fecha: dataVelas[0][1],
            abrio: dataVelas[1][1],
            maximo: dataVelas[2][1],
            minimo: dataVelas[3][1],
            close: dataVelas[4][1],
            volumen: dataVelas[5][1],
            cierre: dataVelas[6][1],
            nose1: dataVelas[7][1],
            nose2: dataVelas[8][1],
            nose3: dataVelas[9][1],
            nose4: dataVelas[10][1],
            nose5: dataVelas[11][1],
          };
          return nuevogg;
        }),
      ),
      tap((data) => console.log(typeof data)),
    );
  // tap());
}
