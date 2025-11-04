import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsNumber, IsPositive } from 'class-validator';

export class CreatePagoDto {
  @ApiProperty({ description: 'Monto total del pago' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoTotal: number;

  @ApiProperty({ description: 'Fecha esperada de pago' })
  @IsDateString()
  fechaPagoEsperada: Date;

  @ApiProperty({ description: 'ID del contrato' })
  @IsUUID()
  contratoId: string;
}
