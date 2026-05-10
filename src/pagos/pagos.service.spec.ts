import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PagosService } from './pagos.service';
import { Pago, PagoEstado } from './entities/pago.entity';
import { Contrato, ContratoEstado } from '../contratos/entities/contrato.entity';
import { Role } from '../common/enums/roles.enum';

const mockUser = (role = Role.INMOBILIARIA, inmobiliariaId = 'inm-1') => ({ id: 'user-1', role, inmobiliariaId });

const mockContrato = (o: Partial<Contrato> = {}): Contrato =>
  ({ id: 'contrato-1', canonMensual: 1500000, inmobiliariaId: 'inm-1', fechaInicio: new Date('2025-01-01'), ...o } as Contrato);

const mockPago = (o: Partial<Pago> = {}): Pago =>
  ({
    id: 'pago-1', contratoId: 'contrato-1', inmobiliariaId: 'inm-1',
    montoTotal: 1500000, montoAbonado: 0, estado: PagoEstado.PENDIENTE,
    fechaPagoEsperada: new Date(), fechaPagoReal: null, ...o,
  } as Pago);

const repoMock = () => ({
  findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(),
  update: jest.fn(), remove: jest.fn(), delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('PagosService', () => {
  let service: PagosService;
  let pagoRepo: jest.Mocked<Repository<Pago>>;
  let contratoRepo: jest.Mocked<Repository<Contrato>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: getRepositoryToken(Pago), useFactory: repoMock },
        { provide: getRepositoryToken(Contrato), useFactory: repoMock },
      ],
    }).compile();
    service = module.get(PagosService);
    pagoRepo = module.get(getRepositoryToken(Pago));
    contratoRepo = module.get(getRepositoryToken(Contrato));
  });
  afterEach(() => jest.clearAllMocks());

  // ── crearPago ────────────────────────────────────────────────────────────
  describe('crearPago', () => {
    it('crea un pago correctamente usando el canon del contrato', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato());
      pagoRepo.create.mockReturnValue(mockPago());
      pagoRepo.save.mockResolvedValue(mockPago());
      const result = await service.crearPago({ contratoId: 'contrato-1', fechaPagoEsperada: new Date() as any } as any, mockUser());
      expect(pagoRepo.save).toHaveBeenCalled();
      expect(result.estado).toBe(PagoEstado.PENDIENTE);
    });

    it('lanza NotFoundException si contrato no existe', async () => {
      contratoRepo.findOne.mockResolvedValue(null);
      await expect(service.crearPago({ contratoId: 'x' } as any, mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  // ── crearPagosMensuales ──────────────────────────────────────────────────
  describe('crearPagosMensuales', () => {
    it('genera pagos mensuales para los meses indicados', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato());
      pagoRepo.findOne.mockResolvedValue(null);
      pagoRepo.create.mockReturnValue(mockPago());
      pagoRepo.save.mockResolvedValue(mockPago());
      const result = await service.crearPagosMensuales('contrato-1', 3);
      expect(pagoRepo.save).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    it('omite meses que ya tienen pago registrado', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato());
      pagoRepo.findOne.mockResolvedValue(mockPago());
      const result = await service.crearPagosMensuales('contrato-1', 2);
      expect(pagoRepo.save).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('lanza NotFoundException si contrato no existe', async () => {
      contratoRepo.findOne.mockResolvedValue(null);
      await expect(service.crearPagosMensuales('x', 3)).rejects.toThrow(NotFoundException);
    });
  });

  // ── registrarAbono ───────────────────────────────────────────────────────
  describe('registrarAbono', () => {
    it('registra abono parcial y cambia estado a PARCIAL', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ montoTotal: 1500000, montoAbonado: 0 }));
      pagoRepo.save.mockImplementation(async (p: any) => p);
      const result = await service.registrarAbono('pago-1', { monto: 500000 } as any, mockUser());
      expect(result.estado).toBe(PagoEstado.PARCIAL);
      expect(result.montoAbonado).toBe(500000);
    });

    it('registra abono completo y cambia estado a PAGADO', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ montoTotal: 1500000, montoAbonado: 0 }));
      pagoRepo.save.mockImplementation(async (p: any) => p);
      const result = await service.registrarAbono('pago-1', { monto: 1500000 } as any, mockUser());
      expect(result.estado).toBe(PagoEstado.PAGADO);
    });

    it('lanza BadRequestException si abono excede el monto total', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ montoTotal: 1000000, montoAbonado: 0 }));
      await expect(service.registrarAbono('pago-1', { monto: 2000000 } as any, mockUser()))
        .rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si pago ya está PAGADO', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ estado: PagoEstado.PAGADO }));
      await expect(service.registrarAbono('pago-1', { monto: 100 } as any, mockUser()))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── verificarPagosVencidos ───────────────────────────────────────────────
  describe('verificarPagosVencidos', () => {
    it('marca como vencidos los pagos que superaron el plazo de gracia', async () => {
      const pagos = [mockPago({ estado: PagoEstado.PENDIENTE }), mockPago({ id: 'p2', estado: PagoEstado.PARCIAL })];
      pagoRepo.find.mockResolvedValue(pagos);
      pagoRepo.save.mockImplementation(async (p: any) => p);
      const result = await service.verificarPagosVencidos();
      expect(result.vencidos).toBe(2);
      expect(result.procesados).toBe(2);
    });

    it('retorna 0 si no hay pagos vencidos', async () => {
      pagoRepo.find.mockResolvedValue([]);
      const result = await service.verificarPagosVencidos();
      expect(result.vencidos).toBe(0);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('retorna todos los pagos filtrados por inmobiliaria', async () => {
      pagoRepo.find.mockResolvedValue([mockPago()]);
      const result = await service.findAll(mockUser());
      expect(result).toHaveLength(1);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna el pago si existe', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago());
      const result = await service.findOne('pago-1', mockUser());
      expect(result.id).toBe('pago-1');
    });

    it('lanza NotFoundException si no existe', async () => {
      pagoRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x', mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('actualiza pago PENDIENTE correctamente', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago());
      pagoRepo.save.mockResolvedValue(mockPago({ montoTotal: 2000000 }));
      const result = await service.update('pago-1', { montoTotal: 2000000 } as any, mockUser());
      expect(result.montoTotal).toBe(2000000);
    });

    it('lanza BadRequestException si intenta modificar pago PAGADO', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ estado: PagoEstado.PAGADO }));
      await expect(service.update('pago-1', {} as any, mockUser())).rejects.toThrow(BadRequestException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('elimina pago PENDIENTE', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ estado: PagoEstado.PENDIENTE }));
      pagoRepo.remove.mockResolvedValue(mockPago());
      await expect(service.remove('pago-1')).resolves.not.toThrow();
    });

    it('lanza BadRequestException al eliminar pago PAGADO', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ estado: PagoEstado.PAGADO }));
      await expect(service.remove('pago-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException al eliminar pago VENCIDO', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ estado: PagoEstado.VENCIDO }));
      await expect(service.remove('pago-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── removePendingByContrato ───────────────────────────────────────────────
  describe('removePendingByContrato', () => {
    it('elimina los pagos pendientes de un contrato', async () => {
      pagoRepo.find.mockResolvedValue([mockPago({ id: 'p1' }), mockPago({ id: 'p2' })]);
      pagoRepo.delete.mockResolvedValue({ affected: 2 } as any);
      const result = await service.removePendingByContrato('contrato-1');
      expect(result).toBe(2);
    });

    it('retorna 0 si no hay pagos pendientes', async () => {
      pagoRepo.find.mockResolvedValue([]);
      const result = await service.removePendingByContrato('contrato-1');
      expect(result).toBe(0);
    });
  });

  // ── findByContrato ───────────────────────────────────────────────────────
  describe('findByContrato', () => {
    it('retorna pagos de un contrato', async () => {
      pagoRepo.find.mockResolvedValue([mockPago(), mockPago({ id: 'p2' })]);
      const result = await service.findByContrato('contrato-1', mockUser());
      expect(result).toHaveLength(2);
    });
  });

  // ── findByEstado ─────────────────────────────────────────────────────────
  describe('findByEstado', () => {
    it('retorna pagos filtrados por estado', async () => {
      pagoRepo.find.mockResolvedValue([mockPago({ estado: PagoEstado.VENCIDO })]);
      const result = await service.findByEstado(PagoEstado.VENCIDO, mockUser());
      expect(result[0].estado).toBe(PagoEstado.VENCIDO);
    });
  });
});
