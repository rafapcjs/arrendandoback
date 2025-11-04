import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsPositive,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ContratoEstado } from '../entities/contrato.entity';

export class CreateContratoDto {
  @ApiProperty({
    description: 'Fecha de inicio del contrato',
    example: '2024-01-01',
  })
  @IsNotEmpty()
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({
    description: 'Fecha de fin del contrato',
    example: '2024-12-31',
  })
  @IsNotEmpty()
  @IsDateString()
  fechaFin: string;

  @ApiProperty({ description: 'Canon mensual del contrato', example: 1500000 })
  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  canonMensual: number;

  @ApiProperty({
    description: 'Estado del contrato',
    enum: ContratoEstado,
    example: ContratoEstado.BORRADOR,
  })
  @IsEnum(ContratoEstado)
  estado: ContratoEstado;

  @ApiProperty({ description: 'ID del inquilino', example: 'uuid-inquilino' })
  @IsNotEmpty()
  @IsUUID()
  inquilinoId: string;

  @ApiProperty({ description: 'ID del inmueble', example: 'uuid-inmueble' })
  @IsNotEmpty()
  @IsUUID()
  inmuebleId: string;
}
