import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { PropietariosService } from './propietarios.service';
import { CreatePropietarioDto } from './dto/create-propietario.dto';
import { UpdatePropietarioDto } from './dto/update-propietario.dto';
import { Propietario } from './entities/propietario.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Propietarios')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INMOBILIARIA)
@Controller('propietarios')
export class PropietariosController {
  constructor(private readonly propietariosService: PropietariosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear propietario' })
  @ApiResponse({ status: 201, type: Propietario })
  create(
    @Body() dto: CreatePropietarioDto,
    @GetUser() user: any,
  ): Promise<Propietario> {
    return this.propietariosService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar propietarios (INMOBILIARIA ve solo los suyos)' })
  @ApiResponse({ status: 200, type: [Propietario] })
  findAll(@GetUser() user: any): Promise<Propietario[]> {
    return this.propietariosService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener propietario por ID' })
  @ApiResponse({ status: 200, type: Propietario })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: any,
  ): Promise<Propietario> {
    return this.propietariosService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar propietario' })
  @ApiResponse({ status: 200, type: Propietario })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropietarioDto,
    @GetUser() user: any,
  ): Promise<Propietario> {
    return this.propietariosService.update(id, dto, user);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar/desactivar propietario' })
  @ApiResponse({ status: 200, type: Propietario })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @GetUser() user: any,
  ): Promise<Propietario> {
    return this.propietariosService.activate(id, isActive, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar propietario' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: any,
  ): Promise<void> {
    return this.propietariosService.remove(id, user);
  }
}
