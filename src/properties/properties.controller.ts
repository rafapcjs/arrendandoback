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
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { ActivatePropertyDto } from './dto/activate-property.dto';
import { PaginatedPropertyDto } from './dto/paginated-property.dto';
import { Property } from './entities/property.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Gestión de Inmuebles')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo inmueble (Solo ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'Inmueble creado exitosamente',
    type: Property,
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un inmueble con estos datos',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  create(@Body() createPropertyDto: CreatePropertyDto): Promise<Property> {
    return this.propertiesService.create(createPropertyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los inmuebles con paginación (Solo ADMIN)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página (default: 10, max: 100)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de inmuebles obtenida exitosamente',
    type: PaginatedPropertyDto,
  })
  findAll(@Query() paginationDto: PaginationDto): Promise<PaginatedPropertyDto> {
    return this.propertiesService.findAll(paginationDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar inmuebles con filtros (Solo ADMIN)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por dirección, códigos de servicios o descripción' })
  @ApiQuery({ name: 'disponible', required: false, type: Boolean, description: 'Filtrar por disponibilidad' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Resultados de búsqueda obtenidos exitosamente',
    type: PaginatedPropertyDto,
  })
  search(@Query() searchDto: SearchPropertyDto & PaginationDto): Promise<PaginatedPropertyDto> {
    return this.propertiesService.search(searchDto);
  }

  @Get('address/:direccion')
  @ApiOperation({ summary: 'Buscar inmueble por dirección (Solo ADMIN)' })
  @ApiParam({ name: 'direccion', description: 'Dirección del inmueble (búsqueda parcial)' })
  @ApiResponse({
    status: 200,
    description: 'Inmueble encontrado exitosamente',
    type: Property,
  })
  @ApiResponse({
    status: 404,
    description: 'Inmueble no encontrado',
  })
  findByAddress(@Param('direccion') direccion: string): Promise<Property> {
    return this.propertiesService.findByAddress(direccion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener inmueble por ID (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del inmueble' })
  @ApiResponse({
    status: 200,
    description: 'Inmueble obtenido exitosamente',
    type: Property,
  })
  @ApiResponse({
    status: 404,
    description: 'Inmueble no encontrado',
  })
  findOne(@Param('id') id: string): Promise<Property> {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar inmueble por ID (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del inmueble' })
  @ApiResponse({
    status: 200,
    description: 'Inmueble actualizado exitosamente',
    type: Property,
  })
  @ApiResponse({
    status: 404,
    description: 'Inmueble no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un inmueble con estos datos',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Cambiar disponibilidad del inmueble (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del inmueble' })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad del inmueble actualizada exitosamente',
    type: Property,
  })
  @ApiResponse({
    status: 404,
    description: 'Inmueble no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  activate(
    @Param('id') id: string,
    @Body() activatePropertyDto: ActivatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.activate(id, activatePropertyDto.disponible);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar inmueble por ID (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del inmueble' })
  @ApiResponse({
    status: 204,
    description: 'Inmueble eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Inmueble no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.propertiesService.remove(id);
  }
}