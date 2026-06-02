import { PagoCalculator } from './pago-calculator';
import { Pago, PagoEstado } from '../entities/pago.entity';

/**
 * Helper para construir un Pago de prueba con valores por defecto razonables.
 */
const buildPago = (overrides: Partial<Pago> = {}): Pago =>
  ({
    id: 'pago-1',
    contratoId: 'contrato-1',
    inmobiliariaId: 'inm-1',
    montoTotal: 1_000_000,
    montoAbonado: 0,
    estado: PagoEstado.PENDIENTE,
    fechaPagoEsperada: new Date('2026-05-20'),
    fechaPagoReal: null,
    ...overrides,
  }) as Pago;

describe('PagoCalculator', () => {
  // ── aplicar ────────────────────────────────────────────────────────────
  describe('aplicar', () => {
    it('calcula saldo, mora y total para una cuota vencida con saldo pendiente', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 0,
        fechaPagoEsperada: new Date('2026-05-20'),
      });
      const hoy = new Date('2026-05-26'); // 6 días de retraso

      PagoCalculator.aplicar(pago, hoy);

      // saldo = 1.000.000 − 0 = 1.000.000
      expect(pago.saldoPendiente).toBe(1_000_000);
      // diasRetraso = 6
      expect(pago.diasRetraso).toBe(6);
      // mora = 1.000.000 × 0.01 × 6 = 60.000
      expect(pago.mora).toBe(60_000);
      // total = saldo + mora = 1.060.000
      expect(pago.totalAPagar).toBe(1_060_000);
    });

    it('retorna mora 0 cuando la cuota aún no está vencida', () => {
      const pago = buildPago({
        montoTotal: 1_500_000,
        montoAbonado: 0,
        fechaPagoEsperada: new Date('2026-06-15'),
      });
      const hoy = new Date('2026-05-26');

      PagoCalculator.aplicar(pago, hoy);

      expect(pago.diasRetraso).toBe(0);
      expect(pago.mora).toBe(0);
      expect(pago.saldoPendiente).toBe(1_500_000);
      expect(pago.totalAPagar).toBe(1_500_000);
    });

    it('retorna mora 0 cuando la cuota vence justo el día actual', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 0,
        fechaPagoEsperada: new Date('2026-05-26'),
      });
      const hoy = new Date('2026-05-26');

      PagoCalculator.aplicar(pago, hoy);

      expect(pago.diasRetraso).toBe(0);
      expect(pago.mora).toBe(0);
    });

    it('retorna mora 0 si el saldo pendiente es 0 aunque haya retraso', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 1_000_000,
        fechaPagoEsperada: new Date('2026-04-01'),
      });
      const hoy = new Date('2026-05-26'); // muy vencido

      PagoCalculator.aplicar(pago, hoy);

      expect(pago.saldoPendiente).toBe(0);
      expect(pago.mora).toBe(0);
      expect(pago.totalAPagar).toBe(0);
    });

    it('soporta abonos parciales calculando mora solo sobre el saldo restante', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 400_000,
        fechaPagoEsperada: new Date('2026-05-20'),
      });
      const hoy = new Date('2026-05-30'); // 10 días de retraso

      PagoCalculator.aplicar(pago, hoy);

      // saldo = 600.000
      expect(pago.saldoPendiente).toBe(600_000);
      expect(pago.diasRetraso).toBe(10);
      // mora = 600.000 × 0.01 × 10 = 60.000
      expect(pago.mora).toBe(60_000);
      expect(pago.totalAPagar).toBe(660_000);
    });

    it('nunca devuelve saldo pendiente negativo (caso de sobreabono)', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 1_200_000,
        fechaPagoEsperada: new Date('2026-04-01'),
      });

      PagoCalculator.aplicar(pago, new Date('2026-05-26'));

      expect(pago.saldoPendiente).toBe(0);
      expect(pago.mora).toBe(0);
      expect(pago.totalAPagar).toBe(0);
    });

    it('trata valores string (provenientes de columnas decimal) como números', () => {
      const pago = buildPago({
        montoTotal: '2000000' as unknown as number,
        montoAbonado: '500000' as unknown as number,
        fechaPagoEsperada: new Date('2026-05-20'),
      });

      PagoCalculator.aplicar(pago, new Date('2026-05-25')); // 5 días

      expect(pago.saldoPendiente).toBe(1_500_000);
      expect(pago.diasRetraso).toBe(5);
      // mora = 1.500.000 × 0.01 × 5 = 75.000
      expect(pago.mora).toBe(75_000);
      expect(pago.totalAPagar).toBe(1_575_000);
    });

    it('ignora diferencias de hora al calcular días de retraso', () => {
      const pago = buildPago({
        fechaPagoEsperada: new Date('2026-05-20T23:59:59'),
      });
      // Mismo día calendario aunque las horas digan otra cosa
      PagoCalculator.aplicar(pago, new Date('2026-05-20T00:00:01'));

      expect(pago.diasRetraso).toBe(0);
      expect(pago.mora).toBe(0);
    });

    it('acepta fechaPagoEsperada como string ISO', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 0,
        fechaPagoEsperada: '2026-05-20' as unknown as Date,
      });

      PagoCalculator.aplicar(pago, new Date('2026-05-26'));

      expect(pago.diasRetraso).toBe(6);
      expect(pago.mora).toBe(60_000);
    });

    it('redondea la mora a 2 decimales', () => {
      const pago = buildPago({
        montoTotal: 1_234_567,
        montoAbonado: 0,
        fechaPagoEsperada: new Date('2026-05-25'),
      });

      PagoCalculator.aplicar(pago, new Date('2026-05-26')); // 1 día

      // 1.234.567 × 0.01 × 1 = 12.345.67
      expect(pago.mora).toBe(12_345.67);
    });

    it('retorna el mismo objeto recibido (modificación in-place)', () => {
      const pago = buildPago();
      const resultado = PagoCalculator.aplicar(pago, new Date());
      expect(resultado).toBe(pago);
    });

    it('no falla si recibe null/undefined', () => {
      expect(() => PagoCalculator.aplicar(null as any)).not.toThrow();
      expect(() => PagoCalculator.aplicar(undefined as any)).not.toThrow();
    });

    it('totalRecibido = montoAbonado + moraAbonada', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 1_000_000,
        moraAbonada: 60_000,
        fechaPagoEsperada: new Date('2026-05-20'),
      });
      PagoCalculator.aplicar(pago, new Date('2026-05-26'));

      expect(pago.totalRecibido).toBe(1_060_000);
    });

    it('totalRecibido es solo montoAbonado cuando moraAbonada es 0', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 1_000_000,
        moraAbonada: 0,
        fechaPagoEsperada: new Date('2026-06-10'),
      });
      PagoCalculator.aplicar(pago, new Date('2026-05-26'));

      expect(pago.totalRecibido).toBe(1_000_000);
    });

    it('expone moraGenerada (bruta) y mora pendiente por separado', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 0,
        moraAbonada: 0,
        fechaPagoEsperada: new Date('2026-05-20'),
      });
      PagoCalculator.aplicar(pago, new Date('2026-05-26')); // 6 días

      expect(pago.moraGenerada).toBe(60_000); // bruta
      expect(pago.mora).toBe(60_000);          // pendiente (sin abonos)
    });

    it('mora pendiente se reduce por moraAbonada', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 0,
        moraAbonada: 20_000, // ya pagó 20k de mora antes
        fechaPagoEsperada: new Date('2026-05-20'),
      });
      PagoCalculator.aplicar(pago, new Date('2026-05-26')); // genera 60k

      expect(pago.moraGenerada).toBe(60_000);
      expect(pago.mora).toBe(40_000); // 60k − 20k ya abonados
      expect(pago.totalAPagar).toBe(1_040_000); // capital 1M + mora pendiente 40k
    });

    it('mora pendiente nunca es negativa aunque se haya pagado más mora de la generada', () => {
      const pago = buildPago({
        montoTotal: 1_000_000,
        montoAbonado: 0,
        moraAbonada: 100_000, // pagó más mora de la actual
        fechaPagoEsperada: new Date('2026-05-25'),
      });
      PagoCalculator.aplicar(pago, new Date('2026-05-26')); // mora generada = 10k

      expect(pago.mora).toBe(0);
      expect(pago.totalAPagar).toBe(1_000_000);
    });
  });

  // ── sumarRecaudado ─────────────────────────────────────────────────────
  describe('sumarRecaudado', () => {
    it('suma montoAbonado + moraAbonada de cada pago', () => {
      const pagos = [
        buildPago({ montoAbonado: 1_000_000, moraAbonada: 60_000 }),
        buildPago({ montoAbonado: 500_000, moraAbonada: 10_000 }),
      ];
      expect(PagoCalculator.sumarRecaudado(pagos)).toBe(1_570_000);
    });

    it('retorna 0 con lista vacía o nula', () => {
      expect(PagoCalculator.sumarRecaudado([])).toBe(0);
      expect(PagoCalculator.sumarRecaudado(null as any)).toBe(0);
    });

    it('trata moraAbonada nula/undefined como 0', () => {
      const pagos = [buildPago({ montoAbonado: 800_000, moraAbonada: undefined as any })];
      expect(PagoCalculator.sumarRecaudado(pagos)).toBe(800_000);
    });
  });

  // ── sumarPendiente ─────────────────────────────────────────────────────
  describe('sumarPendiente', () => {
    it('suma saldo + mora pendiente de cada pago con retraso', () => {
      const pagos = [
        buildPago({
          montoTotal: 1_000_000,
          montoAbonado: 0,
          fechaPagoEsperada: new Date('2026-05-20'),
        }),
        buildPago({
          montoTotal: 500_000,
          montoAbonado: 100_000,
          fechaPagoEsperada: new Date('2026-05-22'),
        }),
      ];
      // hoy=2026-05-26 → p1: saldo 1M + mora 60k = 1.06M
      //                  p2: saldo 400k + mora (400k × 0.01 × 4 = 16k) = 416k
      expect(PagoCalculator.sumarPendiente(pagos, new Date('2026-05-26'))).toBe(
        1_476_000,
      );
    });

    it('no suma mora cuando el pago no está vencido', () => {
      const pagos = [
        buildPago({
          montoTotal: 1_000_000,
          montoAbonado: 0,
          fechaPagoEsperada: new Date('2026-06-15'),
        }),
      ];
      expect(PagoCalculator.sumarPendiente(pagos, new Date('2026-05-26'))).toBe(
        1_000_000,
      );
    });

    it('retorna 0 con lista vacía', () => {
      expect(PagoCalculator.sumarPendiente([])).toBe(0);
    });

    it('descuenta la mora ya abonada del pendiente', () => {
      const pagos = [
        buildPago({
          montoTotal: 1_000_000,
          montoAbonado: 0,
          moraAbonada: 30_000,
          fechaPagoEsperada: new Date('2026-05-20'),
        }),
      ];
      // mora generada = 60k − 30k abonada = 30k pendiente; total = 1M + 30k
      expect(PagoCalculator.sumarPendiente(pagos, new Date('2026-05-26'))).toBe(
        1_030_000,
      );
    });
  });

  // ── sumarEsperado ──────────────────────────────────────────────────────
  describe('sumarEsperado', () => {
    it('suma montoTotal + moraGenerada (bruta) de cada pago', () => {
      const pagos = [
        buildPago({
          montoTotal: 1_000_000,
          montoAbonado: 0,
          fechaPagoEsperada: new Date('2026-05-20'),
        }),
      ];
      // mora generada = 1M × 0.01 × 6 = 60k → esperado = 1M + 60k
      expect(PagoCalculator.sumarEsperado(pagos, new Date('2026-05-26'))).toBe(
        1_060_000,
      );
    });

    it('suma solo montoTotal cuando no hay mora generada', () => {
      const pagos = [
        buildPago({
          montoTotal: 2_000_000,
          montoAbonado: 0,
          fechaPagoEsperada: new Date('2026-06-15'),
        }),
      ];
      expect(PagoCalculator.sumarEsperado(pagos, new Date('2026-05-26'))).toBe(
        2_000_000,
      );
    });

    it('retorna 0 con lista vacía', () => {
      expect(PagoCalculator.sumarEsperado([])).toBe(0);
    });

    it('para pagos ya saldados usa moraAbonada (no moraGenerada=0)', () => {
      // Pago PAGADO: capital totalmente abonado, mora también abonada.
      // saldoPendiente = 0 → moraGenerada = 0; pero moraAbonada conserva
      // el historial de lo que se cobró por mora.
      const pagos = [
        buildPago({
          montoTotal: 1_000_000,
          montoAbonado: 1_000_000,
          moraAbonada: 60_000,
          estado: PagoEstado.PAGADO,
          fechaPagoEsperada: new Date('2026-05-20'),
        }),
      ];
      // esperado = montoTotal + max(moraGenerada=0, moraAbonada=60k) = 1.060.000
      expect(PagoCalculator.sumarEsperado(pagos, new Date('2026-05-26'))).toBe(
        1_060_000,
      );
    });

    it('garantiza totalEsperado >= totalRecaudado para cualquier mezcla', () => {
      const pagos = [
        buildPago({
          montoTotal: 1_000_000,
          montoAbonado: 1_000_000,
          moraAbonada: 60_000,
          estado: PagoEstado.PAGADO,
          fechaPagoEsperada: new Date('2026-05-20'),
        }),
        buildPago({
          montoTotal: 500_000,
          montoAbonado: 0,
          moraAbonada: 0,
          fechaPagoEsperada: new Date('2026-05-22'),
        }),
      ];
      const hoy = new Date('2026-05-26');
      const esperado = PagoCalculator.sumarEsperado(pagos, hoy);
      const recaudado = PagoCalculator.sumarRecaudado(pagos);
      expect(esperado).toBeGreaterThanOrEqual(recaudado);
    });
  });

  // ── aplicarLista ───────────────────────────────────────────────────────
  describe('aplicarLista', () => {
    it('aplica el cálculo a cada pago de la lista', () => {
      const pagos = [
        buildPago({ id: 'p1', montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: new Date('2026-05-20') }),
        buildPago({ id: 'p2', montoTotal: 500_000, montoAbonado: 100_000, fechaPagoEsperada: new Date('2026-05-21') }),
      ];

      PagoCalculator.aplicarLista(pagos, new Date('2026-05-26'));

      // p1: saldo 1M, 6 días → mora 60.000
      expect(pagos[0].saldoPendiente).toBe(1_000_000);
      expect(pagos[0].mora).toBe(60_000);

      // p2: saldo 400.000, 5 días → mora 20.000
      expect(pagos[1].saldoPendiente).toBe(400_000);
      expect(pagos[1].mora).toBe(20_000);
    });

    it('retorna lista vacía si no recibe pagos', () => {
      expect(PagoCalculator.aplicarLista([])).toEqual([]);
      expect(PagoCalculator.aplicarLista(null as any)).toEqual([]);
      expect(PagoCalculator.aplicarLista(undefined as any)).toEqual([]);
    });
  });
});
