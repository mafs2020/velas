import { TestBed } from '@angular/core/testing';

import { BinanceService } from './prueba';

describe('BinanceService', () => {
  let service: BinanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BinanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
