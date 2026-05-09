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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { ActivatePropertyDto } from './dto/activate-property.dto';
import { PaginatedPropertyDto } from './dto/paginated-property.dto';
import { Property } from './entities/property.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/roles.enum';
import { FileInterceptor } from '@nestjs/platform-express';

const fileUploadOptions = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return callback(
        new BadRequestException('Solo se permiten imagenes JPG, PNG o WEBP'),
        false,
      );
    }
    return callback(null, true);
  },
};

@ApiTags('Gestión de Inmuebles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INMOBILIARIA)
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('foto', fileUploadOptions))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear inmueble' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        foto: { type: 'string', format: 'binary' },
        inmobiliariaId: { type: 'string', format: 'uuid', description: 'Solo ADMIN' },
        propietarioId: { type: 'string', format: 'uuid' },
        direccion: { type: 'string' },
        codigoServicioAgua: { type: 'string' },
        codigoServicioGas: { type: 'string' },
        codigoServicioLuz: { type: 'string' },
        disponible: { type: 'boolean' },
        descripcion: { type: 'string' },
      },
      required: ['direccion', 'codigoServicioAgua', 'codigoServicioGas', 'codigoServicioLuz'],
    },
  })
  @ApiResponse({ status: 201, type: Property })
  create(
    @UploadedFile() foto: Express.Multer.File | undefined,
    @Body() createPropertyDto: CreatePropertyDto,
    @GetUser() user: any,
  ): Promise<Property> {
    return this.propertiesService.create(createPropertyDto, user, foto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar inmuebles (INMOBILIARIA ve solo los suyos)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedPropertyDto })
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser() user: any,
  ): Promise<PaginatedPropertyDto> {
    return this.propertiesService.findAll(paginationDto, user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar inmuebles con filtros' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'disponible', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedPropertyDto })
  search(
    @Query() searchDto: SearchPropertyDto & PaginationDto,
    @GetUser() user: any,
  ): Promise<PaginatedPropertyDto> {
    return this.propertiesService.search(searchDto, user);
  }

  @Get('address/:direccion')
  @ApiOperation({ summary: 'Buscar inmueble por dirección' })
  @ApiParam({ name: 'direccion', description: 'Dirección del inmueble (búsqueda parcial)' })
  @ApiResponse({ status: 200, type: Property })
  findByAddress(
    @Param('direccion') direccion: string,
    @GetUser() user: any,
  ): Promise<Property> {
    return this.propertiesService.findByAddress(direccion, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener inmueble por ID' })
  @ApiParam({ name: 'id', description: 'UUID del inmueble' })
  @ApiResponse({ status: 200, type: Property })
  findOne(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<Property> {
    return this.propertiesService.findOne(id, user);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('foto', fileUploadOptions))
  @ApiOperation({ summary: 'Actualizar inmueble' })
  @ApiParam({ name: 'id', description: 'UUID del inmueble' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, type: Property })
  update(
    @Param('id') id: string,
    @UploadedFile() foto: Express.Multer.File | undefined,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @GetUser() user: any,
  ): Promise<Property> {
    return this.propertiesService.update(id, updatePropertyDto, user, foto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Cambiar disponibilidad del inmueble' })
  @ApiParam({ name: 'id', description: 'UUID del inmueble' })
  @ApiResponse({ status: 200, type: Property })
  activate(
    @Param('id') id: string,
    @Body() activatePropertyDto: ActivatePropertyDto,
    @GetUser() user: any,
  ): Promise<Property> {
    return this.propertiesService.activate(id, activatePropertyDto.disponible, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar inmueble' })
  @ApiParam({ name: 'id', description: 'UUID del inmueble' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<void> {
    return this.propertiesService.remove(id, user);
  }
}
