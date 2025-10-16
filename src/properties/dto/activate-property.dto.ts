import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivatePropertyDto {
  @ApiProperty({ description: 'Estado de disponibilidad del inmueble' })
  @IsBoolean()
  disponible: boolean;
}