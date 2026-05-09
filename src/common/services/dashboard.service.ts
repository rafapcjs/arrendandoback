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
import { Inmobiliaria, InmobiliariaEstado } from '../../inmobiliarias/entities/inmobiliaria.entity';
import { DashboardStatsDto } from '../dto/dashboard-stats.dto';
import { AdminDashboardStatsDto } from '../dto/admin-dashboard-stats.dto';
import { Role } from '../enums/roles.enum';

interface RequestUser {
  id: string;
  role: string;
  inmobiliariaId?: string | null;
}

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
    @InjectRepository(Inmobiliaria)
    private readonly inmobiliariaRepository: Repository<Inmobiliaria>,
  ) {}

  async getDashboardStats(user: RequestUser): Promise<DashboardStatsDto> {
    const isAdmin = user.role === Role.ADMIN;
    const inmoId = user.inmobiliariaId || 'no-access';
    const inmoFilter = isAdmin ? {} : { inmobiliariaId: inmoId };

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

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
      isAdmin ? this.userRepository.count() : Promise.resolve(0),
      isAdmin ? this.userRepository.count({ where: { isActive: true } }) : Promise.resolve(0),
      this.tenantRepository.count({ where: inmoFilter }),
      this.tenantRepository.count({ where: { ...inmoFilter, isActive: true } }),
      this.propertyRepository.count({ where: inmoFilter }),
      this.propertyRepository.count({ where: { ...inmoFilter, disponible: true } }),
      this.contratoRepository.count({ where: inmoFilter }),
      this.contratoRepository.count({ where: { ...inmoFilter, estado: ContratoEstado.ACTIVO } }),
      this.contratoRepository.count({ where: { ...inmoFilter, estado: ContratoEstado.PROXIMO_VENCER } }),
      this.contratoRepository.count({ where: { ...inmoFilter, estado: ContratoEstado.VENCIDO } }),
      this.pagoRepository.count({ where: inmoFilter }),
      this.pagoRepository.count({ where: { ...inmoFilter, estado: PagoEstado.PENDIENTE } }),
      this.pagoRepository.count({ where: { ...inmoFilter, estado: PagoEstado.VENCIDO } }),
      (() => {
        const qb = this.pagoRepository
          .createQueryBuilder('pago')
          .select('COALESCE(SUM(pago.montoAbonado), 0)', 'total')
          .where('EXTRACT(MONTH FROM pago.createdAt) = :month', { month: currentMonth })
          .andWhere('EXTRACT(YEAR FROM pago.createdAt) = :year', { year: currentYear });
        if (!isAdmin) qb.andWhere('pago.inmobiliariaId = :inmoId', { inmoId });
        return qb.getRawOne().then((r) => parseFloat(r.total) || 0);
      })(),
      (() => {
        const qb = this.pagoRepository
          .createQueryBuilder('pago')
          .select('COALESCE(SUM(pago.montoTotal - pago.montoAbonado), 0)', 'total')
          .where('pago.estado IN (:...estados)', { estados: [PagoEstado.PENDIENTE, PagoEstado.PARCIAL] });
        if (!isAdmin) qb.andWhere('pago.inmobiliariaId = :inmoId', { inmoId });
        return qb.getRawOne().then((r) => parseFloat(r.total) || 0);
      })(),
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

  async getAdminStats(): Promise<AdminDashboardStatsDto> {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [
      totalUsuarios,
      usuariosActivos,
      rolesAdmin,
      rolesInmobiliaria,
      totalInmobiliarias,
      inmobiliariasActivas,
      inmobiliariasInactivas,
      totalInmuebles,
      totalInquilinos,
      totalContratos,
      contratosActivos,
      contratosProximosVencer,
      contratosVencidos,
      totalPagos,
      pagosPendientes,
      pagosVencidos,
      montoMes,
      montoPendiente,
      pagosPorInmo,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { role: Role.ADMIN } }),
      this.userRepository.count({ where: { role: Role.INMOBILIARIA } }),
      this.inmobiliariaRepository.count(),
      this.inmobiliariaRepository.count({ where: { estado: InmobiliariaEstado.ACTIVA } }),
      this.inmobiliariaRepository.count({ where: { estado: InmobiliariaEstado.INACTIVA } }),
      this.propertyRepository.count(),
      this.tenantRepository.count(),
      this.contratoRepository.count(),
      this.contratoRepository.count({ where: { estado: ContratoEstado.ACTIVO } }),
      this.contratoRepository.count({ where: { estado: ContratoEstado.PROXIMO_VENCER } }),
      this.contratoRepository.count({ where: { estado: ContratoEstado.VENCIDO } }),
      this.pagoRepository.count(),
      this.pagoRepository.count({ where: { estado: PagoEstado.PENDIENTE } }),
      this.pagoRepository.count({ where: { estado: PagoEstado.VENCIDO } }),
      this.pagoRepository
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.montoAbonado), 0)', 'total')
        .where('EXTRACT(MONTH FROM p.createdAt) = :m', { m: currentMonth })
        .andWhere('EXTRACT(YEAR FROM p.createdAt) = :y', { y: currentYear })
        .getRawOne()
        .then((r) => parseFloat(r?.total) || 0),
      this.pagoRepository
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.montoTotal - p.montoAbonado), 0)', 'total')
        .where('p.estado IN (:...estados)', { estados: [PagoEstado.PENDIENTE, PagoEstado.PARCIAL] })
        .getRawOne()
        .then((r) => parseFloat(r?.total) || 0),
      // Agrupar pagos por inmobiliaria para calcular top 5
      this.pagoRepository
        .createQueryBuilder('p')
        .select('p.inmobiliariaId', 'inmobiliariaId')
        .addSelect('COALESCE(SUM(p.montoAbonado), 0)', 'montoRecaudado')
        .addSelect('COUNT(DISTINCT p.contratoId)', 'totalContratos')
        .where('p.inmobiliariaId IS NOT NULL')
        .groupBy('p.inmobiliariaId')
        .orderBy('SUM(p.montoAbonado)', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    // Buscar nombres de inmobiliarias para el top 5
    const inmoIds = pagosPorInmo.map((r) => r.inmobiliariaId).filter(Boolean);
    const inmobiliarias = inmoIds.length
      ? await this.inmobiliariaRepository.findByIds(inmoIds)
      : [];
    const inmoMap = new Map(inmobiliarias.map((i) => [i.id, i.nombre]));

    return {
      usuarios: {
        total: totalUsuarios,
        activos: usuariosActivos,
        inactivos: totalUsuarios - usuariosActivos,
        rolesAdmin,
        rolesInmobiliaria,
      },
      inmobiliarias: {
        total: totalInmobiliarias,
        activas: inmobiliariasActivas,
        inactivas: inmobiliariasInactivas,
      },
      plataforma: {
        totalInmuebles,
        totalInquilinos,
        totalContratos,
        contratosActivos,
        contratosProximosVencer,
        contratosVencidos,
        totalPagos,
        pagosPendientes,
        pagosVencidos,
        montoRecaudadoMesActual: montoMes,
        montoPendienteRecaudar: montoPendiente,
      },
      topInmobiliarias: pagosPorInmo.map((r) => ({
        id: r.inmobiliariaId,
        nombre: inmoMap.get(r.inmobiliariaId) || 'Desconocida',
        totalContratos: parseInt(r.totalContratos) || 0,
        montoRecaudado: parseFloat(r.montoRecaudado) || 0,
      })),
    };
  }
}
