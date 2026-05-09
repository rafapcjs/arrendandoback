import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { Role } from '../common/enums/roles.enum';

interface RequestUser {
  id: string;
  role: string;
  inmobiliariaId?: string | null;
}

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

  private tenantFilter(user: RequestUser) {
    if (user.role === Role.ADMIN) return {};
    if (!user.inmobiliariaId) return { id: 'no-access' };
    return { inmobiliariaId: user.inmobiliariaId };
  }

  async create(createContratoDto: CreateContratoDto, user: RequestUser): Promise<Contrato> {
    const { inquilinoId, inmuebleId, fechaInicio, fechaFin, estado } =
      createContratoDto;

    const inmobiliariaId =
      user.role === Role.INMOBILIARIA ? user.inmobiliariaId : createContratoDto.inmobiliariaId;

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
    const contrato = this.contratoRepository.create({
      ...createContratoDto,
      inmobiliariaId: inmobiliariaId ?? undefined,
      creadoPorId: user.id,
    });
    const savedContrato = await this.contratoRepository.save(contrato);

    // If contract is being set to ACTIVO, mark property and tenant as not available and generate monthly payments
    if (estado === ContratoEstado.ACTIVO) {
      await this.propertyRepository.update(inmuebleId, { disponible: false });
      await this.tenantRepository.update(inquilinoId, { disponible: false });

      // Generate monthly payments for the contract duration
      const mesesDuracion = this.calcularMesesDuracion(
        new Date(fechaInicio),
        new Date(fechaFin),
      );
      await this.pagosService.crearPagosMensuales(
        savedContrato.id,
        mesesDuracion,
      );
    }

    return this.findOne(savedContrato.id);
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
    user?: RequestUser,
  ): Promise<PaginatedContratoDto> {
    const queryBuilder = this.contratoRepository
      .createQueryBuilder('contrato')
      .leftJoinAndSelect('contrato.inquilino', 'inquilino')
      .leftJoinAndSelect('contrato.inmueble', 'inmueble');

    if (user && user.role !== Role.ADMIN) {
      queryBuilder.andWhere('contrato.inmobiliariaId = :inmobiliariaId', {
        inmobiliariaId: user.inmobiliariaId,
      });
    }

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

  async findOne(id: string, user?: RequestUser): Promise<Contrato> {
    const contrato = await this.contratoRepository.findOne({
      where: { id },
      relations: ['inquilino', 'inmueble'],
    });

    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }

    if (user && user.role !== Role.ADMIN && contrato.inmobiliariaId !== user.inmobiliariaId) {
      throw new ForbiddenException('No tienes acceso a este contrato');
    }

    return contrato;
  }

  async update(
    id: string,
    updateContratoDto: UpdateContratoDto,
    user?: RequestUser,
  ): Promise<Contrato> {
    const contrato = await this.findOne(id, user);

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
    const fechasChanged =
      updateContratoDto.fechaInicio || updateContratoDto.fechaFin;
    const estadoChanged =
      updateContratoDto.estado && updateContratoDto.estado !== contrato.estado;

    if (estadoChanged) {
      const propertyId = updateContratoDto.inmuebleId || contrato.inmuebleId;

      // If changing to ACTIVO, mark property and tenant as not available and generate payments
      if (updateContratoDto.estado === ContratoEstado.ACTIVO) {
        const tenantId = updateContratoDto.inquilinoId || contrato.inquilinoId;
        await this.propertyRepository.update(propertyId, { disponible: false });
        await this.tenantRepository.update(tenantId, { disponible: false });

        // Generate payments for the contract duration
        const fechaInicio = new Date(
          updateContratoDto.fechaInicio || contrato.fechaInicio,
        );
        const fechaFin = new Date(
          updateContratoDto.fechaFin || contrato.fechaFin,
        );
        const mesesDuracion = this.calcularMesesDuracion(fechaInicio, fechaFin);
        await this.pagosService.crearPagosMensuales(id, mesesDuracion);
      }

      // If changing from ACTIVO to another state, mark property and tenant as available
      if (
        contrato.estado === ContratoEstado.ACTIVO &&
        updateContratoDto.estado !== ContratoEstado.ACTIVO
      ) {
        await this.propertyRepository.update(propertyId, { disponible: true });
        await this.tenantRepository.update(contrato.inquilinoId, {
          disponible: true,
        });

        // Al finalizar/cambiar estado desde ACTIVO, eliminar pagos pendientes asociados
        await this.pagosService.removePendingByContrato(id);
      }
    }

    // If dates changed and contract is ACTIVO, regenerate payments
    if (
      fechasChanged &&
      (contrato.estado === ContratoEstado.ACTIVO ||
        updateContratoDto.estado === ContratoEstado.ACTIVO)
    ) {
      const fechaInicio = new Date(
        updateContratoDto.fechaInicio || contrato.fechaInicio,
      );
      const fechaFin = new Date(
        updateContratoDto.fechaFin || contrato.fechaFin,
      );
      const mesesDuracion = this.calcularMesesDuracion(fechaInicio, fechaFin);
      await this.pagosService.crearPagosMensuales(id, mesesDuracion);
    }

    // Update contract
    await this.contratoRepository.update(id, updateContratoDto);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const contrato = await this.findOne(id);
    // Si el contrato está ACTIVO, primero lo finalizamos para
    // generar la limpieza de pagos pendientes y liberar recursos.
    if (contrato.estado === ContratoEstado.ACTIVO) {
      await this.finalizarContrato(id);
    }

    // Eliminar pagos pendientes asociados al contrato (no se tocan pagados ni vencidos)
    await this.pagosService.removePendingByContrato(id);

    // Asegurar que la propiedad y el inquilino queden disponibles
    await this.propertyRepository.update(contrato.inmuebleId, {
      disponible: true,
    });
    await this.tenantRepository.update(contrato.inquilinoId, {
      disponible: true,
    });

    // Mantener registro histórico: marcar contrato como VENCIDO
    await this.contratoRepository.update(id, {
      estado: ContratoEstado.VENCIDO,
    });
  }

  async finalizarContrato(id: string): Promise<Contrato> {
    const contrato = await this.findOne(id);

    // Only allow finalization of ACTIVO or PROXIMO_VENCER contracts
    if (
      contrato.estado !== ContratoEstado.ACTIVO &&
      contrato.estado !== ContratoEstado.PROXIMO_VENCER
    ) {
      throw new BadRequestException(
        'Solo se pueden finalizar contratos activos o próximos a vencer',
      );
    }

  // Eliminar pagos pendientes asociados al contrato (no se tocan pagados ni vencidos)
  await this.pagosService.removePendingByContrato(id);

    // Update contract status to FINALIZADO
    await this.contratoRepository.update(id, {
      estado: ContratoEstado.FINALIZADO,
    });

    // Make property and tenant available again
    await this.propertyRepository.update(contrato.inmuebleId, {
      disponible: true,
    });
    await this.tenantRepository.update(contrato.inquilinoId, {
      disponible: true,
    });

    return this.findOne(id);
  }

  

  async marcarComoVencido(id: string): Promise<Contrato> {
    const contrato = await this.findOne(id);

    // Only allow marking as expired if contract end date has passed
    const today = new Date();
    const fechaFin = new Date(contrato.fechaFin);

    if (fechaFin > today) {
      throw new BadRequestException(
        'No se puede marcar como vencido un contrato que aún no ha llegado a su fecha de fin',
      );
    }

    // Don't update status if already finalized
    if (contrato.estado === ContratoEstado.FINALIZADO) {
      throw new BadRequestException(
        'No se puede cambiar el estado de un contrato finalizado',
      );
    }

    // Update contract status to VENCIDO but keep it in the system
    await this.contratoRepository.update(id, {
      estado: ContratoEstado.VENCIDO,
    });

    // When contract expires, make property and tenant available again
    await this.propertyRepository.update(contrato.inmuebleId, {
      disponible: true,
    });
    await this.tenantRepository.update(contrato.inquilinoId, {
      disponible: true,
    });

    return this.findOne(id);
  }

  async getActiveContracts(user?: RequestUser): Promise<Contrato[]> {
    const where: any = { estado: ContratoEstado.ACTIVO };
    if (user && user.role !== Role.ADMIN) {
      where.inmobiliariaId = user.inmobiliariaId || 'no-access';
    }
    return this.contratoRepository.find({
      where,
      relations: ['inquilino', 'inmueble'],
    });
  }

  async getContractsExpiringSoon(days: number = 30, user?: RequestUser): Promise<Contrato[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const where: any = {
      estado: ContratoEstado.ACTIVO,
      fechaFin: Between(today, futureDate),
    };
    if (user && user.role !== Role.ADMIN) {
      where.inmobiliariaId = user.inmobiliariaId || 'no-access';
    }

    return this.contratoRepository.find({
      where,
      relations: ['inquilino', 'inmueble'],
    });
  }

  async findAllSimple(
    page: number = 1,
    limit: number = 10,
    estado?: string,
    user?: RequestUser,
  ): Promise<PaginatedContratoDto> {
    const queryBuilder = this.contratoRepository
      .createQueryBuilder('contrato')
      .leftJoinAndSelect('contrato.inquilino', 'inquilino')
      .leftJoinAndSelect('contrato.inmueble', 'inmueble');

    if (user && user.role !== Role.ADMIN) {
      queryBuilder.andWhere('contrato.inmobiliariaId = :inmobiliariaId', {
        inmobiliariaId: user.inmobiliariaId,
      });
    }

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
