import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class PaginatedUserDto {
  @ApiProperty({ type: [User], description: 'Lista de usuarios' })
  data: User[];

  @ApiProperty({ description: 'Número total de usuarios' })
  total: number;

  @ApiProperty({ description: 'Número de página actual' })
  page: number;

  @ApiProperty({ description: 'Número de elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Número total de páginas' })
  totalPages: number;
}