import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../entities/tenant.entity';

export class PaginatedTenantDto {
  @ApiProperty({ type: [Tenant], description: 'Lista de inquilinos' })
  data: Tenant[];

  @ApiProperty({ description: 'Número total de inquilinos' })
  total: number;

  @ApiProperty({ description: 'Número de página actual' })
  page: number;

  @ApiProperty({ description: 'Número de elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Número total de páginas' })
  totalPages: number;
}
