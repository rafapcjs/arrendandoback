import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ description: 'Total number of users in the system' })
  totalUsuarios: number;

  @ApiProperty({ description: 'Total number of active users' })
  usuariosActivos: number;

  @ApiProperty({ description: 'Total number of tenants' })
  totalInquilinos: number;

  @ApiProperty({ description: 'Total number of active tenants' })
  inquilinosActivos: number;

  @ApiProperty({ description: 'Total number of properties' })
  totalInmuebles: number;

  @ApiProperty({ description: 'Number of available properties' })
  inmueblesDisponibles: number;

  @ApiProperty({ description: 'Number of occupied properties' })
  inmueblesOcupados: number;

  @ApiProperty({ description: 'Total number of contracts' })
  totalContratos: number;

  @ApiProperty({ description: 'Number of active contracts' })
  contratosActivos: number;

  @ApiProperty({
    description: 'Number of contracts about to expire (within 30 days)',
  })
  contratosProximosVencer: number;

  @ApiProperty({ description: 'Number of expired contracts' })
  contratosVencidos: number;

  @ApiProperty({ description: 'Total number of payments' })
  totalPagos: number;

  @ApiProperty({ description: 'Number of pending payments' })
  pagosPendientes: number;

  @ApiProperty({ description: 'Number of overdue payments' })
  pagosVencidos: number;

  @ApiProperty({ description: 'Total amount collected this month' })
  montoRecaudadoMesActual: number;

  @ApiProperty({ description: 'Total amount pending collection' })
  montoPendienteRecaudar: number;

  @ApiProperty({ description: 'Monthly occupancy rate percentage' })
  tasaOcupacion: number;
}
