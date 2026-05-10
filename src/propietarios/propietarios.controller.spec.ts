import { Test, TestingModule } from '@nestjs/testing';
import { PropietariosController } from './propietarios.controller';
import { PropietariosService } from './propietarios.service';

const mockUser = { id: 'u1', role: 'INMOBILIARIA', inmobiliariaId: 'inm-1' };
const mockPropietario = { id: 'pr1', nombre: 'Carlos', documento: 'CC-1', isActive: true };

describe('PropietariosController', () => {
  let controller: PropietariosController;
  let service: jest.Mocked<PropietariosService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropietariosController],
      providers: [
        {
          provide: PropietariosService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            activate: jest.fn(),
            remove: jest.fn(),
            findByInmobiliaria: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(PropietariosController);
    service = module.get(PropietariosService) as jest.Mocked<PropietariosService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea un propietario', async () => {
      const dto = { nombre: 'Carlos', documento: 'CC-1', telefono: '3001' };
      service.create.mockResolvedValue(mockPropietario as any);
      const result = await controller.create(dto as any, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
    });
  });

  describe('findAll', () => {
    it('retorna lista de propietarios', async () => {
      service.findAll.mockResolvedValue([mockPropietario] as any);
      const result = await controller.findAll(mockUser);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('retorna un propietario', async () => {
      service.findOne.mockResolvedValue(mockPropietario as any);
      const result = await controller.findOne('pr1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('pr1', mockUser);
    });
  });

  describe('update', () => {
    it('actualiza un propietario', async () => {
      service.update.mockResolvedValue(mockPropietario as any);
      const result = await controller.update('pr1', {}, mockUser);
      expect(service.update).toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('activa un propietario', async () => {
      service.activate.mockResolvedValue(mockPropietario as any);
      const result = await controller.activate('pr1', true, mockUser);
      expect(service.activate).toHaveBeenCalledWith('pr1', true, mockUser);
    });
  });

  describe('remove', () => {
    it('elimina un propietario', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(controller.remove('pr1', mockUser)).resolves.not.toThrow();
    });
  });
});
