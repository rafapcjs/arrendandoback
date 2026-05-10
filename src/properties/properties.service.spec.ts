import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PropertiesService } from './properties.service';
import { Property } from './entities/property.entity';
import { Contrato, ContratoEstado } from '../contratos/entities/contrato.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Role } from '../common/enums/roles.enum';

const mockUser = (role = Role.INMOBILIARIA, inmobiliariaId = 'inm-1') => ({ id: 'user-1', role, inmobiliariaId });
const mockAdmin = () => mockUser(Role.ADMIN, undefined);

const mockProperty = (o: Partial<Property> = {}): Property =>
  ({ id: 'prop-1', disponible: true, inmobiliariaId: 'inm-1', fotoPublicId: null, fotoUrl: null, ...o } as Property);

const mockFile = (): Express.Multer.File =>
  ({ originalname: 'foto.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('img') } as any);

const repoMock = () => ({
  findOne: jest.fn(), find: jest.fn(), findAndCount: jest.fn(),
  create: jest.fn(), save: jest.fn(), update: jest.fn(), remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('PropertiesService', () => {
  let service: PropertiesService;
  let propertyRepo: jest.Mocked<Repository<Property>>;
  let contratoRepo: jest.Mocked<Repository<Contrato>>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: getRepositoryToken(Property), useFactory: repoMock },
        { provide: getRepositoryToken(Contrato), useFactory: repoMock },
        { provide: CloudinaryService, useValue: { uploadImage: jest.fn(), deleteImage: jest.fn() } },
      ],
    }).compile();
    service = module.get(PropertiesService);
    propertyRepo = module.get(getRepositoryToken(Property));
    contratoRepo = module.get(getRepositoryToken(Contrato));
    cloudinaryService = module.get(CloudinaryService);
  });
  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = { direccion: 'Calle 1', codigoServicioAgua: 'A1', codigoServicioGas: 'G1', codigoServicioLuz: 'L1' };

    it('crea inmueble sin foto', async () => {
      propertyRepo.create.mockReturnValue(mockProperty());
      propertyRepo.save.mockResolvedValue(mockProperty());
      const result = await service.create(dto as any, mockUser());
      expect(propertyRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('prop-1');
    });

    it('crea inmueble con foto y sube a Cloudinary', async () => {
      cloudinaryService.uploadImage.mockResolvedValue({ secureUrl: 'https://cdn.com/img.jpg', publicId: 'prop/img' });
      propertyRepo.create.mockReturnValue(mockProperty({ fotoUrl: 'https://cdn.com/img.jpg' }));
      propertyRepo.save.mockResolvedValue(mockProperty({ fotoUrl: 'https://cdn.com/img.jpg' }));
      const result = await service.create(dto as any, mockUser(), mockFile());
      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
      expect(result.fotoUrl).toBe('https://cdn.com/img.jpg');
    });

    it('lanza BadRequestException si no hay inmobiliariaId', async () => {
      await expect(service.create(dto as any, { id: 'u1', role: Role.INMOBILIARIA, inmobiliariaId: null }))
        .rejects.toThrow(BadRequestException);
    });

    it('lanza ConflictException en error de duplicado de BD', async () => {
      propertyRepo.create.mockReturnValue(mockProperty());
      propertyRepo.save.mockRejectedValue({ code: '23505' });
      await expect(service.create(dto as any, mockUser())).rejects.toThrow(ConflictException);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('retorna lista paginada', async () => {
      propertyRepo.findAndCount.mockResolvedValue([[mockProperty()], 1]);
      const result = await service.findAll({ page: 1, limit: 10 }, mockUser());
      expect(result).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna el inmueble si existe', async () => {
      propertyRepo.findOne.mockResolvedValue(mockProperty());
      const result = await service.findOne('prop-1', mockUser());
      expect(result.id).toBe('prop-1');
    });

    it('lanza NotFoundException si no existe', async () => {
      propertyRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x', mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByAddress ──────────────────────────────────────────────────────────
  describe('findByAddress', () => {
    it('retorna inmueble por dirección', async () => {
      propertyRepo.findOne.mockResolvedValue(mockProperty());
      const result = await service.findByAddress('Calle', mockUser());
      expect(result).toBeDefined();
    });

    it('lanza NotFoundException si no hay coincidencia', async () => {
      propertyRepo.findOne.mockResolvedValue(null);
      await expect(service.findByAddress('XYZ', mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('actualiza datos sin foto', async () => {
      propertyRepo.findOne.mockResolvedValue(mockProperty());
      propertyRepo.save.mockResolvedValue(mockProperty({ direccion: 'Nueva' }));
      const result = await service.update('prop-1', { direccion: 'Nueva' } as any, mockUser());
      expect(propertyRepo.save).toHaveBeenCalled();
      expect(result.direccion).toBe('Nueva');
    });

    it('reemplaza foto existente al actualizar con nueva imagen', async () => {
      propertyRepo.findOne.mockResolvedValue(mockProperty({ fotoPublicId: 'old-id' }));
      cloudinaryService.deleteImage.mockResolvedValue(undefined);
      cloudinaryService.uploadImage.mockResolvedValue({ secureUrl: 'https://cdn.com/new.jpg', publicId: 'new-id' });
      propertyRepo.save.mockResolvedValue(mockProperty({ fotoUrl: 'https://cdn.com/new.jpg' }));
      await service.update('prop-1', {} as any, mockUser(), mockFile());
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('old-id');
      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
    });
  });

  // ── activate ──────────────────────────────────────────────────────────────
  describe('activate', () => {
    it('cambia disponibilidad a false sin contrato activo', async () => {
      propertyRepo.findOne.mockResolvedValue(mockProperty());
      contratoRepo.findOne.mockResolvedValue(null);
      propertyRepo.save.mockResolvedValue(mockProperty({ disponible: false }));
      const result = await service.activate('prop-1', false, mockUser());
      expect(result.disponible).toBe(false);
    });

    it('lanza ConflictException al activar inmueble con contrato activo', async () => {
      propertyRepo.findOne.mockResolvedValue(mockProperty({ disponible: false }));
      contratoRepo.findOne.mockResolvedValue({ id: 'c1', estado: ContratoEstado.ACTIVO } as any);
      await expect(service.activate('prop-1', true, mockUser())).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException al desactivar inmueble ya desactivado con contrato activo', async () => {
      propertyRepo.findOne.mockResolvedValue(mockProperty({ disponible: false }));
      contratoRepo.findOne.mockResolvedValue({ id: 'c1' } as any);
      await expect(service.activate('prop-1', false, mockUser())).rejects.toThrow(ConflictException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('elimina el inmueble', async () => {
      propertyRepo.findOne.mockResolvedValue(mockProperty());
      propertyRepo.remove.mockResolvedValue(mockProperty());
      await expect(service.remove('prop-1', mockUser())).resolves.not.toThrow();
    });

    it('lanza NotFoundException si no existe', async () => {
      propertyRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('x', mockUser())).rejects.toThrow(NotFoundException);
    });
  });
});
