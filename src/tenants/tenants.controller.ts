import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { SearchTenantDto } from './dto/search-tenant.dto';
import { ActivateTenantDto } from './dto/activate-tenant.dto';
import { PaginatedTenantDto } from './dto/paginated-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('inquilinos')
@ApiBearerAuth('JWT-auth')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear un nuevo inquilino (Solo ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'Inquilino creado exitosamente',
    type: Tenant,
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un inquilino con esta cédula o correo',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  create(@Body() createTenantDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los inquilinos con paginación' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página (default: 10, max: 100)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de inquilinos obtenida exitosamente',
    type: PaginatedTenantDto,
  })
  findAll(@Query() paginationDto: PaginationDto): Promise<PaginatedTenantDto> {
    return this.tenantsService.findAll(paginationDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar inquilinos con filtros' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por nombres, apellidos o cédula' })
  @ApiQuery({ name: 'ciudad', required: false, type: String, description: 'Filtrar por ciudad' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filtrar por estado activo' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Resultados de búsqueda obtenidos exitosamente',
    type: PaginatedTenantDto,
  })
  search(@Query() searchDto: SearchTenantDto & PaginationDto): Promise<PaginatedTenantDto> {
    return this.tenantsService.search(searchDto);
  }

  @Get('cedula/:cedula')
  @ApiOperation({ summary: 'Buscar inquilino por cédula' })
  @ApiParam({ name: 'cedula', description: 'Número de cédula del inquilino' })
  @ApiResponse({
    status: 200,
    description: 'Inquilino encontrado exitosamente',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Inquilino no encontrado',
  })
  findByCedula(@Param('cedula') cedula: string): Promise<Tenant> {
    return this.tenantsService.findByCedula(cedula);
  }

  @Get('email/:correo')
  @ApiOperation({ summary: 'Buscar inquilino por correo' })
  @ApiParam({ name: 'correo', description: 'Correo electrónico del inquilino' })
  @ApiResponse({
    status: 200,
    description: 'Inquilino encontrado exitosamente',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Inquilino no encontrado',
  })
  findByEmail(@Param('correo') correo: string): Promise<Tenant> {
    return this.tenantsService.findByEmail(correo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener inquilino por ID' })
  @ApiParam({ name: 'id', description: 'UUID del inquilino' })
  @ApiResponse({
    status: 200,
    description: 'Inquilino obtenido exitosamente',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Inquilino no encontrado',
  })
  findOne(@Param('id') id: string): Promise<Tenant> {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar inquilino por ID (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del inquilino' })
  @ApiResponse({
    status: 200,
    description: 'Inquilino actualizado exitosamente',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Inquilino no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un inquilino con esta cédula o correo',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<Tenant> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Patch(':id/activate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activar/desactivar inquilino (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del inquilino' })
  @ApiResponse({
    status: 200,
    description: 'Estado del inquilino actualizado exitosamente',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Inquilino no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  activate(
    @Param('id') id: string,
    @Body() activateTenantDto: ActivateTenantDto,
  ): Promise<Tenant> {
    return this.tenantsService.activate(id, activateTenantDto.isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar inquilino por ID (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del inquilino' })
  @ApiResponse({
    status: 204,
    description: 'Inquilino eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Inquilino no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }
}