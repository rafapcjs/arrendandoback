import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Property } from './entities/property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { PaginatedPropertyDto } from './dto/paginated-property.dto';
import {
  Contrato,
  ContratoEstado,
} from '../contratos/entities/contrato.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
  ) {}

  async create(createPropertyDto: CreatePropertyDto): Promise<Property> {
    try {
      const property = this.propertyRepository.create(createPropertyDto);
      return await this.propertyRepository.save(property);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe un inmueble con estos datos');
      }
      throw error;
    }
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedPropertyDto> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.propertyRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async search(
    searchDto: SearchPropertyDto & PaginationDto,
  ): Promise<PaginatedPropertyDto> {
    const { search, disponible, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.propertyRepository.createQueryBuilder('property');

    if (search) {
      queryBuilder.where(
        '(property.direccion ILIKE :search OR property.codigoServicioAgua ILIKE :search OR property.codigoServicioGas ILIKE :search OR property.codigoServicioLuz ILIKE :search OR property.descripcion ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (disponible !== undefined) {
      if (search) {
        queryBuilder.andWhere('property.disponible = :disponible', {
          disponible,
        });
      } else {
        queryBuilder.where('property.disponible = :disponible', { disponible });
      }
    }

    queryBuilder.orderBy('property.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Inmueble no encontrado');
    }

    return property;
  }

  async findByAddress(direccion: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { direccion: ILike(`%${direccion}%`) },
    });

    if (!property) {
      throw new NotFoundException('Inmueble no encontrado con esa dirección');
    }

    return property;
  }

  async update(
    id: string,
    updatePropertyDto: UpdatePropertyDto,
  ): Promise<Property> {
    const property = await this.findOne(id);

    try {
      Object.assign(property, updatePropertyDto);
      return await this.propertyRepository.save(property);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe un inmueble con estos datos');
      }
      throw error;
    }
  }

  async activate(id: string, disponible: boolean): Promise<Property> {
    const property = await this.findOne(id);

    // Verificar si hay contratos activos para este inmueble
    const activeContract = await this.contratoRepository.findOne({
      where: {
        inmuebleId: id,
        estado: ContratoEstado.ACTIVO,
      },
    });

    // Si hay un contrato activo, no permitir cambiar el estado del inmueble
    if (activeContract) {
      if (disponible === true) {
        throw new ConflictException(
          'No se puede activar el inmueble porque tiene un contrato activo',
        );
      }
      // Para mayor claridad, también verificar al intentar desactivar un inmueble ya no disponible con contrato activo
      if (disponible === false && !property.disponible) {
        throw new ConflictException(
          'El inmueble ya está desactivado debido a un contrato activo',
        );
      }
    }

    // Si no hay contrato activo, permitir cualquier cambio
    property.disponible = disponible;
    return await this.propertyRepository.save(property);
  }

  async remove(id: string): Promise<void> {
    const property = await this.findOne(id);
    await this.propertyRepository.remove(property);
  }
}
