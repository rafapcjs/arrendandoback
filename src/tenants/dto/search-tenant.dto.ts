import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchTenantDto {
  @ApiProperty({
    description: 'Búsqueda por nombres o apellidos',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filtrar por ciudad', required: false })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiProperty({ description: 'Filtrar por estado activo', required: false })
  @IsOptional()
  isActive?: boolean;
}
