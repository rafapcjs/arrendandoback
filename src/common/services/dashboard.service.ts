import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Property } from '../../properties/entities/property.entity';
import {
  Contrato,
  ContratoEstado,
} from '../../contratos/entities/contrato.entity';
import { Pago, PagoEstado } from '../../pagos/entities/pago.entity';
import { DashboardStatsDto } from '../dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30);

    const [
      totalUsuarios,
      usuariosActivos,
      totalInquilinos,
      inquilinosActivos,
      totalInmuebles,
      inmueblesDisponibles,
      totalContratos,
      contratosActivos,
      contratosProximosVencer,
      contratosVencidos,
      totalPagos,
      pagosPendientes,
      pagosVencidos,
      montoRecaudadoMesActual,
      montoPendienteRecaudar,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.tenantRepository.count(),
      this.tenantRepository.count({ where: { isActive: true } }),
      this.propertyRepository.count(),
      this.propertyRepository.count({ where: { disponible: true } }),
      this.contratoRepository.count(),
      this.contratoRepository.count({
        where: { estado: ContratoEstado.ACTIVO },
      }),
      this.contratoRepository.count({
        where: { estado: ContratoEstado.PROXIMO_VENCER },
      }),
      this.contratoRepository.count({
        where: { estado: ContratoEstado.VENCIDO },
      }),
      this.pagoRepository.count(),
      this.pagoRepository.count({ where: { estado: PagoEstado.PENDIENTE } }),
      this.pagoRepository.count({ where: { estado: PagoEstado.VENCIDO } }),
      this.pagoRepository
        .createQueryBuilder('pago')
        .select('COALESCE(SUM(pago.montoAbonado), 0)', 'total')
        .where('EXTRACT(MONTH FROM pago.createdAt) = :month', {
          month: currentMonth,
        })
        .andWhere('EXTRACT(YEAR FROM pago.createdAt) = :year', {
          year: currentYear,
        })
        .getRawOne()
        .then((result) => parseFloat(result.total) || 0),
      this.pagoRepository
        .createQueryBuilder('pago')
        .select(
          'COALESCE(SUM(pago.montoTotal - pago.montoAbonado), 0)',
          'total',
        )
        .where('pago.estado IN (:...estados)', {
          estados: [PagoEstado.PENDIENTE, PagoEstado.PARCIAL],
        })
        .getRawOne()
        .then((result) => parseFloat(result.total) || 0),
    ]);

    const inmueblesOcupados = totalInmuebles - inmueblesDisponibles;
    const tasaOcupacion =
      totalInmuebles > 0 ? (inmueblesOcupados / totalInmuebles) * 100 : 0;

    return {
      totalUsuarios,
      usuariosActivos,
      totalInquilinos,
      inquilinosActivos,
      totalInmuebles,
      inmueblesDisponibles,
      inmueblesOcupados,
      totalContratos,
      contratosActivos,
      contratosProximosVencer,
      contratosVencidos,
      totalPagos,
      pagosPendientes,
      pagosVencidos,
      montoRecaudadoMesActual,
      montoPendienteRecaudar,
      tasaOcupacion: Math.round(tasaOcupacion * 100) / 100,
    };
  }
}
