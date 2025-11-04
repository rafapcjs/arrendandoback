import { IsString, IsBoolean, IsOptional } from 'class-validator';
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
  disponible?: boolean;

  @ApiProperty({
    description: 'Descripción detallada del inmueble',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
