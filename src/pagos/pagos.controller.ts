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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/roles.enum';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { RegistrarAbonoDto } from './dto/registrar-abono.dto';
import { Pago, PagoEstado } from './entities/pago.entity';

@ApiTags('Pagos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INMOBILIARIA)
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear pago' })
  @ApiResponse({ status: 201, type: Pago })
  create(
    @Body() createPagoDto: CreatePagoDto,
    @GetUser() user: any,
  ): Promise<Pago> {
    return this.pagosService.crearPago(createPagoDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pagos (INMOBILIARIA ve solo los suyos)' })
  @ApiResponse({ status: 200, type: [Pago] })
  findAll(
    @Query('estado', new ParseEnumPipe(PagoEstado, { optional: true })) estado?: PagoEstado,
    @GetUser() user?: any,
  ): Promise<Pago[]> {
    if (estado) {
      return this.pagosService.findByEstado(estado, user);
    }
    return this.pagosService.findAll(user);
  }

  @Get('estado/:estado')
  @ApiOperation({ summary: 'Listar pagos por estado' })
  @ApiParam({ name: 'estado', enum: PagoEstado })
  @ApiResponse({ status: 200, type: [Pago] })
  findByEstado(
    @Param('estado', new ParseEnumPipe(PagoEstado)) estado: PagoEstado,
    @GetUser() user: any,
  ): Promise<Pago[]> {
    return this.pagosService.findByEstado(estado, user);
  }

  @Get('contrato/:contratoId')
  @ApiOperation({ summary: 'Listar pagos por contrato' })
  @ApiParam({ name: 'contratoId' })
  @ApiResponse({ status: 200, type: [Pago] })
  findByContrato(@Param('contratoId', ParseUUIDPipe) contratoId: string): Promise<Pago[]> {
    return this.pagosService.findByContrato(contratoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pago por ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: Pago })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Pago> {
    return this.pagosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar pago' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: Pago })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePagoDto: UpdatePagoDto,
  ): Promise<Pago> {
    return this.pagosService.update(id, updatePagoDto);
  }

  @Patch(':id/abono')
  @ApiOperation({ summary: 'Registrar abono a un pago' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: Pago })
  registrarAbono(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() registrarAbonoDto: RegistrarAbonoDto,
  ): Promise<Pago> {
    return this.pagosService.registrarAbono(id, registrarAbonoDto);
  }
}
