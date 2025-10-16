import { ApiProperty } from '@nestjs/swagger';
import { Contrato } from '../entities/contrato.entity';

export class PaginatedContratoDto {
  @ApiProperty({ description: 'Lista de contratos', type: [Contrato] })
  data: Contrato[];

  @ApiProperty({ description: 'Número total de contratos' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Número total de páginas' })
  totalPages: number;
}