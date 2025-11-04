import { ApiProperty } from '@nestjs/swagger';

export class MonthlyIncomeReportDto {
  @ApiProperty({ description: 'Año del reporte' })
  year: number;

  @ApiProperty({ description: 'Mes del reporte (1-12)' })
  month: number;

  @ApiProperty({ description: 'Total esperado del mes' })
  totalEsperado: number;

  @ApiProperty({ description: 'Total pagado del mes' })
  totalPagado: number;

  @ApiProperty({ description: 'Total pendiente del mes' })
  totalPendiente: number;

  @ApiProperty({ description: 'Porcentaje de pagos completados' })
  porcentajePagado: number;

  @ApiProperty({ description: 'Número de pagos esperados' })
  numeroPagosEsperados: number;

  @ApiProperty({ description: 'Número de pagos completados' })
  numeroPagosCompletados: number;
}

export class AnnualIncomeReportDto {
  @ApiProperty({ description: 'Año del reporte' })
  year: number;

  @ApiProperty({ description: 'Total esperado del año' })
  totalEsperado: number;

  @ApiProperty({ description: 'Total pagado del año' })
  totalPagado: number;

  @ApiProperty({ description: 'Total pendiente del año' })
  totalPendiente: number;

  @ApiProperty({ description: 'Porcentaje de pagos completados' })
  porcentajePagado: number;

  @ApiProperty({
    description: 'Reporte mensual detallado',
    type: [MonthlyIncomeReportDto],
  })
  reporteMensual: MonthlyIncomeReportDto[];
}

export class ComparisonReportDto {
  @ApiProperty({ description: 'Fecha de inicio del período' })
  fechaInicio: string;

  @ApiProperty({ description: 'Fecha de fin del período' })
  fechaFin: string;

  @ApiProperty({ description: 'Total esperado en el período' })
  totalEsperado: number;

  @ApiProperty({ description: 'Total pagado en el período' })
  totalPagado: number;

  @ApiProperty({ description: 'Total parcial en el período' })
  totalParcial: number;

  @ApiProperty({ description: 'Total pendiente en el período' })
  totalPendiente: number;

  @ApiProperty({ description: 'Total vencido en el período' })
  totalVencido: number;

  @ApiProperty({ description: 'Porcentaje pagado vs esperado' })
  porcentajePagadoVsEsperado: number;

  @ApiProperty({ description: 'Distribución por estado de pago' })
  distribucionPorEstado: {
    pagado: { cantidad: number; monto: number; porcentaje: number };
    parcial: { cantidad: number; monto: number; porcentaje: number };
    pendiente: { cantidad: number; monto: number; porcentaje: number };
    vencido: { cantidad: number; monto: number; porcentaje: number };
  };
}
