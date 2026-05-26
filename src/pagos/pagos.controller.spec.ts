import { Test, TestingModule } from '@nestjs/testing';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { PagoEstado } from './entities/pago.entity';

const mockUser = { id: 'u1', role: 'INMOBILIARIA', inmobiliariaId: 'inm-1' };
const mockPago = { id: 'pg1', montoTotal: 1500000, montoAbonado: 0, estado: PagoEstado.PENDIENTE };

describe('PagosController', () => {
  let controller: PagosController;
  let service: jest.Mocked<PagosService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagosController],
      providers: [
        {
          provide: PagosService,
          useValue: {
            crearPago: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByEstado: jest.fn(),
            findByContrato: jest.fn(),
            registrarAbono: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            verificarPagosVencidos: jest.fn(),
            buscar: jest.fn(),
            obtenerEstadisticasPagos: jest.fn(),
            verificarDeudaPorCedula: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(PagosController);
    service = module.get(PagosService) as jest.Mocked<PagosService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea un pago', async () => {
      const dto = { contratoId: 'c1', montoTotal: 1500000, fechaPagoEsperada: new Date() };
      service.crearPago.mockResolvedValue(mockPago as any);
      const result = await controller.create(dto as any, mockUser);
      expect(service.crearPago).toHaveBeenCalledWith(dto, mockUser);
    });
  });

  describe('findAll', () => {
    it('retorna todos los pagos', async () => {
      service.findAll.mockResolvedValue([mockPago] as any);
      const result = await controller.findAll(undefined, mockUser);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('retorna un pago', async () => {
      service.findOne.mockResolvedValue(mockPago as any);
      const result = await controller.findOne('pg1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('pg1', mockUser);
    });
  });

  describe('findByContrato', () => {
    it('retorna pagos de un contrato', async () => {
      service.findByContrato.mockResolvedValue([mockPago] as any);
      const result = await controller.findByContrato('c1', mockUser);
      expect(service.findByContrato).toHaveBeenCalledWith('c1', mockUser);
    });
  });

  describe('findByEstado', () => {
    it('retorna pagos por estado', async () => {
      service.findByEstado.mockResolvedValue([mockPago] as any);
      const result = await controller.findByEstado(PagoEstado.PENDIENTE, mockUser);
      expect(service.findByEstado).toHaveBeenCalledWith(PagoEstado.PENDIENTE, mockUser);
    });
  });

  describe('registrarAbono', () => {
    it('registra un abono', async () => {
      const dto = { monto: 500000 };
      service.registrarAbono.mockResolvedValue(mockPago as any);
      const result = await controller.registrarAbono('pg1', dto as any, mockUser);
      expect(service.registrarAbono).toHaveBeenCalledWith('pg1', dto, mockUser);
    });
  });

  describe('update', () => {
    it('actualiza un pago', async () => {
      service.update.mockResolvedValue(mockPago as any);
      const result = await controller.update('pg1', {}, mockUser);
      expect(service.update).toHaveBeenCalled();
    });
  });

  describe('consultarDeudaInquilino', () => {
    it('retorna la deuda total del inquilino consultado por cédula', async () => {
      const mockDeuda = {
        inquilino: { cedula: '12345' },
        contratos: [],
        deuda: { totalMeses: 3, totalAPagar: 4_500_000, totalMora: 100_000 },
        resumen: { nivel: 'MOROSO' },
      };
      service.verificarDeudaPorCedula.mockResolvedValue(mockDeuda as any);

      const result = await controller.consultarDeudaInquilino('12345');

      expect(service.verificarDeudaPorCedula).toHaveBeenCalledWith('12345');
      expect(result).toEqual(mockDeuda);
    });
  });

});
