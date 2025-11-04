import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import {
  MonthlyIncomeReportDto,
  AnnualIncomeReportDto,
  ComparisonReportDto,
} from './dto/income-report.dto';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('income/monthly')
  @ApiOperation({ summary: 'Obtener reporte de ingresos mensual' })
  @ApiResponse({
    status: 200,
    description: 'Reporte mensual generado exitosamente',
    type: MonthlyIncomeReportDto,
  })
  @ApiQuery({ name: 'year', description: 'Año del reporte', example: 2024 })
  @ApiQuery({
    name: 'month',
    description: 'Mes del reporte (1-12)',
    example: 10,
  })
  async getMonthlyIncomeReport(
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<MonthlyIncomeReportDto> {
    const yearNum = parseInt(year) || new Date().getFullYear();
    const monthNum = parseInt(month) || new Date().getMonth() + 1;
    return this.reportsService.getMonthlyIncomeReport(yearNum, monthNum);
  }

  @Get('income/annual')
  @ApiOperation({ summary: 'Obtener reporte de ingresos anual' })
  @ApiResponse({
    status: 200,
    description: 'Reporte anual generado exitosamente',
    type: AnnualIncomeReportDto,
  })
  @ApiQuery({ name: 'year', description: 'Año del reporte', example: 2024 })
  async getAnnualIncomeReport(
    @Query('year') year: string,
  ): Promise<AnnualIncomeReportDto> {
    const yearNum = parseInt(year) || new Date().getFullYear();
    return this.reportsService.getAnnualIncomeReport(yearNum);
  }

  @Get('income/comparison')
  @ApiOperation({
    summary: 'Obtener reporte comparativo de pagado vs no pagado',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte comparativo generado exitosamente',
    type: ComparisonReportDto,
  })
  @ApiQuery({
    name: 'fechaInicio',
    description: 'Fecha de inicio (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'fechaFin',
    description: 'Fecha de fin (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  async getComparisonReport(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ): Promise<ComparisonReportDto> {
    const startDate = fechaInicio || `${new Date().getFullYear()}-01-01`;
    const endDate = fechaFin || `${new Date().getFullYear()}-12-31`;
    return this.reportsService.getComparisonReport(startDate, endDate);
  }
}
