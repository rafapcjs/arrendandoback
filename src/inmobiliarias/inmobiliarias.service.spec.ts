import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InmobiliariasService } from './inmobiliarias.service';
import { Inmobiliaria, InmobiliariaEstado } from './entities/inmobiliaria.entity';
import { User } from '../auth/entities/user.entity';
import { Role } from '../common/enums/roles.enum';

const mockInmobiliaria = (o: Partial<Inmobiliaria> = {}): Inmobiliaria =>
  ({ id: 'inm-1', nit: '123456', email: 'inmo@test.com', nombre: 'Test SA', estado: InmobiliariaEstado.ACTIVA, ...o } as Inmobiliaria);

const repoMock = () => ({
  findOne: jest.fn(), find: jest.fn(), create: jest.fn(),
  save: jest.fn(), update: jest.fn(), remove: jest.fn(),
});

describe('InmobiliariasService', () => {
  let service: InmobiliariasService;
  let inmobiliariaRepo: jest.Mocked<Repository<Inmobiliaria>>;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InmobiliariasService,
        { provide: getRepositoryToken(Inmobiliaria), useFactory: repoMock },
        { provide: getRepositoryToken(User), useFactory: repoMock },
      ],
    }).compile();
    service = module.get(InmobiliariasService);
    inmobiliariaRepo = module.get(getRepositoryToken(Inmobiliaria));
    userRepo = module.get(getRepositoryToken(User));
  });
  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = { nit: '123456', email: 'inmo@test.com', nombre: 'Test SA', telefono: '3001', direccion: 'Calle 1', ciudad: 'Bogotá' };

    it('crea inmobiliaria correctamente', async () => {
      inmobiliariaRepo.findOne.mockResolvedValue(null);
      inmobiliariaRepo.create.mockReturnValue(mockInmobiliaria());
      inmobiliariaRepo.save.mockResolvedValue(mockInmobiliaria());
      const result = await service.create(dto as any, 'user-1');
      expect(inmobiliariaRepo.save).toHaveBeenCalled();
      expect(result.nit).toBe('123456');
    });

    it('lanza ConflictException si NIT duplicado', async () => {
      inmobiliariaRepo.findOne.mockResolvedValueOnce(mockInmobiliaria());
      await expect(service.create(dto as any, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException si email duplicado', async () => {
      inmobiliariaRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockInmobiliaria());
      await expect(service.create(dto as any, 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('retorna todas las inmobiliarias', async () => {
      inmobiliariaRepo.find.mockResolvedValue([mockInmobiliaria(), mockInmobiliaria({ id: 'inm-2' })]);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });
  });

  // ── findDisponibles ───────────────────────────────────────────────────────
  describe('findDisponibles', () => {
    it('retorna inmobiliarias activas sin usuario asignado', async () => {
      userRepo.find.mockResolvedValue([{ inmobiliariaId: 'inm-2' } as any]);
      inmobiliariaRepo.find.mockResolvedValue([mockInmobiliaria()]);
      const result = await service.findDisponibles();
      expect(inmobiliariaRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: InmobiliariaEstado.ACTIVA }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('retorna todas las activas si no hay usuarios asignados', async () => {
      userRepo.find.mockResolvedValue([]);
      inmobiliariaRepo.find.mockResolvedValue([mockInmobiliaria()]);
      const result = await service.findDisponibles();
      expect(result).toHaveLength(1);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna la inmobiliaria si existe', async () => {
      inmobiliariaRepo.findOne.mockResolvedValue(mockInmobiliaria());
      const result = await service.findOne('inm-1');
      expect(result.id).toBe('inm-1');
    });

    it('lanza NotFoundException si no existe', async () => {
      inmobiliariaRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findOneForUser ────────────────────────────────────────────────────────
  describe('findOneForUser', () => {
    it('INMOBILIARIA accede a su propia inmobiliaria', async () => {
      inmobiliariaRepo.findOne.mockResolvedValue(mockInmobiliaria());
      const result = await service.findOneForUser('inm-1', { role: Role.INMOBILIARIA, inmobiliariaId: 'inm-1' });
      expect(result.id).toBe('inm-1');
    });

    it('lanza ForbiddenException si INMOBILIARIA accede a la de otra', async () => {
      inmobiliariaRepo.findOne.mockResolvedValue(mockInmobiliaria({ id: 'inm-1' }));
      await expect(service.findOneForUser('inm-1', { role: Role.INMOBILIARIA, inmobiliariaId: 'inm-2' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('ADMIN puede acceder a cualquier inmobiliaria', async () => {
      inmobiliariaRepo.findOne.mockResolvedValue(mockInmobiliaria());
      const result = await service.findOneForUser('inm-1', { role: Role.ADMIN });
      expect(result).toBeDefined();
    });
  });

  // ── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('actualiza datos correctamente', async () => {
      inmobiliariaRepo.findOne.mockResolvedValue(mockInmobiliaria());
      inmobiliariaRepo.update.mockResolvedValue(undefined as any);
      const result = await service.update('inm-1', { nombre: 'Nuevo Nombre' } as any);
      expect(inmobiliariaRepo.update).toHaveBeenCalledWith('inm-1', expect.objectContaining({ nombre: 'Nuevo Nombre' }));
      expect(result).toBeDefined();
    });

    it('lanza ConflictException si nuevo NIT ya existe', async () => {
      inmobiliariaRepo.findOne
        .mockResolvedValueOnce(mockInmobiliaria())
        .mockResolvedValueOnce(mockInmobiliaria({ id: 'otra' }));
      await expect(service.update('inm-1', { nit: '999' } as any)).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException si nuevo email ya existe', async () => {
      inmobiliariaRepo.findOne
        .mockResolvedValueOnce(mockInmobiliaria())
        .mockResolvedValueOnce(mockInmobiliaria({ id: 'otra' }));
      await expect(service.update('inm-1', { email: 'otro@test.com' } as any)).rejects.toThrow(ConflictException);
    });
  });

  // ── toggleEstado ──────────────────────────────────────────────────────────
  describe('toggleEstado', () => {
    it('cambia de ACTIVA a INACTIVA', async () => {
      inmobiliariaRepo.findOne
        .mockResolvedValueOnce(mockInmobiliaria({ estado: InmobiliariaEstado.ACTIVA }))
        .mockResolvedValueOnce(mockInmobiliaria({ estado: InmobiliariaEstado.INACTIVA }));
      const result = await service.toggleEstado('inm-1');
      expect(inmobiliariaRepo.update).toHaveBeenCalledWith('inm-1', { estado: InmobiliariaEstado.INACTIVA });
    });

    it('cambia de INACTIVA a ACTIVA', async () => {
      inmobiliariaRepo.findOne
        .mockResolvedValueOnce(mockInmobiliaria({ estado: InmobiliariaEstado.INACTIVA }))
        .mockResolvedValueOnce(mockInmobiliaria({ estado: InmobiliariaEstado.ACTIVA }));
      const result = await service.toggleEstado('inm-1');
      expect(inmobiliariaRepo.update).toHaveBeenCalledWith('inm-1', { estado: InmobiliariaEstado.ACTIVA });
    });
  });
});
