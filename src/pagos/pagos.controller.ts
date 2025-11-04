import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { RegistrarAbonoDto } from './dto/registrar-abono.dto';
import { Pago, PagoEstado } from './entities/pago.entity';

@ApiTags('Pagos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo pago' })
  @ApiResponse({ status: 201, description: 'Pago creado exitosamente', type: Pago })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createPagoDto: CreatePagoDto): Promise<Pago> {
    return this.pagosService.crearPago(createPagoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los pagos con filtro opcional por estado' })
  @ApiResponse({ status: 200, description: 'Lista de pagos', type: [Pago] })
  findAll(@Query('estado', new ParseEnumPipe(PagoEstado, { optional: true })) estado?: PagoEstado): Promise<Pago[]> {
    if (estado) {
      return this.pagosService.findByEstado(estado);
    }
    return this.pagosService.findAll();
  }

  @Get('estado/:estado')
  @ApiOperation({ summary: 'Listar pagos por estado específico' })
  @ApiParam({ 
    name: 'estado', 
    description: 'Estado del pago',
    enum: PagoEstado
  })
  @ApiResponse({ status: 200, description: 'Lista de pagos filtrados por estado', type: [Pago] })
  findByEstado(@Param('estado', new ParseEnumPipe(PagoEstado)) estado: PagoEstado): Promise<Pago[]> {
    return this.pagosService.findByEstado(estado);
  }

  @Get('contrato/:contratoId')
  @ApiOperation({ summary: 'Listar pagos por contrato' })
  @ApiParam({ name: 'contratoId', description: 'ID del contrato' })
  @ApiResponse({ status: 200, description: 'Lista de pagos del contrato', type: [Pago] })
  findByContrato(@Param('contratoId', ParseUUIDPipe) contratoId: string): Promise<Pago[]> {
    return this.pagosService.findByContrato(contratoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un pago por ID' })
  @ApiParam({ name: 'id', description: 'ID del pago' })
  @ApiResponse({ status: 200, description: 'Pago encontrado', type: Pago })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Pago> {
    return this.pagosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un pago' })
  @ApiParam({ name: 'id', description: 'ID del pago' })
  @ApiResponse({ status: 200, description: 'Pago actualizado', type: Pago })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePagoDto: UpdatePagoDto,
  ): Promise<Pago> {
    return this.pagosService.update(id, updatePagoDto);
  }

  @Patch(':id/abono')
  @ApiOperation({ summary: 'Registrar abono a un pago' })
  @ApiParam({ name: 'id', description: 'ID del pago' })
  @ApiResponse({ status: 200, description: 'Abono registrado exitosamente', type: Pago })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  registrarAbono(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() registrarAbonoDto: RegistrarAbonoDto,
  ): Promise<Pago> {
    return this.pagosService.registrarAbono(id, registrarAbonoDto);
  }
}
