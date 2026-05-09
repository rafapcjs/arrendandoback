import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { DashboardStatsDto } from '../dto/dashboard-stats.dto';
import { AdminDashboardStatsDto } from '../dto/admin-dashboard-stats.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import { Role } from '../enums/roles.enum';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(Role.ADMIN, Role.INMOBILIARIA)
  @ApiOperation({ summary: 'Estadísticas del dashboard (filtradas por inmobiliaria)' })
  @ApiResponse({ status: 200, type: DashboardStatsDto })
  async getDashboardStats(@GetUser() user: any): Promise<DashboardStatsDto> {
    return this.dashboardService.getDashboardStats(user);
  }

  @Get('admin-stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Estadísticas globales para Admin: usuarios, inmobiliarias, plataforma y top 5' })
  @ApiResponse({ status: 200, type: AdminDashboardStatsDto })
  async getAdminStats(): Promise<AdminDashboardStatsDto> {
    return this.dashboardService.getAdminStats();
  }
}
