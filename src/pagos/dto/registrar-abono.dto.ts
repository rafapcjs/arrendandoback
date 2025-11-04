import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class RegistrarAbonoDto {
  @ApiProperty({ description: 'Monto del abono' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto: number;

  @ApiProperty({ description: 'Fecha del pago', required: false })
  @IsOptional()
  @IsDateString()
  fechaPago?: Date;
}
