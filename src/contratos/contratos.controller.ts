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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Contratos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INMOBILIARIA)
@Controller('contratos')
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear contrato' })
  @ApiResponse({ status: HttpStatus.CREATED, type: Contrato })
  create(
    @Body() createContratoDto: CreateContratoDto,
    @GetUser() user: any,
  ): Promise<Contrato> {
    return this.contratosService.create(createContratoDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contratos (INMOBILIARIA ve solo los suyos)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedContratoDto })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('estado') estado?: string,
    @GetUser() user?: any,
  ): Promise<PaginatedContratoDto> {
    return this.contratosService.findAllSimple(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      estado,
      user,
    );
  }

  @Get('activos')
  @ApiOperation({ summary: 'Contratos activos' })
  @ApiResponse({ status: HttpStatus.OK, type: [Contrato] })
  getActiveContracts(@GetUser() user: any): Promise<Contrato[]> {
    return this.contratosService.getActiveContracts(user);
  }

  @Get('proximos-vencer/:days')
  @ApiOperation({ summary: 'Contratos próximos a vencer' })
  @ApiResponse({ status: HttpStatus.OK, type: [Contrato] })
  getContractsExpiringSoon(
    @Param('days') days: number,
    @GetUser() user: any,
  ): Promise<Contrato[]> {
    return this.contratosService.getContractsExpiringSoon(days, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener contrato por ID' })
  @ApiResponse({ status: HttpStatus.OK, type: Contrato })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Contrato> {
    return this.contratosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar contrato' })
  @ApiResponse({ status: HttpStatus.OK, type: Contrato })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContratoDto: UpdateContratoDto,
  ): Promise<Contrato> {
    return this.contratosService.update(id, updateContratoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar contrato (marca como VENCIDO)' })
  @ApiResponse({ status: HttpStatus.OK })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.contratosService.remove(id);
  }

  @Patch(':id/finalizar')
  @ApiOperation({ summary: 'Finalizar contrato' })
  @ApiResponse({ status: HttpStatus.OK, type: Contrato })
  finalizarContrato(@Param('id', ParseUUIDPipe) id: string): Promise<Contrato> {
    return this.contratosService.finalizarContrato(id);
  }

  @Patch(':id/marcar-vencido')
  @ApiOperation({ summary: 'Marcar contrato como vencido' })
  @ApiResponse({ status: HttpStatus.OK, type: Contrato })
  marcarComoVencido(@Param('id', ParseUUIDPipe) id: string): Promise<Contrato> {
    return this.contratosService.marcarComoVencido(id);
  }
}
