import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty({ description: 'Dirección del inmueble' })
  @IsString()
  direccion: string;

  @ApiProperty({ description: 'Código del servicio de agua' })
  @IsString()
  codigoServicioAgua: string;

  @ApiProperty({ description: 'Código del servicio de gas' })
  @IsString()
  codigoServicioGas: string;

  @ApiProperty({ description: 'Código del servicio de luz' })
  @IsString()
  codigoServicioLuz: string;

  @ApiProperty({
    description: 'Estado de disponibilidad del inmueble',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return value;
  })
  disponible?: boolean;

  @ApiProperty({
    description: 'Descripción detallada del inmueble',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({
    description: 'URL de la foto del inmueble',
    required: false,
  })
  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @ApiProperty({
    description: 'Archivo de foto del inmueble',
    required: false,
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @IsString()
  foto?: string;

  @ApiProperty({
    description: 'Public ID de la foto en Cloudinary',
    required: false,
  })
  @IsOptional()
  @IsString()
  fotoPublicId?: string;
}
