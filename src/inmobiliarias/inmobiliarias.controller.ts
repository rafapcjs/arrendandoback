import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InmobiliariasService } from './inmobiliarias.service';
import { CreateInmobiliariaDto } from './dto/create-inmobiliaria.dto';
import { UpdateInmobiliariaDto } from './dto/update-inmobiliaria.dto';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Inmobiliarias')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inmobiliarias')
export class InmobiliariasController {
  constructor(private readonly inmobiliariasService: InmobiliariasService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear inmobiliaria (Solo ADMIN)' })
  @ApiResponse({ status: 201, description: 'Inmobiliaria creada', type: Inmobiliaria })
  @ApiResponse({ status: 409, description: 'NIT o email ya registrado' })
  create(
    @Body() dto: CreateInmobiliariaDto,
    @GetUser() user: any,
  ): Promise<Inmobiliaria> {
    return this.inmobiliariasService.create(dto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todas las inmobiliarias (Solo ADMIN)' })
  @ApiResponse({ status: 200, type: [Inmobiliaria] })
  findAll(): Promise<Inmobiliaria[]> {
    return this.inmobiliariasService.findAll();
  }

  @Get('disponibles')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Inmobiliarias activas sin usuario asignado (para crear usuario)' })
  @ApiResponse({ status: 200, type: [Inmobiliaria] })
  findDisponibles(): Promise<Inmobiliaria[]> {
    return this.inmobiliariasService.findDisponibles();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.INMOBILIARIA)
  @ApiOperation({ summary: 'Obtener inmobiliaria por ID' })
  @ApiResponse({ status: 200, type: Inmobiliaria })
  @ApiResponse({ status: 404, description: 'Inmobiliaria no encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: any,
  ): Promise<Inmobiliaria> {
    return this.inmobiliariasService.findOneForUser(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar inmobiliaria (Solo ADMIN)' })
  @ApiResponse({ status: 200, type: Inmobiliaria })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInmobiliariaDto,
  ): Promise<Inmobiliaria> {
    return this.inmobiliariasService.update(id, dto);
  }

  @Patch(':id/toggle-estado')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar inmobiliaria (Solo ADMIN)' })
  @ApiResponse({ status: 200, type: Inmobiliaria })
  toggleEstado(@Param('id', ParseUUIDPipe) id: string): Promise<Inmobiliaria> {
    return this.inmobiliariasService.toggleEstado(id);
  }
}
