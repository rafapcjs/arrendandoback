import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const mockUser = { id: 'u1', role: 'INMOBILIARIA', inmobiliariaId: 'inm-1' };
const mockTenant = { id: 't1', cedula: '123', nombres: 'Juan', apellidos: 'Perez', correo: 'j@p.com', isActive: true };

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: jest.Mocked<TenantsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            search: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            activate: jest.fn(),
            remove: jest.fn(),
            findByCedula: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(TenantsController);
    service = module.get(TenantsService) as jest.Mocked<TenantsService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('crea un inquilino', async () => {
      const dto: CreateTenantDto = {
        cedula: '123',
        nombres: 'Juan',
        apellidos: 'Perez',
        telefono: '3001',
        correo: 'j@p.com',
        direccion: 'Calle 1',
        ciudad: 'Bogotá',
        contactoEmergencia: 'Maria',
      };
      service.create.mockResolvedValue(mockTenant as any);
      const result = await controller.create(dto, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockTenant);
    });
  });

  describe('findAll', () => {
    it('retorna lista paginada de inquilinos', async () => {
      service.findAll.mockResolvedValue({
        data: [mockTenant],
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
    it('busca inquilinos con filtros', async () => {
      service.search.mockResolvedValue({
        data: [mockTenant],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      } as any);
      const result = await controller.search({ search: 'Juan', page: 1, limit: 10 }, mockUser);
      expect(service.search).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('retorna un inquilino por ID', async () => {
      service.findOne.mockResolvedValue(mockTenant as any);
      const result = await controller.findOne('t1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('t1', mockUser);
    });
  });

  describe('update', () => {
    it('actualiza un inquilino', async () => {
      const dto: UpdateTenantDto = { telefono: '3002' };
      service.update.mockResolvedValue(mockTenant as any);
      const result = await controller.update('t1', dto, mockUser);
      expect(service.update).toHaveBeenCalledWith('t1', dto, mockUser);
    });
  });

  describe('activate', () => {
    it('activa un inquilino', async () => {
      service.activate.mockResolvedValue(mockTenant as any);
      const result = await controller.activate('t1', { isActive: true }, mockUser);
      expect(service.activate).toHaveBeenCalledWith('t1', true, mockUser);
    });
  });

  describe('remove', () => {
    it('elimina un inquilino', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(controller.remove('t1', mockUser)).resolves.not.toThrow();
      expect(service.remove).toHaveBeenCalledWith('t1', mockUser);
    });
  });
});
