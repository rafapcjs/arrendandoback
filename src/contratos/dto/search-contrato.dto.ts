import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContratoEstado } from '../entities/contrato.entity';

export class SearchContratoDto {
  @ApiProperty({ description: 'Estado del contrato', enum: ContratoEstado, required: false })
  @IsOptional()
  @IsEnum(ContratoEstado)
  estado?: ContratoEstado;

  @ApiProperty({ description: 'ID del inquilino', required: false })
  @IsOptional()
  @IsUUID()
  inquilinoId?: string;

  @ApiProperty({ description: 'ID del inmueble', required: false })
  @IsOptional()
  @IsUUID()
  inmuebleId?: string;

  @ApiProperty({ description: 'Fecha de inicio desde', required: false })
  @IsOptional()
  @IsDateString()
  fechaInicioDesde?: string;

  @ApiProperty({ description: 'Fecha de inicio hasta', required: false })
  @IsOptional()
  @IsDateString()
  fechaInicioHasta?: string;

  @ApiProperty({ description: 'Fecha de fin desde', required: false })
  @IsOptional()
  @IsDateString()
  fechaFinDesde?: string;

  @ApiProperty({ description: 'Fecha de fin hasta', required: false })
  @IsOptional()
  @IsDateString()
  fechaFinHasta?: string;
}