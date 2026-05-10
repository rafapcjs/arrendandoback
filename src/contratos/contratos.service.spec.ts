import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ContratosService } from './contratos.service';
import { Contrato, ContratoEstado } from './entities/contrato.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Property } from '../properties/entities/property.entity';
import { PagosService } from '../pagos/pagos.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { Role } from '../common/enums/roles.enum';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockUser = (role: string = Role.INMOBILIARIA, inmobiliariaId = 'inm-1') => ({
  id: 'user-1',
  role,
  inmobiliariaId,
});

const mockAdminUser = () => mockUser(Role.ADMIN, undefined);

const mockContrato = (overrides: Partial<Contrato> = {}): Contrato =>
  ({
    id: 'contrato-1',
    inquilinoId: 'tenant-1',
    inmuebleId: 'property-1',
    inmobiliariaId: 'inm-1',
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-12-31'),
    canonMensual: 1500000,
    estado: ContratoEstado.ACTIVO,
    documentos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Contrato);

const mockTenant = (overrides = {}) => ({
  id: 'tenant-1',
  isActive: true,
  disponible: true,
  ...overrides,
});

const mockProperty = (overrides = {}) => ({
  id: 'property-1',
  disponible: true,
  ...overrides,
});

const mockFile = (): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'contrato.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('fake-pdf-content'),
    size: 1024,
  } as Express.Multer.File);

// ─── Factory de mocks de repositorio ────────────────────────────────────────

const repoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ─── Suite principal ─────────────────────────────────────────────────────────

describe('ContratosService', () => {
  let service: ContratosService;
  let contratoRepo: jest.Mocked<Repository<Contrato>>;
  let tenantRepo: jest.Mocked<Repository<Tenant>>;
  let propertyRepo: jest.Mocked<Repository<Property>>;
  let pagosService: jest.Mocked<PagosService>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContratosService,
        { provide: getRepositoryToken(Contrato), useFactory: repoMock },
        { provide: getRepositoryToken(Tenant), useFactory: repoMock },
        { provide: getRepositoryToken(Property), useFactory: repoMock },
        {
          provide: PagosService,
          useValue: {
            crearPagosMensuales: jest.fn(),
            removePendingByContrato: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadDocument: jest.fn(),
            deleteDocument: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ContratosService);
    contratoRepo = module.get(getRepositoryToken(Contrato));
    tenantRepo = module.get(getRepositoryToken(Tenant));
    propertyRepo = module.get(getRepositoryToken(Property));
    pagosService = module.get(PagosService);
    cloudinaryService = module.get(CloudinaryService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateContratoDto = {
      inquilinoId: 'tenant-1',
      inmuebleId: 'property-1',
      fechaInicio: '2025-01-01',
      fechaFin: '2025-12-31',
      canonMensual: 1500000,
      estado: ContratoEstado.ACTIVO,
    };

    it('crea contrato ACTIVO, marca inmueble/inquilino no disponible y genera pagos', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant() as any);
      propertyRepo.findOne.mockResolvedValue(mockProperty() as any);
      contratoRepo.findOne
        .mockResolvedValueOnce(null)           // no hay contrato activo
        .mockResolvedValueOnce(mockContrato()); // findOne final
      contratoRepo.create.mockReturnValue(mockContrato());
      contratoRepo.save.mockResolvedValue(mockContrato());

      const result = await service.create(dto, mockUser());

      expect(propertyRepo.update).toHaveBeenCalledWith('property-1', { disponible: false });
      expect(tenantRepo.update).toHaveBeenCalledWith('tenant-1', { disponible: false });
      expect(pagosService.crearPagosMensuales).toHaveBeenCalledWith('contrato-1', 12);
      expect(result).toMatchObject({ id: 'contrato-1' });
    });

    it('crea contrato en BORRADOR sin generar pagos', async () => {
      const borradorDto = { ...dto, estado: ContratoEstado.BORRADOR };
      tenantRepo.findOne.mockResolvedValue(mockTenant() as any);
      propertyRepo.findOne.mockResolvedValue(mockProperty() as any);
      contratoRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockContrato({ estado: ContratoEstado.BORRADOR }));
      contratoRepo.create.mockReturnValue(mockContrato({ estado: ContratoEstado.BORRADOR }));
      contratoRepo.save.mockResolvedValue(mockContrato({ estado: ContratoEstado.BORRADOR }));

      await service.create(borradorDto, mockUser());

      expect(pagosService.crearPagosMensuales).not.toHaveBeenCalled();
      expect(propertyRepo.update).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si inquilino no existe o está inactivo', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(service.create(dto, mockUser())).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si inmueble no existe', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant() as any);
      propertyRepo.findOne.mockResolvedValue(null);

      await expect(service.create(dto, mockUser())).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si inmueble no está disponible', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant() as any);
      propertyRepo.findOne.mockResolvedValue(mockProperty({ disponible: false }) as any);

      await expect(service.create(dto, mockUser())).rejects.toThrow(ConflictException);
    });

    it('lanza BadRequestException si fechaInicio >= fechaFin', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant() as any);
      propertyRepo.findOne.mockResolvedValue(mockProperty() as any);
      const badDto = { ...dto, fechaInicio: '2025-12-31', fechaFin: '2025-01-01' };

      await expect(service.create(badDto, mockUser())).rejects.toThrow(BadRequestException);
    });

    it('lanza ConflictException si el inmueble ya tiene contrato ACTIVO', async () => {
      tenantRepo.findOne.mockResolvedValue(mockTenant() as any);
      propertyRepo.findOne.mockResolvedValue(mockProperty() as any);
      contratoRepo.findOne.mockResolvedValue(mockContrato());

      await expect(service.create(dto, mockUser())).rejects.toThrow(ConflictException);
    });

    it('ADMIN puede especificar inmobiliariaId diferente', async () => {
      const adminDto = { ...dto, inmobiliariaId: 'inm-admin' };
      tenantRepo.findOne.mockResolvedValue(mockTenant() as any);
      propertyRepo.findOne.mockResolvedValue(mockProperty() as any);
      contratoRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockContrato({ inmobiliariaId: 'inm-admin' }));
      contratoRepo.create.mockReturnValue(mockContrato({ inmobiliariaId: 'inm-admin' }));
      contratoRepo.save.mockResolvedValue(mockContrato({ inmobiliariaId: 'inm-admin' }));

      const result = await service.create(adminDto, mockAdminUser());

      expect(contratoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ inmobiliariaId: 'inm-admin' }),
      );
      expect(result).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna el contrato si existe y pertenece a la inmobiliaria', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato());

      const result = await service.findOne('contrato-1', mockUser());

      expect(result).toMatchObject({ id: 'contrato-1' });
    });

    it('lanza NotFoundException si el contrato no existe', async () => {
      contratoRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('no-existe', mockUser())).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el contrato pertenece a otra inmobiliaria', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ inmobiliariaId: 'otra-inm' }));

      await expect(service.findOne('contrato-1', mockUser())).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN puede ver contratos de cualquier inmobiliaria', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ inmobiliariaId: 'inm-ajena' }));

      const result = await service.findOne('contrato-1', mockAdminUser());

      expect(result).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FINALIZAR CONTRATO
  // ─────────────────────────────────────────────────────────────────────────

  describe('finalizarContrato', () => {
    it('finaliza un contrato ACTIVO y libera inmueble e inquilino', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ estado: ContratoEstado.ACTIVO }));

      await service.finalizarContrato('contrato-1');

      expect(pagosService.removePendingByContrato).toHaveBeenCalledWith('contrato-1');
      expect(contratoRepo.update).toHaveBeenCalledWith('contrato-1', { estado: ContratoEstado.FINALIZADO });
      expect(propertyRepo.update).toHaveBeenCalledWith('property-1', { disponible: true });
      expect(tenantRepo.update).toHaveBeenCalledWith('tenant-1', { disponible: true });
    });

    it('finaliza un contrato PROXIMO_VENCER', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ estado: ContratoEstado.PROXIMO_VENCER }));

      await expect(service.finalizarContrato('contrato-1')).resolves.not.toThrow();
    });

    it('lanza BadRequestException si el contrato está VENCIDO', async () => {
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato({ estado: ContratoEstado.VENCIDO }));

      await expect(service.finalizarContrato('contrato-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el contrato está FINALIZADO', async () => {
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato({ estado: ContratoEstado.FINALIZADO }));

      await expect(service.finalizarContrato('contrato-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MARCAR COMO VENCIDO
  // ─────────────────────────────────────────────────────────────────────────

  describe('marcarComoVencido', () => {
    it('marca como vencido si la fecha ya pasó', async () => {
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato({ fechaFin: new Date('2020-01-01'), estado: ContratoEstado.ACTIVO }))
        .mockResolvedValueOnce(mockContrato({ estado: ContratoEstado.VENCIDO }));

      const result = await service.marcarComoVencido('contrato-1');

      expect(contratoRepo.update).toHaveBeenCalledWith('contrato-1', { estado: ContratoEstado.VENCIDO });
      expect(propertyRepo.update).toHaveBeenCalledWith('property-1', { disponible: true });
      expect(tenantRepo.update).toHaveBeenCalledWith('tenant-1', { disponible: true });
      expect(result).toBeDefined();
    });

    it('lanza BadRequestException si la fecha de fin aún no llega', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      contratoRepo.findOne.mockResolvedValue(mockContrato({ fechaFin: futureDate }));

      await expect(service.marcarComoVencido('contrato-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el contrato ya está FINALIZADO', async () => {
      contratoRepo.findOne.mockResolvedValue(
        mockContrato({ fechaFin: new Date('2020-01-01'), estado: ContratoEstado.FINALIZADO }),
      );

      await expect(service.marcarComoVencido('contrato-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REMOVE
  // ─────────────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('elimina un contrato ACTIVO: lo finaliza, limpia pagos y libera recursos', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ estado: ContratoEstado.ACTIVO }));

      await service.remove('contrato-1');

      expect(pagosService.removePendingByContrato).toHaveBeenCalled();
      expect(propertyRepo.update).toHaveBeenCalledWith('property-1', { disponible: true });
      expect(tenantRepo.update).toHaveBeenCalledWith('tenant-1', { disponible: true });
      expect(contratoRepo.update).toHaveBeenCalledWith('contrato-1', { estado: ContratoEstado.VENCIDO });
    });

    it('elimina un contrato BORRADOR directamente sin finalizar', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ estado: ContratoEstado.BORRADOR }));

      await service.remove('contrato-1');

      expect(contratoRepo.update).toHaveBeenCalledWith('contrato-1', { estado: ContratoEstado.VENCIDO });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET ACTIVE CONTRACTS
  // ─────────────────────────────────────────────────────────────────────────

  describe('getActiveContracts', () => {
    it('retorna contratos ACTIVOS de la inmobiliaria autenticada', async () => {
      contratoRepo.find.mockResolvedValue([mockContrato()]);

      const result = await service.getActiveContracts(mockUser());

      expect(contratoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: ContratoEstado.ACTIVO,
            inmobiliariaId: 'inm-1',
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('ADMIN obtiene contratos de todas las inmobiliarias', async () => {
      contratoRepo.find.mockResolvedValue([mockContrato(), mockContrato({ id: 'contrato-2' })]);

      const result = await service.getActiveContracts(mockAdminUser());

      expect(contratoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ inmobiliariaId: expect.anything() }),
        }),
      );
      expect(result).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET CONTRACTS EXPIRING SOON
  // ─────────────────────────────────────────────────────────────────────────

  describe('getContractsExpiringSoon', () => {
    it('retorna contratos que vencen dentro de N días', async () => {
      contratoRepo.find.mockResolvedValue([mockContrato()]);

      const result = await service.getContractsExpiringSoon(30, mockUser());

      expect(contratoRepo.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('usa 30 días por defecto si no se especifica', async () => {
      contratoRepo.find.mockResolvedValue([]);

      await service.getContractsExpiringSoon(undefined, mockUser());

      expect(contratoRepo.find).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUBIR DOCUMENTO
  // ─────────────────────────────────────────────────────────────────────────

  describe('subirDocumento', () => {
    it('sube un PDF y lo agrega al array de documentos', async () => {
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato({ documentos: [] }))
        .mockResolvedValueOnce(mockContrato({ documentos: [{ docId: 'doc-1' } as any] }));
      cloudinaryService.uploadDocument.mockResolvedValue({
        secureUrl: 'https://cloudinary.com/doc.pdf',
        publicId: 'contratos/documentos/doc.pdf',
        resourceType: 'raw',
      });

      const result = await service.subirDocumento('contrato-1', mockFile(), mockUser());

      expect(cloudinaryService.uploadDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        'contrato.pdf',
        'application/pdf',
      );
      expect(contratoRepo.update).toHaveBeenCalledWith(
        'contrato-1',
        expect.objectContaining({
          documentos: expect.arrayContaining([
            expect.objectContaining({
              url: 'https://cloudinary.com/doc.pdf',
              nombre: 'contrato.pdf',
              tipo: 'application/pdf',
            }),
          ]),
        }),
      );
      expect(result).toBeDefined();
    });

    it('lanza NotFoundException si el contrato no existe', async () => {
      contratoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.subirDocumento('no-existe', mockFile(), mockUser()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REEMPLAZAR DOCUMENTO
  // ─────────────────────────────────────────────────────────────────────────

  describe('reemplazarDocumento', () => {
    const docExistente = {
      docId: 'doc-1',
      publicId: 'contratos/documentos/viejo.pdf',
      resourceType: 'raw',
      url: 'https://cloudinary.com/viejo.pdf',
      nombre: 'viejo.pdf',
      tipo: 'application/pdf',
      subidoEn: new Date().toISOString(),
    };

    it('elimina el documento viejo y sube el nuevo', async () => {
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato({ documentos: [docExistente] }))
        .mockResolvedValueOnce(mockContrato({ documentos: [{ ...docExistente, nombre: 'contrato.pdf' }] }));
      cloudinaryService.deleteDocument.mockResolvedValue(undefined);
      cloudinaryService.uploadDocument.mockResolvedValue({
        secureUrl: 'https://cloudinary.com/nuevo.pdf',
        publicId: 'contratos/documentos/nuevo.pdf',
        resourceType: 'raw',
      });

      await service.reemplazarDocumento('contrato-1', 'doc-1', mockFile(), mockUser());

      expect(cloudinaryService.deleteDocument).toHaveBeenCalledWith(
        'contratos/documentos/viejo.pdf',
        'raw',
      );
      expect(cloudinaryService.uploadDocument).toHaveBeenCalled();
      expect(contratoRepo.update).toHaveBeenCalled();
    });

    it('lanza NotFoundException si el docId no existe en el contrato', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ documentos: [] }));

      await expect(
        service.reemplazarDocumento('contrato-1', 'doc-inexistente', mockFile(), mockUser()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STREAM DOCUMENTO
  // ─────────────────────────────────────────────────────────────────────────

  describe('streamDocumento', () => {
    const doc = {
      docId: 'doc-1',
      publicId: 'contratos/documentos/doc.pdf',
      resourceType: 'raw',
      url: 'https://cloudinary.com/doc.pdf',
      nombre: 'contrato.pdf',
      tipo: 'application/pdf',
      subidoEn: new Date().toISOString(),
    };

    it('retorna url, nombre y tipo del documento', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ documentos: [doc] }));

      const result = await service.streamDocumento('contrato-1', 'doc-1', mockUser());

      expect(result).toEqual({
        url: 'https://cloudinary.com/doc.pdf',
        nombre: 'contrato.pdf',
        tipo: 'application/pdf',
      });
    });

    it('lanza NotFoundException si el docId no existe', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ documentos: [] }));

      await expect(
        service.streamDocumento('contrato-1', 'doc-inexistente', mockUser()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ELIMINAR DOCUMENTO
  // ─────────────────────────────────────────────────────────────────────────

  describe('eliminarDocumento', () => {
    const doc = {
      docId: 'doc-1',
      publicId: 'contratos/documentos/doc.pdf',
      resourceType: 'raw',
      url: 'https://cloudinary.com/doc.pdf',
      nombre: 'contrato.pdf',
      tipo: 'application/pdf',
      subidoEn: new Date().toISOString(),
    };

    it('elimina el documento de Cloudinary y del array', async () => {
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato({ documentos: [doc] }))
        .mockResolvedValueOnce(mockContrato({ documentos: [] }));
      cloudinaryService.deleteDocument.mockResolvedValue(undefined);

      const result = await service.eliminarDocumento('contrato-1', 'doc-1', mockUser());

      expect(cloudinaryService.deleteDocument).toHaveBeenCalledWith(
        'contratos/documentos/doc.pdf',
        'raw',
      );
      expect(contratoRepo.update).toHaveBeenCalledWith('contrato-1', { documentos: [] });
      expect(result).toBeDefined();
    });

    it('lanza NotFoundException si el docId no existe', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato({ documentos: [] }));

      await expect(
        service.eliminarDocumento('contrato-1', 'no-doc', mockUser()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FIND ALL SIMPLE
  // ─────────────────────────────────────────────────────────────────────────

  describe('findAllSimple', () => {
    const mockQb = () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockContrato()], 1]),
      };
      return qb;
    };

    it('retorna lista paginada para INMOBILIARIA con filtro de tenant', async () => {
      contratoRepo.createQueryBuilder.mockReturnValue(mockQb() as any);

      const result = await service.findAllSimple(1, 10, undefined, mockUser());

      expect(result).toMatchObject({ total: 1, page: 1, limit: 10, totalPages: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('filtra por estado cuando se proporciona', async () => {
      const qb = mockQb();
      contratoRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAllSimple(1, 10, ContratoEstado.ACTIVO, mockUser());

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('estado'),
        expect.objectContaining({ estado: ContratoEstado.ACTIVO }),
      );
    });

    it('calcula correctamente totalPages', async () => {
      const qb = mockQb();
      qb.getManyAndCount.mockResolvedValue([[mockContrato(), mockContrato()], 25]);
      contratoRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAllSimple(1, 10, undefined, mockUser());

      expect(result.totalPages).toBe(3);
    });

    it('ADMIN no aplica filtro de inmobiliariaId', async () => {
      const qb = mockQb();
      contratoRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAllSimple(1, 10, undefined, mockAdminUser());

      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0] as string);
      expect(andWhereCalls.some((c) => c.includes('inmobiliariaId'))).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('actualiza un contrato correctamente', async () => {
      const updated = mockContrato({ canonMensual: 2000000 });
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato())
        .mockResolvedValueOnce(updated);

      const result = await service.update('contrato-1', { canonMensual: 2000000 }, mockUser());

      expect(contratoRepo.update).toHaveBeenCalledWith(
        'contrato-1',
        expect.objectContaining({ canonMensual: 2000000 }),
      );
      expect(result.canonMensual).toBe(2000000);
    });

    it('lanza BadRequestException si las nuevas fechas son inválidas', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato());

      await expect(
        service.update('contrato-1', { fechaInicio: '2025-12-31', fechaFin: '2025-01-01' }, mockUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('valida el nuevo inmueble si se cambia', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato());
      propertyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('contrato-1', { inmuebleId: 'nuevo-inmueble' }, mockUser()),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si el nuevo inmueble no está disponible', async () => {
      contratoRepo.findOne.mockResolvedValue(mockContrato());
      propertyRepo.findOne.mockResolvedValue(mockProperty({ disponible: false }) as any);

      await expect(
        service.update('contrato-1', { inmuebleId: 'nuevo-inmueble' }, mockUser()),
      ).rejects.toThrow(ConflictException);
    });

    it('genera pagos al cambiar estado a ACTIVO', async () => {
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato({ estado: ContratoEstado.BORRADOR }))
        .mockResolvedValueOnce(mockContrato({ estado: ContratoEstado.ACTIVO }));

      await service.update('contrato-1', { estado: ContratoEstado.ACTIVO }, mockUser());

      expect(pagosService.crearPagosMensuales).toHaveBeenCalled();
    });

    it('elimina pagos pendientes al cambiar de ACTIVO a FINALIZADO', async () => {
      contratoRepo.findOne
        .mockResolvedValueOnce(mockContrato({ estado: ContratoEstado.ACTIVO }))
        .mockResolvedValueOnce(mockContrato({ estado: ContratoEstado.FINALIZADO }));

      await service.update('contrato-1', { estado: ContratoEstado.FINALIZADO }, mockUser());

      expect(pagosService.removePendingByContrato).toHaveBeenCalledWith('contrato-1');
    });
  });
});
