import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PropietariosService } from './propietarios.service';
import { Propietario } from './entities/propietario.entity';
import { Role } from '../common/enums/roles.enum';

const mockUser = (role = Role.INMOBILIARIA, inmobiliariaId = 'inm-1') => ({ id: 'user-1', role, inmobiliariaId });
const mockAdmin = () => mockUser(Role.ADMIN, undefined);

const mockPropietario = (o: Partial<Propietario> = {}): Propietario =>
  ({ id: 'prop-1', nombre: 'Carlos', documento: 'CC-1', inmobiliariaId: 'inm-1', isActive: true, ...o } as Propietario);

const repoMock = () => ({
  findOne: jest.fn(), find: jest.fn(), create: jest.fn(),
  save: jest.fn(), update: jest.fn(), remove: jest.fn(),
});

describe('PropietariosService', () => {
  let service: PropietariosService;
  let repo: jest.Mocked<Repository<Propietario>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropietariosService,
        { provide: getRepositoryToken(Propietario), useFactory: repoMock },
      ],
    }).compile();
    service = module.get(PropietariosService);
    repo = module.get(getRepositoryToken(Propietario));
  });
  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = { nombre: 'Carlos', documento: 'CC-1', telefono: '3001' };

    it('crea propietario correctamente', async () => {
      repo.create.mockReturnValue(mockPropietario());
      repo.save.mockResolvedValue(mockPropietario());
      const result = await service.create(dto as any, mockUser());
      expect(repo.save).toHaveBeenCalled();
      expect(result.id).toBe('prop-1');
    });

    it('lanza BadRequestException si no hay inmobiliariaId', async () => {
      await expect(service.create(dto as any, { id: 'u1', role: Role.INMOBILIARIA, inmobiliariaId: null }))
        .rejects.toThrow(BadRequestException);
    });

    it('ADMIN puede especificar inmobiliariaId en el dto', async () => {
      const adminDto = { ...dto, inmobiliariaId: 'inm-2' };
      repo.create.mockReturnValue(mockPropietario({ inmobiliariaId: 'inm-2' }));
      repo.save.mockResolvedValue(mockPropietario({ inmobiliariaId: 'inm-2' }));
      const result = await service.create(adminDto as any, mockAdmin());
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ inmobiliariaId: 'inm-2' }));
      expect(result).toBeDefined();
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('INMOBILIARIA solo ve sus propietarios', async () => {
      repo.find.mockResolvedValue([mockPropietario()]);
      const result = await service.findAll(mockUser());
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { inmobiliariaId: 'inm-1' },
      }));
      expect(result).toHaveLength(1);
    });

    it('ADMIN ve todos los propietarios', async () => {
      repo.find.mockResolvedValue([mockPropietario(), mockPropietario({ id: 'p2' })]);
      const result = await service.findAll(mockAdmin());
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result).toHaveLength(2);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna propietario si existe y pertenece a la inmobiliaria', async () => {
      repo.findOne.mockResolvedValue(mockPropietario());
      const result = await service.findOne('prop-1', mockUser());
      expect(result.id).toBe('prop-1');
    });

    it('lanza NotFoundException si no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x', mockUser())).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si pertenece a otra inmobiliaria', async () => {
      repo.findOne.mockResolvedValue(mockPropietario({ inmobiliariaId: 'otra-inm' }));
      await expect(service.findOne('prop-1', mockUser())).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN puede ver propietarios de cualquier inmobiliaria', async () => {
      repo.findOne.mockResolvedValue(mockPropietario({ inmobiliariaId: 'inm-ajena' }));
      const result = await service.findOne('prop-1', mockAdmin());
      expect(result).toBeDefined();
    });
  });

  // ── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('actualiza propietario correctamente', async () => {
      repo.findOne.mockResolvedValue(mockPropietario());
      repo.update.mockResolvedValue(undefined as any);
      const result = await service.update('prop-1', { nombre: 'Nuevo' } as any, mockUser());
      expect(repo.update).toHaveBeenCalledWith('prop-1', expect.objectContaining({ nombre: 'Nuevo' }));
      expect(result).toBeDefined();
    });
  });

  // ── activate ──────────────────────────────────────────────────────────────
  describe('activate', () => {
    it('activa propietario', async () => {
      repo.findOne.mockResolvedValue(mockPropietario({ isActive: false }));
      repo.update.mockResolvedValue(undefined as any);
      await service.activate('prop-1', true, mockUser());
      expect(repo.update).toHaveBeenCalledWith('prop-1', { isActive: true });
    });

    it('desactiva propietario', async () => {
      repo.findOne.mockResolvedValue(mockPropietario({ isActive: true }));
      repo.update.mockResolvedValue(undefined as any);
      await service.activate('prop-1', false, mockUser());
      expect(repo.update).toHaveBeenCalledWith('prop-1', { isActive: false });
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('elimina propietario', async () => {
      repo.findOne.mockResolvedValue(mockPropietario());
      repo.remove.mockResolvedValue(mockPropietario());
      await expect(service.remove('prop-1', mockUser())).resolves.not.toThrow();
      expect(repo.remove).toHaveBeenCalled();
    });

    it('lanza NotFoundException si no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('x', mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByInmobiliaria ────────────────────────────────────────────────────
  describe('findByInmobiliaria', () => {
    it('retorna propietarios activos de la inmobiliaria', async () => {
      repo.find.mockResolvedValue([mockPropietario()]);
      const result = await service.findByInmobiliaria('inm-1');
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { inmobiliariaId: 'inm-1', isActive: true },
      }));
      expect(result).toHaveLength(1);
    });
  });
});
