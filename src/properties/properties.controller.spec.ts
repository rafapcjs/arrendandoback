import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

const mockUser = { id: 'u1', role: 'INMOBILIARIA', inmobiliariaId: 'inm-1' };
const mockProperty = { id: 'p1', direccion: 'Calle 1', disponible: true, fotoUrl: null };

describe('PropertiesController', () => {
  let controller: PropertiesController;
  let service: jest.Mocked<PropertiesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        {
          provide: PropertiesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            search: jest.fn(),
            findOne: jest.fn(),
            findByAddress: jest.fn(),
            update: jest.fn(),
            activate: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(PropertiesController);
    service = module.get(PropertiesService) as jest.Mocked<PropertiesService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea un inmueble', async () => {
      const dto = { direccion: 'Calle 1', codigoServicioAgua: 'A1', codigoServicioGas: 'G1', codigoServicioLuz: 'L1' };
      service.create.mockResolvedValue(mockProperty as any);
      const result = await controller.create(undefined, dto as any, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser, undefined);
    });
  });

  describe('findAll', () => {
    it('retorna lista de inmuebles', async () => {
      service.findAll.mockResolvedValue({
        data: [mockProperty],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      } as any);
      const result = await controller.findAll({ page: 1, limit: 10 }, mockUser);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('busca inmuebles', async () => {
      service.search.mockResolvedValue({
        data: [mockProperty],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      } as any);
      const result = await controller.search({ search: 'Calle', page: 1, limit: 10 }, mockUser);
      expect(service.search).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('retorna un inmueble', async () => {
      service.findOne.mockResolvedValue(mockProperty as any);
      const result = await controller.findOne('p1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('p1', mockUser);
    });
  });

  describe('update', () => {
    it('actualiza un inmueble', async () => {
      service.update.mockResolvedValue(mockProperty as any);
      const result = await controller.update('p1', undefined, {} as any, mockUser);
      expect(service.update).toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('cambia disponibilidad del inmueble', async () => {
      service.activate.mockResolvedValue(mockProperty as any);
      const result = await controller.activate('p1', { disponible: false }, mockUser);
      expect(service.activate).toHaveBeenCalledWith('p1', false, mockUser);
    });
  });

  describe('remove', () => {
    it('elimina un inmueble', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(controller.remove('p1', mockUser)).resolves.not.toThrow();
    });
  });
});
