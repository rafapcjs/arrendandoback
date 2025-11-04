import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateUserDto {
  @ApiProperty({ description: 'Estado de activación del usuario' })
  @IsBoolean()
  isActive: boolean;
}
