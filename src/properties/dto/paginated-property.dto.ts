import { ApiProperty } from '@nestjs/swagger';
import { Property } from '../entities/property.entity';

export class PaginatedPropertyDto {
  @ApiProperty({ type: [Property], description: 'Lista de inmuebles' })
  data: Property[];

  @ApiProperty({ description: 'Total de inmuebles' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;
}
