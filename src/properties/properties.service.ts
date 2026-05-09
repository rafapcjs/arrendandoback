import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
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
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Role } from '../common/enums/roles.enum';

interface RequestUser {
  id: string;
  role: string;
  inmobiliariaId?: string | null;
}

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private tenantFilter(user: RequestUser): any {
    if (user.role === Role.ADMIN) return {};
    if (!user.inmobiliariaId) return { id: 'no-access' };
    return { inmobiliariaId: user.inmobiliariaId };
  }

  async create(
    createPropertyDto: CreatePropertyDto,
    user: RequestUser,
    foto?: Express.Multer.File,
  ): Promise<Property> {
    const inmobiliariaId =
      user.role === Role.INMOBILIARIA ? user.inmobiliariaId : createPropertyDto.inmobiliariaId;

    if (!inmobiliariaId) {
      throw new BadRequestException('Debe especificar inmobiliariaId');
    }

    try {
      const data: any = {
        ...createPropertyDto,
        inmobiliariaId,
        creadoPorId: user.id,
      };

      if (foto) {
        const uploaded = await this.cloudinaryService.uploadImage(
          foto.buffer,
          foto.originalname,
        );
        data.fotoUrl = uploaded.secureUrl;
        data.fotoPublicId = uploaded.publicId;
      }

      const property = this.propertyRepository.create(data as Property);
      return await this.propertyRepository.save(property);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe un inmueble con estos datos');
      }
      throw error;
    }
  }

  async findAll(paginationDto: PaginationDto, user: RequestUser): Promise<PaginatedPropertyDto> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.propertyRepository.findAndCount({
      where: this.tenantFilter(user),
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async search(
    searchDto: SearchPropertyDto & PaginationDto,
    user: RequestUser,
  ): Promise<PaginatedPropertyDto> {
    const { search, disponible, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.propertyRepository.createQueryBuilder('property');

    if (user.role !== Role.ADMIN) {
      queryBuilder.where('property.inmobiliariaId = :inmobiliariaId', {
        inmobiliariaId: user.inmobiliariaId,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(property.direccion ILIKE :search OR property.codigoServicioAgua ILIKE :search OR property.codigoServicioGas ILIKE :search OR property.codigoServicioLuz ILIKE :search OR property.descripcion ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (disponible !== undefined) {
      queryBuilder.andWhere('property.disponible = :disponible', { disponible });
    }

    queryBuilder.orderBy('property.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user?: RequestUser): Promise<Property> {
    const where: any = { id };
    if (user && user.role !== Role.ADMIN) {
      where.inmobiliariaId = user.inmobiliariaId;
    }

    const property = await this.propertyRepository.findOne({ where });

    if (!property) {
      throw new NotFoundException('Inmueble no encontrado');
    }

    return property;
  }

  async findByAddress(direccion: string, user: RequestUser): Promise<Property> {
    const where: any = { direccion: ILike(`%${direccion}%`) };
    if (user.role !== Role.ADMIN) {
      where.inmobiliariaId = user.inmobiliariaId;
    }

    const property = await this.propertyRepository.findOne({ where });

    if (!property) {
      throw new NotFoundException('Inmueble no encontrado con esa dirección');
    }

    return property;
  }

  async update(
    id: string,
    updatePropertyDto: UpdatePropertyDto,
    user: RequestUser,
    foto?: Express.Multer.File,
  ): Promise<Property> {
    const property = await this.findOne(id, user);

    try {
      if (foto) {
        if (property.fotoPublicId) {
          await this.cloudinaryService.deleteImage(property.fotoPublicId);
        }

        const uploaded = await this.cloudinaryService.uploadImage(
          foto.buffer,
          foto.originalname,
        );
        property.fotoUrl = uploaded.secureUrl;
        property.fotoPublicId = uploaded.publicId;
      }

      Object.assign(property, updatePropertyDto);
      return await this.propertyRepository.save(property);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe un inmueble con estos datos');
      }
      throw error;
    }
  }

  async activate(id: string, disponible: boolean, user: RequestUser): Promise<Property> {
    const property = await this.findOne(id, user);

    const activeContract = await this.contratoRepository.findOne({
      where: { inmuebleId: id, estado: ContratoEstado.ACTIVO },
    });

    if (activeContract) {
      if (disponible === true) {
        throw new ConflictException(
          'No se puede activar el inmueble porque tiene un contrato activo',
        );
      }
      if (disponible === false && !property.disponible) {
        throw new ConflictException(
          'El inmueble ya está desactivado debido a un contrato activo',
        );
      }
    }

    property.disponible = disponible;
    return await this.propertyRepository.save(property);
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const property = await this.findOne(id, user);
    await this.propertyRepository.remove(property);
  }
}
