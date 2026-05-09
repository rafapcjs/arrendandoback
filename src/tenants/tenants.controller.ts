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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Inquilinos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INMOBILIARIA)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear inquilino' })
  @ApiResponse({ status: 201, type: Tenant })
  @ApiResponse({ status: 409, description: 'Cédula o correo duplicado en la inmobiliaria' })
  create(
    @Body() createTenantDto: CreateTenantDto,
    @GetUser() user: any,
  ): Promise<Tenant> {
    return this.tenantsService.create(createTenantDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar inquilinos (INMOBILIARIA ve solo los suyos)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedTenantDto })
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser() user: any,
  ): Promise<PaginatedTenantDto> {
    return this.tenantsService.findAll(paginationDto, user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar inquilinos con filtros' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'ciudad', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedTenantDto })
  search(
    @Query() searchDto: SearchTenantDto & PaginationDto,
    @GetUser() user: any,
  ): Promise<PaginatedTenantDto> {
    return this.tenantsService.search(searchDto, user);
  }

  @Get('cedula/:cedula')
  @ApiOperation({ summary: 'Buscar inquilino por cédula' })
  @ApiParam({ name: 'cedula', description: 'Número de cédula' })
  @ApiResponse({ status: 200, type: Tenant })
  findByCedula(
    @Param('cedula') cedula: string,
    @GetUser() user: any,
  ): Promise<Tenant> {
    return this.tenantsService.findByCedula(cedula, user);
  }

  @Get('email/:correo')
  @ApiOperation({ summary: 'Buscar inquilino por correo' })
  @ApiParam({ name: 'correo', description: 'Correo electrónico' })
  @ApiResponse({ status: 200, type: Tenant })
  findByEmail(
    @Param('correo') correo: string,
    @GetUser() user: any,
  ): Promise<Tenant> {
    return this.tenantsService.findByEmail(correo, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener inquilino por ID' })
  @ApiParam({ name: 'id', description: 'UUID del inquilino' })
  @ApiResponse({ status: 200, type: Tenant })
  findOne(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<Tenant> {
    return this.tenantsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar inquilino' })
  @ApiParam({ name: 'id', description: 'UUID del inquilino' })
  @ApiResponse({ status: 200, type: Tenant })
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @GetUser() user: any,
  ): Promise<Tenant> {
    return this.tenantsService.update(id, updateTenantDto, user);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar/desactivar inquilino' })
  @ApiParam({ name: 'id', description: 'UUID del inquilino' })
  @ApiResponse({ status: 200, type: Tenant })
  activate(
    @Param('id') id: string,
    @Body() activateTenantDto: ActivateTenantDto,
    @GetUser() user: any,
  ): Promise<Tenant> {
    return this.tenantsService.activate(id, activateTenantDto.isActive, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar inquilino' })
  @ApiParam({ name: 'id', description: 'UUID del inquilino' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<void> {
    return this.tenantsService.remove(id, user);
  }
}
