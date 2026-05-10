import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

const mockUser = { id: 'u1', role: 'INMOBILIARIA', inmobiliariaId: 'inm-1' };

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: jest.Mocked<ReportsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            getMonthlyIncomeReport: jest.fn(),
            getAnnualIncomeReport: jest.fn(),
            getComparisonReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ReportsController);
    service = module.get(ReportsService) as jest.Mocked<ReportsService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('getMonthlyIncomeReport', () => {
    it('retorna reporte de ingresos mensual', async () => {
      const mockReport = {
        year: 2025,
        month: 1,
        totalEsperado: 1500000,
        totalPagado: 1500000,
        totalPendiente: 0,
        porcentajePagado: 100,
        numeroPagosEsperados: 1,
        numeroPagosCompletados: 1,
      };
      service.getMonthlyIncomeReport.mockResolvedValue(mockReport as any);
      const result = await controller.getMonthlyIncomeReport(2025, 1, mockUser);
      expect(service.getMonthlyIncomeReport).toHaveBeenCalledWith(2025, 1, mockUser);
      expect(result.porcentajePagado).toBe(100);
    });
  });

  describe('getAnnualIncomeReport', () => {
    it('retorna reporte de ingresos anual', async () => {
      const mockReport = {
        year: 2025,
        totalEsperado: 18000000,
        totalPagado: 18000000,
        totalPendiente: 0,
        porcentajePagado: 100,
        reporteMensual: [],
      };
      service.getAnnualIncomeReport.mockResolvedValue(mockReport as any);
      const result = await controller.getAnnualIncomeReport(2025, mockUser);
      expect(service.getAnnualIncomeReport).toHaveBeenCalledWith(2025, mockUser);
      expect(result.reporteMensual).toHaveLength(0);
    });
  });

  describe('getComparisonReport', () => {
    it('retorna reporte comparativo', async () => {
      const mockReport = {
        fechaInicio: '2025-01-01',
        fechaFin: '2025-12-31',
        totalEsperado: 18000000,
        totalPagado: 18000000,
        totalParcial: 0,
        totalPendiente: 0,
        totalVencido: 0,
        porcentajePagadoVsEsperado: 100,
        distribucionPorEstado: {},
      };
      service.getComparisonReport.mockResolvedValue(mockReport as any);
      const result = await controller.getComparisonReport('2025-01-01', '2025-12-31', mockUser);
      expect(service.getComparisonReport).toHaveBeenCalledWith('2025-01-01', '2025-12-31', mockUser);
      expect(result.porcentajePagadoVsEsperado).toBe(100);
    });
  });
});
