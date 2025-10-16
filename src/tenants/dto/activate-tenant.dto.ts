import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateTenantDto {
  @ApiProperty({ description: 'Estado de activación del inquilino' })
  @IsBoolean()
  isActive: boolean;
}