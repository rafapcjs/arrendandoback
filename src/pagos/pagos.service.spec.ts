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
    montoTotal: 1500000, montoAbonado: 0, moraAbonada: 0,
    estado: PagoEstado.PENDIENTE,
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

    it('devuelve los campos calculados (saldo, mora, totalAPagar) tras crear', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato());
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 30); // cuota no vencida
      const pagoMock = mockPago({ montoTotal: 1_500_000, montoAbonado: 0, fechaPagoEsperada: futuro });
      pagoRepo.create.mockReturnValue(pagoMock);
      pagoRepo.save.mockResolvedValue(pagoMock);

      const result = await service.crearPago(
        { contratoId: 'contrato-1', fechaPagoEsperada: futuro as any } as any,
        mockUser(),
      );

      expect(result.saldoPendiente).toBe(1_500_000);
      expect(result.diasRetraso).toBe(0);
      expect(result.mora).toBe(0);
      expect(result.totalAPagar).toBe(1_500_000);
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

    it('recalcula saldo, mora y total tras un abono parcial sobre una cuota vencida', async () => {
      // Cuota vencida hace 10 días, monto 1.000.000, sin abonos previos.
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 10);
      pagoRepo.findOne.mockResolvedValue(
        mockPago({ montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: fechaVencida }),
      );
      pagoRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.registrarAbono('pago-1', { monto: 400_000 } as any, mockUser());

      // saldo = 1.000.000 − 400.000 = 600.000
      expect(result.saldoPendiente).toBe(600_000);
      expect(result.diasRetraso).toBe(10);
      // mora = 600.000 × 1% × 10 = 60.000
      expect(result.mora).toBe(60_000);
      expect(result.totalAPagar).toBe(660_000);
      expect(result.estado).toBe(PagoEstado.PARCIAL);
    });

    it('queda PAGADO si paga capital de una cuota NO vencida (mora = 0)', async () => {
      // Cuota futura → mora = 0, basta con pagar el capital
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 5);
      pagoRepo.findOne.mockResolvedValue(
        mockPago({ montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: futuro }),
      );
      pagoRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.registrarAbono('pago-1', { monto: 1_000_000 } as any, mockUser());

      expect(result.estado).toBe(PagoEstado.PAGADO);
      expect(result.saldoPendiente).toBe(0);
      expect(result.mora).toBe(0);
    });

    it('queda PARCIAL si paga el capital pero todavía debe mora', async () => {
      // Cuota vencida 5 días → mora generada = 50.000
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 5);
      pagoRepo.findOne.mockResolvedValue(
        mockPago({ montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: fechaVencida }),
      );
      pagoRepo.save.mockImplementation(async (p: any) => p);

      // Solo paga el capital, no la mora
      const result = await service.registrarAbono('pago-1', { monto: 1_000_000 } as any, mockUser());

      expect(result.estado).toBe(PagoEstado.PARCIAL);
      expect(result.montoAbonado).toBe(1_000_000);
      expect(result.moraAbonada).toBe(0);
      // saldo capital ahora es 0 → moraGenerada nueva también es 0 → mora pendiente 0
      // (importante: una vez saldado el capital ya no se genera más mora)
      expect(result.saldoPendiente).toBe(0);
    });

    it('PAGADO cuando paga capital + mora en un solo abono (totalAPagar)', async () => {
      // Cuota vencida 5 días → totalAPagar = 1.000.000 + 50.000 = 1.050.000
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 5);
      pagoRepo.findOne.mockResolvedValue(
        mockPago({ montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: fechaVencida }),
      );
      pagoRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.registrarAbono('pago-1', { monto: 1_050_000 } as any, mockUser());

      expect(result.estado).toBe(PagoEstado.PAGADO);
      expect(result.montoAbonado).toBe(1_000_000);
      expect(result.moraAbonada).toBe(50_000);
      expect(result.fechaPagoReal).toBeTruthy();
    });

    it('distribuye correctamente cuando el abono cubre todo el capital y parte de la mora', async () => {
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 10);
      // saldo 1.000.000, mora generada = 100.000 → totalAPagar 1.100.000
      pagoRepo.findOne.mockResolvedValue(
        mockPago({ montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: fechaVencida }),
      );
      pagoRepo.save.mockImplementation(async (p: any) => p);

      // Paga 1.050.000 → 1M capital + 50k de mora
      const result = await service.registrarAbono('pago-1', { monto: 1_050_000 } as any, mockUser());

      expect(result.montoAbonado).toBe(1_000_000);
      expect(result.moraAbonada).toBe(50_000);
      expect(result.estado).toBe(PagoEstado.PARCIAL); // aún faltan 50k de mora
    });

    it('acepta hasta +1 peso de tolerancia (redondeo COP)', async () => {
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 5);
      pagoRepo.findOne.mockResolvedValue(
        mockPago({ montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: fechaVencida }),
      );
      pagoRepo.save.mockImplementation(async (p: any) => p);

      // totalAPagar = 1.050.000, paga 1.050.001 → debe aceptarse
      const result = await service.registrarAbono('pago-1', { monto: 1_050_001 } as any, mockUser());

      expect(result.estado).toBe(PagoEstado.PAGADO);
    });

    it('rechaza monto que excede totalAPagar más allá de la tolerancia', async () => {
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 5);
      pagoRepo.findOne.mockResolvedValue(
        mockPago({ montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: fechaVencida }),
      );

      // totalAPagar = 1.050.000, paga 2.000.000 → 400 BadRequest
      await expect(
        service.registrarAbono('pago-1', { monto: 2_000_000 } as any, mockUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza monto cero o negativo', async () => {
      pagoRepo.findOne.mockResolvedValue(mockPago({ montoTotal: 1_000_000, montoAbonado: 0 }));
      await expect(
        service.registrarAbono('pago-1', { monto: 0 } as any, mockUser()),
      ).rejects.toThrow(BadRequestException);
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

    it('recalcula los campos derivados tras actualizar el monto total', async () => {
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 3);
      pagoRepo.findOne.mockResolvedValue(
        mockPago({ montoTotal: 1_000_000, montoAbonado: 0, fechaPagoEsperada: fechaVencida }),
      );
      pagoRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.update(
        'pago-1',
        { montoTotal: 2_000_000 } as any,
        mockUser(),
      );

      expect(result.saldoPendiente).toBe(2_000_000);
      expect(result.diasRetraso).toBe(3);
      // mora = 2.000.000 × 1% × 3 = 60.000
      expect(result.mora).toBe(60_000);
      expect(result.totalAPagar).toBe(2_060_000);
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

  // ── verificarDeudaPorCedula ──────────────────────────────────────────────
  describe('verificarDeudaPorCedula', () => {
    /**
     * Helper para construir un pago con su contrato/inquilino/inmueble enlazados,
     * tal y como vendría del query builder con leftJoinAndSelect.
     */
    const pagoConRelaciones = (o: Partial<Pago> = {}): Pago =>
      ({
        ...mockPago(o),
        contrato: {
          id: 'contrato-1',
          canonMensual: 1_000_000,
          estado: 'ACTIVO',
          fechaInicio: new Date('2025-01-01'),
          fechaFin: new Date('2026-12-31'),
          inquilino: {
            id: 'inq-1',
            cedula: '12345',
            nombres: 'Juan',
            apellidos: 'Pérez',
            correo: 'juan@example.com',
            telefono: '3000000000',
            ciudad: 'Bogotá',
          },
          inmueble: {
            direccion: 'Calle 1',
            descripcion: 'Apto 101',
          },
        },
      }) as Pago;

    const mockQueryBuilder = (pagos: Pago[]) => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(pagos),
    });

    it('lanza NotFoundException si no hay pagos para esa cédula', async () => {
      pagoRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder([]) as any);
      await expect(service.verificarDeudaPorCedula('99999')).rejects.toThrow(NotFoundException);
    });

    it('retorna alDia=true cuando todos los pagos están pagados', async () => {
      const pago = pagoConRelaciones({
        estado: PagoEstado.PAGADO,
        montoAbonado: 1_000_000,
        fechaPagoReal: new Date('2026-05-10'),
      });
      // @AfterLoad ya corrió en la carga real; en tests forzamos los campos calculados
      pago.saldoPendiente = 0;
      pago.mora = 0;
      pago.totalAPagar = 0;
      pago.diasRetraso = 0;

      pagoRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder([pago]) as any);

      const result = await service.verificarDeudaPorCedula('12345');

      expect(result.deuda.alDia).toBe(true);
      expect(result.deuda.totalMeses).toBe(0);
      expect(result.deuda.totalAPagar).toBe(0);
      expect(result.deuda.totalMora).toBe(0);
      expect(result.resumen.nivel).toBe('AL_DIA');
    });

    it('agrega saldo, mora y total a pagar de varias cuotas adeudadas', async () => {
      // Cuota vencida con mora ya calculada
      const vencida = pagoConRelaciones({
        id: 'p1',
        estado: PagoEstado.VENCIDO,
        montoTotal: 1_000_000,
        montoAbonado: 0,
      });
      vencida.saldoPendiente = 1_000_000;
      vencida.mora = 60_000;
      vencida.totalAPagar = 1_060_000;
      vencida.diasRetraso = 6;

      // Cuota pendiente sin mora
      const pendiente = pagoConRelaciones({
        id: 'p2',
        estado: PagoEstado.PENDIENTE,
        montoTotal: 1_000_000,
        montoAbonado: 0,
      });
      pendiente.saldoPendiente = 1_000_000;
      pendiente.mora = 0;
      pendiente.totalAPagar = 1_000_000;
      pendiente.diasRetraso = 0;

      // Cuota parcial con mora
      const parcial = pagoConRelaciones({
        id: 'p3',
        estado: PagoEstado.PARCIAL,
        montoTotal: 1_000_000,
        montoAbonado: 400_000,
      });
      parcial.saldoPendiente = 600_000;
      parcial.mora = 30_000;
      parcial.totalAPagar = 630_000;
      parcial.diasRetraso = 5;

      pagoRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder([vencida, pendiente, parcial]) as any,
      );

      const result = await service.verificarDeudaPorCedula('12345');

      // Totales globales
      expect(result.deuda.alDia).toBe(false);
      expect(result.deuda.totalMeses).toBe(3);
      expect(result.deuda.totalSaldoCapital).toBe(2_600_000); // 1M + 1M + 600k
      expect(result.deuda.totalMora).toBe(90_000);            // 60k + 0 + 30k
      expect(result.deuda.totalAPagar).toBe(2_690_000);       // 1.06M + 1M + 630k

      // Desglose por estado
      expect(result.deuda.desglose.vencidos.meses).toBe(1);
      expect(result.deuda.desglose.vencidos.mora).toBe(60_000);
      expect(result.deuda.desglose.pendientes.meses).toBe(1);
      expect(result.deuda.desglose.pendientes.mora).toBe(0);
      expect(result.deuda.desglose.parciales.meses).toBe(1);
      expect(result.deuda.desglose.parciales.mora).toBe(30_000);

      // Detalle de cuotas
      expect(result.deuda.cuotas).toHaveLength(3);
      expect(result.deuda.cuotas[0]).toMatchObject({
        saldoPendiente: expect.any(Number),
        mora: expect.any(Number),
        totalAPagar: expect.any(Number),
        diasRetraso: expect.any(Number),
      });

      // Como hay al menos un VENCIDO, el nivel es MOROSO
      expect(result.resumen.nivel).toBe('MOROSO');
    });

    it('marca PENDIENTE (no MOROSO) cuando solo hay cuotas parciales o pendientes', async () => {
      const pendiente = pagoConRelaciones({
        id: 'p1',
        estado: PagoEstado.PENDIENTE,
        montoTotal: 1_000_000,
        montoAbonado: 0,
      });
      pendiente.saldoPendiente = 1_000_000;
      pendiente.mora = 0;
      pendiente.totalAPagar = 1_000_000;
      pendiente.diasRetraso = 0;

      pagoRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder([pendiente]) as any);

      const result = await service.verificarDeudaPorCedula('12345');

      expect(result.deuda.totalMeses).toBe(1);
      expect(result.resumen.nivel).toBe('PENDIENTE');
    });
  });
});
