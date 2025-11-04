import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { DashboardStatsDto } from '../dto/dashboard-stats.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas del dashboard principal' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del dashboard obtenidas exitosamente',
    type: DashboardStatsDto,
  })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getDashboardStats();
  }
}
