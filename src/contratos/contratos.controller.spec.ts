import { Test, TestingModule } from '@nestjs/testing';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { ContratoEstado } from './entities/contrato.entity';

const mockUser = { id: 'u1', role: 'INMOBILIARIA', inmobiliariaId: 'inm-1' };

const mockContrato = {
  id: 'c1',
  estado: ContratoEstado.ACTIVO,
  canonMensual: 1500000,
  documentos: [],
};

describe('ContratosController', () => {
  let controller: ContratosController;
  let service: jest.Mocked<ContratosService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContratosController],
      providers: [
        {
          provide: ContratosService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            finalizarContrato: jest.fn(),
            marcarComoVencido: jest.fn(),
            getActiveContracts: jest.fn(),
            getContractsExpiringSoon: jest.fn(),
            subirDocumento: jest.fn(),
            reemplazarDocumento: jest.fn(),
            streamDocumento: jest.fn(),
            eliminarDocumento: jest.fn(),
            findAllSimple: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ContratosController);
    service = module.get(ContratosService) as jest.Mocked<ContratosService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea un contrato y retorna el resultado', async () => {
      const dto: CreateContratoDto = {
        inquilinoId: 'tenant-1',
        inmuebleId: 'prop-1',
        fechaInicio: '2025-01-01',
        fechaFin: '2025-12-31',
        canonMensual: 1500000,
        estado: ContratoEstado.ACTIVO,
      };
      service.create.mockResolvedValue(mockContrato as any);
      const result = await controller.create(dto, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockContrato);
    });
  });

  describe('findAll', () => {
    it('retorna lista paginada de contratos', async () => {
      service.findAllSimple.mockResolvedValue({
        data: [mockContrato],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      } as any);
      const result = await controller.findAll('1', '10', undefined, mockUser);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('retorna un contrato por ID', async () => {
      service.findOne.mockResolvedValue(mockContrato as any);
      const result = await controller.findOne('c1');
      expect(service.findOne).toHaveBeenCalledWith('c1');
      expect(result).toEqual(mockContrato);
    });
  });

  describe('update', () => {
    it('actualiza un contrato', async () => {
      const dto: UpdateContratoDto = { estado: ContratoEstado.FINALIZADO };
      service.update.mockResolvedValue(mockContrato as any);
      const result = await controller.update('c1', dto);
      expect(service.update).toHaveBeenCalledWith('c1', dto);
    });
  });

  describe('remove', () => {
    it('elimina un contrato', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(controller.remove('c1')).resolves.not.toThrow();
      expect(service.remove).toHaveBeenCalledWith('c1');
    });
  });

  describe('finalizarContrato', () => {
    it('finaliza un contrato', async () => {
      service.finalizarContrato.mockResolvedValue(mockContrato as any);
      const result = await controller.finalizarContrato('c1');
      expect(service.finalizarContrato).toHaveBeenCalledWith('c1');
    });
  });

  describe('getActiveContracts', () => {
    it('retorna contratos activos', async () => {
      service.getActiveContracts.mockResolvedValue([mockContrato] as any);
      const result = await controller.getActiveContracts(mockUser);
      expect(service.getActiveContracts).toHaveBeenCalledWith(mockUser);
      expect(result).toHaveLength(1);
    });
  });

  describe('getContractsExpiringSoon', () => {
    it('retorna contratos próximos a vencer', async () => {
      service.getContractsExpiringSoon.mockResolvedValue([mockContrato] as any);
      const result = await controller.getContractsExpiringSoon(30, mockUser);
      expect(service.getContractsExpiringSoon).toHaveBeenCalledWith(30, mockUser);
    });
  });

  describe('subirDocumento', () => {
    it('sube un documento al contrato', async () => {
      const file = { originalname: 'doc.pdf', buffer: Buffer.from('test') } as any;
      service.subirDocumento.mockResolvedValue(mockContrato as any);
      const result = await controller.subirDocumento('c1', file, mockUser);
      expect(service.subirDocumento).toHaveBeenCalledWith('c1', file, mockUser);
    });
  });

  describe('eliminarDocumento', () => {
    it('elimina un documento del contrato', async () => {
      service.eliminarDocumento.mockResolvedValue(mockContrato as any);
      const result = await controller.eliminarDocumento('c1', 'doc-1', mockUser);
      expect(service.eliminarDocumento).toHaveBeenCalledWith('c1', 'doc-1', mockUser);
    });
  });
});
