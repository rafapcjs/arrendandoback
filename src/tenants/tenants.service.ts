import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { PaginatedTenantDto } from './dto/paginated-tenant.dto';
import { SearchTenantDto } from './dto/search-tenant.dto';
import { Contrato, ContratoEstado } from '../contratos/entities/contrato.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Contrato)
    private contratoRepository: Repository<Contrato>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Verificar si ya existe un inquilino con la misma cédula
    const existingTenantByCedula = await this.tenantRepository.findOne({
      where: { cedula: createTenantDto.cedula },
    });

    if (existingTenantByCedula) {
      throw new ConflictException('Ya existe un inquilino con esta cédula');
    }

    // Verificar si ya existe un inquilino con el mismo correo
    const existingTenantByEmail = await this.tenantRepository.findOne({
      where: { correo: createTenantDto.correo },
    });

    if (existingTenantByEmail) {
      throw new ConflictException('Ya existe un inquilino con este correo');
    }

    const tenant = this.tenantRepository.create(createTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedTenantDto> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.tenantRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async search(
    searchDto: SearchTenantDto & PaginationDto,
  ): Promise<PaginatedTenantDto> {
    const { search, ciudad, isActive, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');

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
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Inquilino con ID ${id} no encontrado`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Verificar cédula única si se está actualizando
    if (updateTenantDto.cedula && updateTenantDto.cedula !== tenant.cedula) {
      const existingTenantByCedula = await this.tenantRepository.findOne({
        where: { cedula: updateTenantDto.cedula },
      });

      if (existingTenantByCedula) {
        throw new ConflictException('Ya existe un inquilino con esta cédula');
      }
    }

    // Verificar correo único si se está actualizando
    if (updateTenantDto.correo && updateTenantDto.correo !== tenant.correo) {
      const existingTenantByEmail = await this.tenantRepository.findOne({
        where: { correo: updateTenantDto.correo },
      });

      if (existingTenantByEmail) {
        throw new ConflictException('Ya existe un inquilino con este correo');
      }
    }

    await this.tenantRepository.update(id, updateTenantDto);
    return this.findOne(id);
  }

  async activate(id: string, isActive: boolean): Promise<Tenant> {
    const tenant = await this.findOne(id);
    
    // Si se está intentando desactivar el inquilino, verificar que no tenga contratos activos
    if (!isActive && tenant.isActive) {
      const activeContracts = await this.contratoRepository.find({
        where: {
          inquilinoId: id,
          estado: ContratoEstado.ACTIVO,
        },
      });

      if (activeContracts.length > 0) {
        throw new ConflictException(
          'No se puede desactivar el inquilino porque tiene contratos activos'
        );
      }
    }
    
    await this.tenantRepository.update(id, { isActive });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantRepository.remove(tenant);
  }

  async findByCedula(cedula: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { cedula },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Inquilino con cédula ${cedula} no encontrado`,
      );
    }

    return tenant;
  }

  async findByEmail(correo: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { correo },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Inquilino con correo ${correo} no encontrado`,
      );
    }

    return tenant;
  }
}
