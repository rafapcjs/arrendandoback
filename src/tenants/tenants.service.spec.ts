import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { Contrato, ContratoEstado } from '../contratos/entities/contrato.entity';
import { Role } from '../common/enums/roles.enum';

const mockUser = (role = Role.INMOBILIARIA, inmobiliariaId = 'inm-1') => ({
  id: 'user-1', role, inmobiliariaId,
});
const mockAdmin = () => mockUser(Role.ADMIN, undefined);

const mockTenant = (o: Partial<Tenant> = {}): Tenant =>
  ({ id: 'tenant-1', cedula: '123', correo: 'a@b.com', isActive: true, inmobiliariaId: 'inm-1', ...o } as Tenant);

const repoMock = () => ({
  findOne: jest.fn(), find: jest.fn(), findAndCount: jest.fn(),
  create: jest.fn(), save: jest.fn(), update: jest.fn(), remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantRepo: jest.Mocked<Repository<Tenant>>;
  let contratoRepo: jest.Mocked<Repository<Contrato>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useFactory: repoMock },
        { provide: getRepositoryToken(Contrato), useFactory: repoMock },
      ],
    }).compile();
    service = module.get(TenantsService);
    tenantRepo = module.get(getRepositoryToken(Tenant));
    contratoRepo = module.get(getRepositoryToken(Contrato));
  });
  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = { cedula: '123', correo: 'a@b.com', nombres: 'Juan', apellidos: 'Perez', telefono: '3001', direccion: 'Calle 1', ciudad: 'Bogotá', contactoEmergencia: 'Maria' };

    it('crea un inquilino correctamente', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      tenantRepo.create.mockReturnValue(mockTenant());
      tenantRepo.save.mockResolvedValue(mockTenant());
      const result = await service.create(dto as any, mockUser());
      expect(tenantRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'tenant-1' });
    });

    it('lanza BadRequestException si no hay inmobiliariaId', async () => {
      await expect(service.create(dto as any, { id: 'u1', role: Role.INMOBILIARIA, inmobiliariaId: null }))
        .rejects.toThrow(BadRequestException);
    });

    it('lanza ConflictException si cédula duplicada', async () => {
      tenantRepo.findOne.mockResolvedValueOnce(mockTenant());
      await expect(service.create(dto as any, mockUser())).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException si correo duplicado', async () => {
      tenantRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockTenant());
      await expect(service.create(dto as any, mockUser())).rejects.toThrow(ConflictException);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('retorna lista paginada filtrada por inmobiliaria', async () => {
      tenantRepo.findAndCount.mockResolvedValue([[mockTenant()], 1]);
      const result = await service.findAll({ page: 1, limit: 10 }, mockUser());
      expect(result).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    });

    it('ADMIN ve todos los inquilinos', async () => {
      tenantRepo.findAndCount.mockResolvedValue([[mockTenant(), mockTenant({ id: 't2' })], 2]);
      const result = await service.findAll({ page: 1, limit: 10 }, mockAdmin());
      expect(result.total).toBe(2);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna el inquilino si existe', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant());
      const result = await service.findOne('tenant-1', mockUser());
      expect(result.id).toBe('tenant-1');
    });

    it('lanza NotFoundException si no existe', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x', mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('actualiza datos correctamente', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant());
      tenantRepo.update.mockResolvedValue(undefined as any);
      const result = await service.update('tenant-1', { nombres: 'Pedro' } as any, mockUser());
      expect(tenantRepo.update).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ nombres: 'Pedro' }));
      expect(result).toBeDefined();
    });

    it('lanza ConflictException si nueva cédula ya existe', async () => {
      tenantRepo.findOne
        .mockResolvedValueOnce(mockTenant())
        .mockResolvedValueOnce(mockTenant({ id: 'otro' }));
      await expect(service.update('tenant-1', { cedula: '999' } as any, mockUser()))
        .rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException si nuevo correo ya existe', async () => {
      tenantRepo.findOne
        .mockResolvedValueOnce(mockTenant())
        .mockResolvedValueOnce(mockTenant({ id: 'otro' }));
      await expect(service.update('tenant-1', { correo: 'x@y.com' } as any, mockUser()))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── activate ──────────────────────────────────────────────────────────────
  describe('activate', () => {
    it('activa un inquilino inactivo sin restricción', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant({ isActive: false }));
      await service.activate('tenant-1', true, mockUser());
      expect(tenantRepo.update).toHaveBeenCalledWith('tenant-1', { isActive: true });
    });

    it('lanza ConflictException al desactivar inquilino con contratos activos', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant({ isActive: true }));
      contratoRepo.find.mockResolvedValue([{ id: 'c1' } as any]);
      await expect(service.activate('tenant-1', false, mockUser())).rejects.toThrow(ConflictException);
    });

    it('desactiva inquilino sin contratos activos', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant({ isActive: true }));
      contratoRepo.find.mockResolvedValue([]);
      await service.activate('tenant-1', false, mockUser());
      expect(tenantRepo.update).toHaveBeenCalledWith('tenant-1', { isActive: false });
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('elimina el inquilino correctamente', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant());
      tenantRepo.remove.mockResolvedValue(mockTenant());
      await expect(service.remove('tenant-1', mockUser())).resolves.not.toThrow();
      expect(tenantRepo.remove).toHaveBeenCalled();
    });

    it('lanza NotFoundException si no existe', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('x', mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByCedula / findByEmail ────────────────────────────────────────────
  describe('findByCedula', () => {
    it('retorna inquilino por cédula', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant());
      const result = await service.findByCedula('123', mockUser());
      expect(result.cedula).toBe('123');
    });

    it('lanza NotFoundException si cédula no existe', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.findByCedula('000', mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('retorna inquilino por correo', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant());
      const result = await service.findByEmail('a@b.com', mockUser());
      expect(result.correo).toBe('a@b.com');
    });

    it('lanza NotFoundException si correo no existe', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.findByEmail('x@x.com', mockUser())).rejects.toThrow(NotFoundException);
    });
  });
});
