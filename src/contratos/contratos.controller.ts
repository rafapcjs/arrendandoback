import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ContratosService } from './contratos.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { SearchContratoDto } from './dto/search-contrato.dto';
import { PaginatedContratoDto } from './dto/paginated-contrato.dto';
import { Contrato } from './entities/contrato.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Contratos')
@Controller('contratos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo contrato' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contrato creado exitosamente',
    type: Contrato,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inquilino o inmueble no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El inmueble no está disponible',
  })
  create(@Body() createContratoDto: CreateContratoDto): Promise<Contrato> {
    return this.contratosService.create(createContratoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista paginada de contratos' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'inquilinoId', required: false, description: 'Filtrar por inquilino' })
  @ApiQuery({ name: 'inmuebleId', required: false, description: 'Filtrar por inmueble' })
  @ApiQuery({ name: 'fechaInicioDesde', required: false, description: 'Filtrar fecha inicio desde' })
  @ApiQuery({ name: 'fechaInicioHasta', required: false, description: 'Filtrar fecha inicio hasta' })
  @ApiQuery({ name: 'fechaFinDesde', required: false, description: 'Filtrar fecha fin desde' })
  @ApiQuery({ name: 'fechaFinHasta', required: false, description: 'Filtrar fecha fin hasta' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de contratos obtenida exitosamente',
    type: PaginatedContratoDto,
  })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query() searchDto: SearchContratoDto,
  ): Promise<PaginatedContratoDto> {
    const { page, limit } = paginationDto;
    return this.contratosService.findAll(page, limit, searchDto);
  }

  @Get('activos')
  @ApiOperation({ summary: 'Obtener todos los contratos activos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de contratos activos',
    type: [Contrato],
  })
  getActiveContracts(): Promise<Contrato[]> {
    return this.contratosService.getActiveContracts();
  }

  @Get('proximos-vencer/:days')
  @ApiOperation({ summary: 'Obtener contratos próximos a vencer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de contratos próximos a vencer',
    type: [Contrato],
  })
  getContractsExpiringSoon(
    @Param('days') days: number,
  ): Promise<Contrato[]> {
    return this.contratosService.getContractsExpiringSoon(days);
  }

  @Get('por-inquilino/:inquilinoId')
  @ApiOperation({ summary: 'Obtener contratos por inquilino' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de contratos del inquilino',
    type: [Contrato],
  })
  findByTenant(
    @Param('inquilinoId', ParseUUIDPipe) inquilinoId: string,
  ): Promise<Contrato[]> {
    return this.contratosService.findByTenant(inquilinoId);
  }

  @Get('por-inmueble/:inmuebleId')
  @ApiOperation({ summary: 'Obtener contratos por inmueble' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de contratos del inmueble',
    type: [Contrato],
  })
  findByProperty(
    @Param('inmuebleId', ParseUUIDPipe) inmuebleId: string,
  ): Promise<Contrato[]> {
    return this.contratosService.findByProperty(inmuebleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un contrato por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contrato encontrado',
    type: Contrato,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contrato no encontrado',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Contrato> {
    return this.contratosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un contrato' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contrato actualizado exitosamente',
    type: Contrato,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contrato no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContratoDto: UpdateContratoDto,
  ): Promise<Contrato> {
    return this.contratosService.update(id, updateContratoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un contrato' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contrato eliminado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contrato no encontrado',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.contratosService.remove(id);
  }
}