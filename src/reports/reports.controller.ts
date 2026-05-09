import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  MonthlyIncomeReportDto,
  AnnualIncomeReportDto,
  ComparisonReportDto,
} from './dto/income-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INMOBILIARIA)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('income/monthly')
  @ApiOperation({ summary: 'Obtener reporte de ingresos mensual' })
  @ApiResponse({ status: 200, type: MonthlyIncomeReportDto })
  @ApiQuery({ name: 'year', example: 2024 })
  @ApiQuery({ name: 'month', example: 10 })
  async getMonthlyIncomeReport(
    @Query('year') year: string,
    @Query('month') month: string,
    @GetUser() user: any,
  ): Promise<MonthlyIncomeReportDto> {
    const yearNum = parseInt(year) || new Date().getFullYear();
    const monthNum = parseInt(month) || new Date().getMonth() + 1;
    return this.reportsService.getMonthlyIncomeReport(yearNum, monthNum, user);
  }

  @Get('income/annual')
  @ApiOperation({ summary: 'Obtener reporte de ingresos anual' })
  @ApiResponse({ status: 200, type: AnnualIncomeReportDto })
  @ApiQuery({ name: 'year', example: 2024 })
  async getAnnualIncomeReport(
    @Query('year') year: string,
    @GetUser() user: any,
  ): Promise<AnnualIncomeReportDto> {
    const yearNum = parseInt(year) || new Date().getFullYear();
    return this.reportsService.getAnnualIncomeReport(yearNum, user);
  }

  @Get('income/comparison')
  @ApiOperation({ summary: 'Reporte comparativo de pagado vs no pagado' })
  @ApiResponse({ status: 200, type: ComparisonReportDto })
  @ApiQuery({ name: 'fechaInicio', example: '2024-01-01' })
  @ApiQuery({ name: 'fechaFin', example: '2024-12-31' })
  async getComparisonReport(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @GetUser() user: any,
  ): Promise<ComparisonReportDto> {
    const startDate = fechaInicio || `${new Date().getFullYear()}-01-01`;
    const endDate = fechaFin || `${new Date().getFullYear()}-12-31`;
    return this.reportsService.getComparisonReport(startDate, endDate, user);
  }
}
