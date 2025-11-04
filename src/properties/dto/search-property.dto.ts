import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SearchPropertyDto {
  @ApiProperty({
    description: 'Buscar por dirección o códigos de servicios',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filtrar por disponibilidad', required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  disponible?: boolean;
}
