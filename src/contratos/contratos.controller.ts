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
import { PaginatedContratoDto } from './dto/paginated-contrato.dto';
import { Contrato } from './entities/contrato.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Contratos')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('contratos')
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
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementos por página (default: 10)',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    description: 'Filtrar por estado del contrato',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de contratos obtenida exitosamente',
    type: PaginatedContratoDto,
  })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('estado') estado?: string,
  ): Promise<PaginatedContratoDto> {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    return this.contratosService.findAllSimple(pageNum, limitNum, estado);
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
  getContractsExpiringSoon(@Param('days') days: number): Promise<Contrato[]> {
    return this.contratosService.getContractsExpiringSoon(days);
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
