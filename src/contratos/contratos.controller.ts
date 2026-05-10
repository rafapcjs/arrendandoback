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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post(':id/documentos')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (
        _req,
        file: Express.Multer.File,
        cb: (err: Error | null, accept: boolean) => void,
      ) => {
        const allowed = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Solo se permiten PDF, Word, JPG, PNG o WEBP',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Subir documento de respaldo al contrato (PDF, Word, imagen)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, type: Contrato })
  subirDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: any,
  ): Promise<Contrato> {
    if (!file) throw new BadRequestException('Debe enviar un archivo');
    return this.contratosService.subirDocumento(id, file, user);
  }

  @Patch(':id/documentos/:docId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (
        _req,
        file: Express.Multer.File,
        cb: (err: Error | null, accept: boolean) => void,
      ) => {
        const allowed = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Solo se permiten PDF, Word, JPG, PNG o WEBP'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Reemplazar un documento existente del contrato' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, type: Contrato })
  reemplazarDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId') docId: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: any,
  ): Promise<Contrato> {
    if (!file) throw new BadRequestException('Debe enviar un archivo');
    return this.contratosService.reemplazarDocumento(id, docId, file, user);
  }

  @Get(':id/documentos/:docId/stream')
  @ApiOperation({ summary: 'Ver o descargar un documento del contrato (PDF, imagen, Word)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Archivo enviado como stream' })
  async streamDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId') docId: string,
    @Query('download') download: string,
    @GetUser() user: any,
    @Res() res: Response,
  ): Promise<void> {
    const { url, nombre, tipo } = await this.contratosService.streamDocumento(id, docId, user);

    let response: globalThis.Response;
    try {
      response = await fetch(url);
    } catch {
      throw new InternalServerErrorException('No se pudo obtener el documento desde el servidor');
    }

    if (!response.ok) {
      throw new InternalServerErrorException('Error al recuperar el documento');
    }

    const disposition = download === 'true'
      ? `attachment; filename="${encodeURIComponent(nombre)}"`
      : `inline; filename="${encodeURIComponent(nombre)}"`;

    res.setHeader('Content-Type', tipo);
    res.setHeader('Content-Disposition', disposition);

    const reader = response.body?.getReader();
    if (!reader) throw new InternalServerErrorException('Stream no disponible');

    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      await pump();
    };
    await pump();
  }

  @Delete(':id/documentos/:docId')
  @ApiOperation({ summary: 'Eliminar documento de respaldo del contrato (solo borra el archivo, no el contrato)' })
  @ApiResponse({ status: HttpStatus.OK, type: Contrato })
  eliminarDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId') docId: string,
    @GetUser() user: any,
  ): Promise<Contrato> {
    return this.contratosService.eliminarDocumento(id, docId, user);
  }
}
