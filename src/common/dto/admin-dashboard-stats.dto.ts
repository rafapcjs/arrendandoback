import { ApiProperty } from '@nestjs/swagger';

export class UsuariosStatsDto {
  @ApiProperty() total: number;
  @ApiProperty() activos: number;
  @ApiProperty() inactivos: number;
  @ApiProperty() rolesAdmin: number;
  @ApiProperty() rolesInmobiliaria: number;
}

export class InmobiliariasStatsDto {
  @ApiProperty() total: number;
  @ApiProperty() activas: number;
  @ApiProperty() inactivas: number;
}

export class PlataformaStatsDto {
  @ApiProperty() totalInmuebles: number;
  @ApiProperty() totalInquilinos: number;
  @ApiProperty() totalContratos: number;
  @ApiProperty() contratosActivos: number;
  @ApiProperty() contratosProximosVencer: number;
  @ApiProperty() contratosVencidos: number;
  @ApiProperty() totalPagos: number;
  @ApiProperty() pagosPendientes: number;
  @ApiProperty() pagosVencidos: number;
  @ApiProperty() montoRecaudadoMesActual: number;
  @ApiProperty() montoPendienteRecaudar: number;
}

export class TopInmobiliariaDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() totalContratos: number;
  @ApiProperty() montoRecaudado: number;
}

export class AdminDashboardStatsDto {
  @ApiProperty({ type: UsuariosStatsDto })
  usuarios: UsuariosStatsDto;

  @ApiProperty({ type: InmobiliariasStatsDto })
  inmobiliarias: InmobiliariasStatsDto;

  @ApiProperty({ type: PlataformaStatsDto })
  plataforma: PlataformaStatsDto;

  @ApiProperty({ type: [TopInmobiliariaDto] })
  topInmobiliarias: TopInmobiliariaDto[];
}
