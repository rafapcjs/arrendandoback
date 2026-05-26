import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { Pago, PagoEstado } from '../pagos/entities/pago.entity';
import { Role } from '../common/enums/roles.enum';

const mockUser = (role = Role.INMOBILIARIA, inmobiliariaId = 'inm-1') => ({ id: 'user-1', role, inmobiliariaId });

const makePago = (estado: PagoEstado, monto = 1500000, abonado = 0, moraAbonada = 0): Pago =>
  ({ montoTotal: monto, montoAbonado: abonado, moraAbonada, estado, fechaPagoEsperada: new Date() } as Pago);

const repoMock = () => ({ find: jest.fn() });

describe('ReportsService', () => {
  let service: ReportsService;
  let pagoRepo: jest.Mocked<Repository<Pago>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Pago), useFactory: repoMock },
      ],
    }).compile();
    service = module.get(ReportsService);
    pagoRepo = module.get(getRepositoryToken(Pago));
  });
  afterEach(() => jest.clearAllMocks());

  // ── getMonthlyIncomeReport ────────────────────────────────────────────────
  describe('getMonthlyIncomeReport', () => {
    it('calcula correctamente totales con pagos mixtos', async () => {
      pagoRepo.find.mockResolvedValue([
        makePago(PagoEstado.PAGADO, 1500000, 1500000),
        makePago(PagoEstado.PENDIENTE, 1500000),
        makePago(PagoEstado.VENCIDO, 1500000),
      ]);
      const result = await service.getMonthlyIncomeReport(2025, 1, mockUser());
      expect(result.totalEsperado).toBe(4500000);
      expect(result.totalPagado).toBe(1500000);
      expect(result.totalPendiente).toBe(3000000);
      expect(result.porcentajePagado).toBe(33.33);
      expect(result.numeroPagosEsperados).toBe(3);
      expect(result.numeroPagosCompletados).toBe(1);
    });

    it('incluye moraAbonada en totalPagado', async () => {
      pagoRepo.find.mockResolvedValue([
        makePago(PagoEstado.PAGADO, 1000000, 1000000, 50000),
        makePago(PagoEstado.PENDIENTE, 1000000),
      ]);
      const result = await service.getMonthlyIncomeReport(2026, 5, mockUser());
      expect(result.totalPagado).toBe(1050000);
      expect(result.totalPendiente).toBe(1000000);
    });

    it('totalPendiente nunca es negativo cuando el pago incluye mora', async () => {
      pagoRepo.find.mockResolvedValue([
        makePago(PagoEstado.PAGADO, 1000000, 1000000, 80000),
      ]);
      const result = await service.getMonthlyIncomeReport(2026, 5, mockUser());
      expect(result.totalPagado).toBe(1080000);
      expect(result.totalPendiente).toBeGreaterThanOrEqual(0);
      expect(result.totalPendiente).toBe(0);
    });

    it('porcentajePagado nunca supera 100 aunque la mora lo eleve', async () => {
      pagoRepo.find.mockResolvedValue([
        makePago(PagoEstado.PAGADO, 1000000, 1000000, 100000),
      ]);
      const result = await service.getMonthlyIncomeReport(2026, 5, mockUser());
      expect(result.porcentajePagado).toBeLessThanOrEqual(100);
    });

    it('retorna ceros si no hay pagos en el mes', async () => {
      pagoRepo.find.mockResolvedValue([]);
      const result = await service.getMonthlyIncomeReport(2025, 6, mockUser());
      expect(result.totalEsperado).toBe(0);
      expect(result.totalPagado).toBe(0);
      expect(result.porcentajePagado).toBe(0);
      expect(result.numeroPagosEsperados).toBe(0);
    });

    it('retorna porcentaje 100 si todos los pagos están completos', async () => {
      pagoRepo.find.mockResolvedValue([
        makePago(PagoEstado.PAGADO, 1000000, 1000000),
        makePago(PagoEstado.PAGADO, 2000000, 2000000),
      ]);
      const result = await service.getMonthlyIncomeReport(2025, 3, mockUser());
      expect(result.porcentajePagado).toBe(100);
      expect(result.numeroPagosCompletados).toBe(2);
    });

    it('incluye el año y mes en la respuesta', async () => {
      pagoRepo.find.mockResolvedValue([]);
      const result = await service.getMonthlyIncomeReport(2025, 7, mockUser());
      expect(result.year).toBe(2025);
      expect(result.month).toBe(7);
    });
  });

  // ── getAnnualIncomeReport ─────────────────────────────────────────────────
  describe('getAnnualIncomeReport', () => {
    it('genera reporte anual con 12 meses', async () => {
      pagoRepo.find.mockResolvedValue([makePago(PagoEstado.PAGADO, 1500000, 1500000)]);
      const result = await service.getAnnualIncomeReport(2025, mockUser());
      expect(result.year).toBe(2025);
      expect(result.reporteMensual).toHaveLength(12);
      expect(pagoRepo.find).toHaveBeenCalledTimes(12);
    });

    it('consolida totales anuales correctamente', async () => {
      pagoRepo.find.mockResolvedValue([makePago(PagoEstado.PAGADO, 1000000, 1000000)]);
      const result = await service.getAnnualIncomeReport(2025, mockUser());
      expect(result.totalEsperado).toBe(12000000);
      expect(result.totalPagado).toBe(12000000);
      expect(result.totalPendiente).toBe(0);
      expect(result.porcentajePagado).toBe(100);
    });

    it('retorna ceros si no hay pagos en el año', async () => {
      pagoRepo.find.mockResolvedValue([]);
      const result = await service.getAnnualIncomeReport(2025, mockUser());
      expect(result.totalEsperado).toBe(0);
      expect(result.totalPagado).toBe(0);
      expect(result.porcentajePagado).toBe(0);
    });
  });

  // ── getComparisonReport ───────────────────────────────────────────────────
  describe('getComparisonReport', () => {
    it('calcula distribución correcta por estado de pago', async () => {
      pagoRepo.find.mockResolvedValue([
        makePago(PagoEstado.PAGADO, 1000000, 1000000),
        makePago(PagoEstado.PARCIAL, 1000000, 400000),
        makePago(PagoEstado.PENDIENTE, 1000000),
        makePago(PagoEstado.VENCIDO, 1000000),
      ]);
      const result = await service.getComparisonReport('2025-01-01', '2025-12-31', mockUser());
      expect(result.totalEsperado).toBe(4000000);
      expect(result.totalPagado).toBe(1000000);
      expect(result.totalParcial).toBe(400000);
      expect(result.totalPendiente).toBe(1000000);
      expect(result.totalVencido).toBe(1000000);
      expect(result.distribucionPorEstado.pagado.cantidad).toBe(1);
      expect(result.distribucionPorEstado.parcial.cantidad).toBe(1);
      expect(result.distribucionPorEstado.pendiente.cantidad).toBe(1);
      expect(result.distribucionPorEstado.vencido.cantidad).toBe(1);
    });

    it('incluye moraAbonada en totalPagado y totalParcial del reporte comparativo', async () => {
      pagoRepo.find.mockResolvedValue([
        makePago(PagoEstado.PAGADO, 1000000, 1000000, 30000),
        makePago(PagoEstado.PARCIAL, 1000000, 400000, 5000),
      ]);
      const result = await service.getComparisonReport('2026-01-01', '2026-12-31', mockUser());
      expect(result.totalPagado).toBe(1030000);
      expect(result.totalParcial).toBe(405000);
    });

    it('retorna porcentajePagadoVsEsperado correcto', async () => {
      pagoRepo.find.mockResolvedValue([
        makePago(PagoEstado.PAGADO, 2000000, 2000000),
        makePago(PagoEstado.PENDIENTE, 2000000),
      ]);
      const result = await service.getComparisonReport('2025-01-01', '2025-06-30', mockUser());
      expect(result.porcentajePagadoVsEsperado).toBe(50);
    });

    it('retorna ceros si no hay pagos en el período', async () => {
      pagoRepo.find.mockResolvedValue([]);
      const result = await service.getComparisonReport('2025-01-01', '2025-03-31', mockUser());
      expect(result.totalEsperado).toBe(0);
      expect(result.porcentajePagadoVsEsperado).toBe(0);
    });

    it('incluye fechaInicio y fechaFin en la respuesta', async () => {
      pagoRepo.find.mockResolvedValue([]);
      const result = await service.getComparisonReport('2025-01-01', '2025-06-30', mockUser());
      expect(result.fechaInicio).toBe('2025-01-01');
      expect(result.fechaFin).toBe('2025-06-30');
    });
  });
});
