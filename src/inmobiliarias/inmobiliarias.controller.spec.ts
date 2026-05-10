import { Test, TestingModule } from '@nestjs/testing';
import { InmobiliariasController } from './inmobiliarias.controller';
import { InmobiliariasService } from './inmobiliarias.service';
import { InmobiliariaEstado } from './entities/inmobiliaria.entity';

const mockUser = { id: 'u1', role: 'ADMIN' };
const mockInmobiliaria = { id: 'inm1', nit: '123456', nombre: 'Test SA', estado: InmobiliariaEstado.ACTIVA };

describe('InmobiliariasController', () => {
  let controller: InmobiliariasController;
  let service: jest.Mocked<InmobiliariasService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InmobiliariasController],
      providers: [
        {
          provide: InmobiliariasService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findDisponibles: jest.fn(),
            findOne: jest.fn(),
            findOneForUser: jest.fn(),
            update: jest.fn(),
            toggleEstado: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(InmobiliariasController);
    service = module.get(InmobiliariasService) as jest.Mocked<InmobiliariasService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea una inmobiliaria', async () => {
      const dto = { nit: '123456', email: 'inmo@test.com', nombre: 'Test SA', telefono: '3001', direccion: 'Calle 1', ciudad: 'Bogotá' };
      service.create.mockResolvedValue(mockInmobiliaria as any);
      const result = await controller.create(dto as any, { id: 'user-1' });
      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('findAll', () => {
    it('retorna todas las inmobiliarias', async () => {
      service.findAll.mockResolvedValue([mockInmobiliaria] as any);
      const result = await controller.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findDisponibles', () => {
    it('retorna inmobiliarias disponibles', async () => {
      service.findDisponibles.mockResolvedValue([mockInmobiliaria] as any);
      const result = await controller.findDisponibles();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('retorna una inmobiliaria', async () => {
      service.findOneForUser.mockResolvedValue(mockInmobiliaria as any);
      const result = await controller.findOne('inm1', mockUser);
      expect(service.findOneForUser).toHaveBeenCalledWith('inm1', mockUser);
    });
  });

  describe('update', () => {
    it('actualiza una inmobiliaria', async () => {
      service.update.mockResolvedValue(mockInmobiliaria as any);
      const result = await controller.update('inm1', {});
      expect(service.update).toHaveBeenCalled();
    });
  });

  describe('toggleEstado', () => {
    it('alterna el estado de la inmobiliaria', async () => {
      service.toggleEstado.mockResolvedValue(mockInmobiliaria as any);
      const result = await controller.toggleEstado('inm1');
      expect(service.toggleEstado).toHaveBeenCalledWith('inm1');
    });
  });
});
