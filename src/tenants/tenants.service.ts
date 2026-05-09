import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { PaginatedTenantDto } from './dto/paginated-tenant.dto';
import { SearchTenantDto } from './dto/search-tenant.dto';
import {
  Contrato,
  ContratoEstado,
} from '../contratos/entities/contrato.entity';
import { Role } from '../common/enums/roles.enum';

interface RequestUser {
  id: string;
  role: string;
  inmobiliariaId?: string | null;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Contrato)
    private contratoRepository: Repository<Contrato>,
  ) {}

  private tenantFilter(user: RequestUser): any {
    if (user.role === Role.ADMIN) return {};
    if (!user.inmobiliariaId) return { id: 'no-access' };
    return { inmobiliariaId: user.inmobiliariaId };
  }

  async create(createTenantDto: CreateTenantDto, user: RequestUser): Promise<Tenant> {
    const inmobiliariaId =
      user.role === Role.INMOBILIARIA ? user.inmobiliariaId : createTenantDto.inmobiliariaId;

    if (!inmobiliariaId) {
      throw new BadRequestException('Debe especificar inmobiliariaId');
    }

    const existingByCedula = await this.tenantRepository.findOne({
      where: { cedula: createTenantDto.cedula, inmobiliariaId },
    });
    if (existingByCedula) {
      throw new ConflictException('Ya existe un inquilino con esta cédula en su inmobiliaria');
    }

    const existingByEmail = await this.tenantRepository.findOne({
      where: { correo: createTenantDto.correo, inmobiliariaId },
    });
    if (existingByEmail) {
      throw new ConflictException('Ya existe un inquilino con este correo en su inmobiliaria');
    }

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      inmobiliariaId,
      creadoPorId: user.id,
    });
    return this.tenantRepository.save(tenant);
  }

  async findAll(paginationDto: PaginationDto, user: RequestUser): Promise<PaginatedTenantDto> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.tenantRepository.findAndCount({
      where: this.tenantFilter(user),
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async search(
    searchDto: SearchTenantDto & PaginationDto,
    user: RequestUser,
  ): Promise<PaginatedTenantDto> {
    const { search, ciudad, isActive, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');

    if (user.role !== Role.ADMIN) {
      queryBuilder.where('tenant.inmobiliariaId = :inmobiliariaId', {
        inmobiliariaId: user.inmobiliariaId,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(tenant.nombres ILIKE :search OR tenant.apellidos ILIKE :search OR tenant.cedula ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (ciudad) {
      queryBuilder.andWhere('tenant.ciudad ILIKE :ciudad', {
        ciudad: `%${ciudad}%`,
      });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('tenant.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy('tenant.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user?: RequestUser): Promise<Tenant> {
    const where: any = { id };
    if (user && user.role !== Role.ADMIN) {
      where.inmobiliariaId = user.inmobiliariaId;
    }

    const tenant = await this.tenantRepository.findOne({ where });

    if (!tenant) {
      throw new NotFoundException(`Inquilino con ID ${id} no encontrado`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto, user: RequestUser): Promise<Tenant> {
    const tenant = await this.findOne(id, user);

    if (updateTenantDto.cedula && updateTenantDto.cedula !== tenant.cedula) {
      const existing = await this.tenantRepository.findOne({
        where: { cedula: updateTenantDto.cedula, inmobiliariaId: tenant.inmobiliariaId },
      });
      if (existing) {
        throw new ConflictException('Ya existe un inquilino con esta cédula');
      }
    }

    if (updateTenantDto.correo && updateTenantDto.correo !== tenant.correo) {
      const existing = await this.tenantRepository.findOne({
        where: { correo: updateTenantDto.correo, inmobiliariaId: tenant.inmobiliariaId },
      });
      if (existing) {
        throw new ConflictException('Ya existe un inquilino con este correo');
      }
    }

    await this.tenantRepository.update(id, updateTenantDto);
    return this.findOne(id, user);
  }

  async activate(id: string, isActive: boolean, user: RequestUser): Promise<Tenant> {
    const tenant = await this.findOne(id, user);

    if (!isActive && tenant.isActive) {
      const activeContracts = await this.contratoRepository.find({
        where: { inquilinoId: id, estado: ContratoEstado.ACTIVO },
      });

      if (activeContracts.length > 0) {
        throw new ConflictException(
          'No se puede desactivar el inquilino porque tiene contratos activos',
        );
      }
    }

    await this.tenantRepository.update(id, { isActive });
    return this.findOne(id, user);
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const tenant = await this.findOne(id, user);
    await this.tenantRepository.remove(tenant);
  }

  async findByCedula(cedula: string, user: RequestUser): Promise<Tenant> {
    const where: any = { cedula };
    if (user.role !== Role.ADMIN) {
      where.inmobiliariaId = user.inmobiliariaId;
    }

    const tenant = await this.tenantRepository.findOne({ where });

    if (!tenant) {
      throw new NotFoundException(`Inquilino con cédula ${cedula} no encontrado`);
    }

    return tenant;
  }

  async findByEmail(correo: string, user: RequestUser): Promise<Tenant> {
    const where: any = { correo };
    if (user.role !== Role.ADMIN) {
      where.inmobiliariaId = user.inmobiliariaId;
    }

    const tenant = await this.tenantRepository.findOne({ where });

    if (!tenant) {
      throw new NotFoundException(`Inquilino con correo ${correo} no encontrado`);
    }

    return tenant;
  }
}
