import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Contrato, ContratoEstado } from './entities/contrato.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Property } from '../properties/entities/property.entity';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { SearchContratoDto } from './dto/search-contrato.dto';
import { PaginatedContratoDto } from './dto/paginated-contrato.dto';
import { PagosService } from '../pagos/pagos.service';

@Injectable()
export class ContratosService {
  constructor(
    @InjectRepository(Contrato)
    private contratoRepository: Repository<Contrato>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @Inject(forwardRef(() => PagosService))
    private pagosService: PagosService,
  ) {}

  async create(createContratoDto: CreateContratoDto): Promise<Contrato> {
    const { inquilinoId, inmuebleId, fechaInicio, fechaFin, estado } =
      createContratoDto;

    // Validate tenant exists and is active
    const tenant = await this.tenantRepository.findOne({
      where: { id: inquilinoId, isActive: true },
    });
    if (!tenant) {
      throw new NotFoundException('Inquilino no encontrado o inactivo');
    }

    // Validate property exists
    const property = await this.propertyRepository.findOne({
      where: { id: inmuebleId },
    });
    if (!property) {
      throw new NotFoundException('Inmueble no encontrado');
    }

    // Business rule: Property must be available
    if (!property.disponible) {
      throw new ConflictException(
        'El inmueble no está disponible para arrendar',
      );
    }

    // Validate dates
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);

    if (startDate >= endDate) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    // Check if property has active contracts in the same period
    const existingContract = await this.contratoRepository.findOne({
      where: {
        inmuebleId,
        estado: ContratoEstado.ACTIVO,
      },
    });

    if (existingContract) {
      throw new ConflictException('El inmueble ya tiene un contrato activo');
    }

    // Create contract
    const contrato = this.contratoRepository.create(createContratoDto);
    const savedContrato = await this.contratoRepository.save(contrato);

    // If contract is being set to ACTIVO, mark property and tenant as not available and generate monthly payments
    if (estado === ContratoEstado.ACTIVO) {
      await this.propertyRepository.update(inmuebleId, { disponible: false });
      await this.tenantRepository.update(inquilinoId, { disponible: false });
      
      // Generate monthly payments for the contract duration
      const mesesDuracion = this.calcularMesesDuracion(new Date(fechaInicio), new Date(fechaFin));
      await this.pagosService.crearPagosMensuales(savedContrato.id, mesesDuracion);
    }

    return savedContrato;
  }

  private calcularMesesDuracion(fechaInicio: Date, fechaFin: Date): number {
    // Calcular la diferencia en meses entre fechaInicio y fechaFin
    const añoInicio = fechaInicio.getFullYear();
    const mesInicio = fechaInicio.getMonth(); // 0-11
    const diaInicio = fechaInicio.getDate();
    
    const añoFin = fechaFin.getFullYear();
    const mesFin = fechaFin.getMonth(); // 0-11
    const diaFin = fechaFin.getDate();
    
    // Calcular diferencia total en meses
    let mesesDiferencia = (añoFin - añoInicio) * 12 + (mesFin - mesInicio);
    
    // Si el día de fin es mayor o igual al día de inicio, contar ese mes completo
    // Ejemplo: 2025-01-01 a 2025-06-30 = 6 meses (enero, febrero, marzo, abril, mayo, junio)
    if (diaFin >= diaInicio) {
      mesesDiferencia += 1;
    }
    
    // Asegurar que sea al menos 1 mes si las fechas son válidas
    return Math.max(1, mesesDiferencia);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    searchDto?: SearchContratoDto,
  ): Promise<PaginatedContratoDto> {
    const queryBuilder = this.contratoRepository
      .createQueryBuilder('contrato')
      .leftJoinAndSelect('contrato.inquilino', 'inquilino')
      .leftJoinAndSelect('contrato.inmueble', 'inmueble');

    // Apply filters
    if (searchDto) {
      if (searchDto.estado) {
        queryBuilder.andWhere('contrato.estado = :estado', {
          estado: searchDto.estado,
        });
      }

      if (searchDto.inquilinoId) {
        queryBuilder.andWhere('contrato.inquilinoId = :inquilinoId', {
          inquilinoId: searchDto.inquilinoId,
        });
      }

      if (searchDto.inmuebleId) {
        queryBuilder.andWhere('contrato.inmuebleId = :inmuebleId', {
          inmuebleId: searchDto.inmuebleId,
        });
      }

      if (searchDto.fechaInicioDesde && searchDto.fechaInicioHasta) {
        queryBuilder.andWhere(
          'contrato.fechaInicio BETWEEN :fechaInicioDesde AND :fechaInicioHasta',
          {
            fechaInicioDesde: searchDto.fechaInicioDesde,
            fechaInicioHasta: searchDto.fechaInicioHasta,
          },
        );
      }

      if (searchDto.fechaFinDesde && searchDto.fechaFinHasta) {
        queryBuilder.andWhere(
          'contrato.fechaFin BETWEEN :fechaFinDesde AND :fechaFinHasta',
          {
            fechaFinDesde: searchDto.fechaFinDesde,
            fechaFinHasta: searchDto.fechaFinHasta,
          },
        );
      }
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by creation date
    queryBuilder.orderBy('contrato.createdAt', 'DESC');

    const [contratos, total] = await queryBuilder.getManyAndCount();

    return {
      data: contratos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Contrato> {
    const contrato = await this.contratoRepository.findOne({
      where: { id },
      relations: ['inquilino', 'inmueble'],
    });

    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }

    return contrato;
  }

  async update(
    id: string,
    updateContratoDto: UpdateContratoDto,
  ): Promise<Contrato> {
    const contrato = await this.findOne(id);

    // If changing property, validate it exists and is available
    if (
      updateContratoDto.inmuebleId &&
      updateContratoDto.inmuebleId !== contrato.inmuebleId
    ) {
      const newProperty = await this.propertyRepository.findOne({
        where: { id: updateContratoDto.inmuebleId },
      });

      if (!newProperty) {
        throw new NotFoundException('Nuevo inmueble no encontrado');
      }

      if (!newProperty.disponible) {
        throw new ConflictException('El nuevo inmueble no está disponible');
      }

      // Make old property available again if contract was active
      if (contrato.estado === ContratoEstado.ACTIVO) {
        await this.propertyRepository.update(contrato.inmuebleId, {
          disponible: true,
        });
      }
    }

    // If changing tenant, validate it exists and is active
    if (
      updateContratoDto.inquilinoId &&
      updateContratoDto.inquilinoId !== contrato.inquilinoId
    ) {
      const newTenant = await this.tenantRepository.findOne({
        where: { id: updateContratoDto.inquilinoId, isActive: true },
      });

      if (!newTenant) {
        throw new NotFoundException('Nuevo inquilino no encontrado o inactivo');
      }
    }

    // Validate dates if provided
    if (updateContratoDto.fechaInicio || updateContratoDto.fechaFin) {
      const startDate = new Date(
        updateContratoDto.fechaInicio || contrato.fechaInicio,
      );
      const endDate = new Date(updateContratoDto.fechaFin || contrato.fechaFin);

      if (startDate >= endDate) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        );
      }
    }

    // Handle state changes and date changes
    const fechasChanged = updateContratoDto.fechaInicio || updateContratoDto.fechaFin;
    const estadoChanged = updateContratoDto.estado && updateContratoDto.estado !== contrato.estado;
    
    if (estadoChanged) {
      const propertyId = updateContratoDto.inmuebleId || contrato.inmuebleId;

      // If changing to ACTIVO, mark property and tenant as not available and generate payments
      if (updateContratoDto.estado === ContratoEstado.ACTIVO) {
        const tenantId = updateContratoDto.inquilinoId || contrato.inquilinoId;
        await this.propertyRepository.update(propertyId, { disponible: false });
        await this.tenantRepository.update(tenantId, { disponible: false });
        
        // Generate payments for the contract duration
        const fechaInicio = new Date(updateContratoDto.fechaInicio || contrato.fechaInicio);
        const fechaFin = new Date(updateContratoDto.fechaFin || contrato.fechaFin);
        const mesesDuracion = this.calcularMesesDuracion(fechaInicio, fechaFin);
        await this.pagosService.crearPagosMensuales(id, mesesDuracion);
      }

      // If changing from ACTIVO to another state, mark property and tenant as available
      if (
        contrato.estado === ContratoEstado.ACTIVO &&
        updateContratoDto.estado !== ContratoEstado.ACTIVO
      ) {
        await this.propertyRepository.update(propertyId, { disponible: true });
        await this.tenantRepository.update(contrato.inquilinoId, { disponible: true });
      }
    }
    
    // If dates changed and contract is ACTIVO, regenerate payments
    if (fechasChanged && (contrato.estado === ContratoEstado.ACTIVO || updateContratoDto.estado === ContratoEstado.ACTIVO)) {
      const fechaInicio = new Date(updateContratoDto.fechaInicio || contrato.fechaInicio);
      const fechaFin = new Date(updateContratoDto.fechaFin || contrato.fechaFin);
      const mesesDuracion = this.calcularMesesDuracion(fechaInicio, fechaFin);
      await this.pagosService.crearPagosMensuales(id, mesesDuracion);
    }

    // Update contract
    await this.contratoRepository.update(id, updateContratoDto);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const contrato = await this.findOne(id);

    // Only allow deletion if contract is not ACTIVO
    if (contrato.estado === ContratoEstado.ACTIVO) {
      throw new BadRequestException(
        'No se puede eliminar un contrato activo. Debe finalizar o cambiar el estado del contrato primero.'
      );
    }

    // Make property and tenant available again when deleting the contract
    await this.propertyRepository.update(contrato.inmuebleId, {
      disponible: true,
    });
    await this.tenantRepository.update(contrato.inquilinoId, {
      disponible: true,
    });

    await this.contratoRepository.delete(id);
  }

  async getActiveContracts(): Promise<Contrato[]> {
    return this.contratoRepository.find({
      where: { estado: ContratoEstado.ACTIVO },
      relations: ['inquilino', 'inmueble'],
    });
  }

  async getContractsExpiringSoon(days: number = 30): Promise<Contrato[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.contratoRepository.find({
      where: {
        estado: ContratoEstado.ACTIVO,
        fechaFin: Between(today, futureDate),
      },
      relations: ['inquilino', 'inmueble'],
    });
  }

  async findAllSimple(
    page: number = 1,
    limit: number = 10,
    estado?: string,
  ): Promise<PaginatedContratoDto> {
    const queryBuilder = this.contratoRepository
      .createQueryBuilder('contrato')
      .leftJoinAndSelect('contrato.inquilino', 'inquilino')
      .leftJoinAndSelect('contrato.inmueble', 'inmueble');

    // Apply estado filter if provided
    if (estado) {
      queryBuilder.andWhere('contrato.estado = :estado', { estado });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by creation date
    queryBuilder.orderBy('contrato.createdAt', 'DESC');

    const [contratos, total] = await queryBuilder.getManyAndCount();

    return {
      data: contratos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
