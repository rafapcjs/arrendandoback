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
import { In } from 'typeorm';
import { Pago, PagoEstado } from '../../pagos/entities/pago.entity';
import { PagoCalculator } from '../../pagos/utils/pago-calculator';
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
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
        const qb = this.pagoRepository
          .createQueryBuilder('pago')
          .select('COALESCE(SUM(pago.montoAbonado), 0)', 'capital')
          .addSelect('COALESCE(SUM(pago.moraAbonada), 0)', 'mora')
          .where('pago.estado = :estado', { estado: PagoEstado.PAGADO })
          .andWhere('pago.updatedAt BETWEEN :start AND :end', { start, end });
        if (!isAdmin) qb.andWhere('pago.inmobiliariaId = :inmoId', { inmoId });
        return qb.getRawOne().then((r) => (parseFloat(r.capital) || 0) + (parseFloat(r.mora) || 0));
      })(),
      (async () => {
        const where: any = {
          estado: In([PagoEstado.PENDIENTE, PagoEstado.PARCIAL, PagoEstado.VENCIDO]),
        };
        if (!isAdmin) where.inmobiliariaId = inmoId;
        const pagos = await this.pagoRepository.find({ where });
        return PagoCalculator.sumarPendiente(pagos);
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

  async debugMora(inmobiliariaId?: string) {
    const qb = this.pagoRepository
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .addSelect('p.estado', 'estado')
      .addSelect('p.montoTotal', 'montoTotal')
      .addSelect('p.montoAbonado', 'montoAbonado')
      .addSelect('p.moraAbonada', 'moraAbonada')
      .addSelect('p.updatedAt', 'updatedAt')
      .where('p.estado = :estado', { estado: 'PAGADO' })
      .orderBy('p.updatedAt', 'DESC')
      .limit(10);

    if (inmobiliariaId) {
      qb.andWhere('p.inmobiliariaId = :inmobiliariaId', { inmobiliariaId });
    }

    const rows = await qb.getRawMany();

    const totales = await this.pagoRepository
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.montoAbonado), 0)', 'totalCapital')
      .addSelect('COALESCE(SUM(p.moraAbonada), 0)', 'totalMora')
      .where('p.estado = :estado', { estado: 'PAGADO' })
      .getRawOne();

    return {
      ultimosPagosPagados: rows.map((r) => ({
        id: r.id,
        montoTotal: parseFloat(r.montoTotal) || 0,
        montoAbonado: parseFloat(r.montoAbonado) || 0,
        moraAbonada: parseFloat(r.moraAbonada) || 0,
        updatedAt: r.updatedAt,
      })),
      totalesGlobales: {
        totalCapital: parseFloat(totales.totalCapital) || 0,
        totalMora: parseFloat(totales.totalMora) || 0,
        suma: (parseFloat(totales.totalCapital) || 0) + (parseFloat(totales.totalMora) || 0),
      },
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
      (() => {
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
        return this.pagoRepository
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.montoAbonado), 0)', 'capital')
          .addSelect('COALESCE(SUM(p.moraAbonada), 0)', 'mora')
          .where('p.estado = :estado', { estado: PagoEstado.PAGADO })
          .andWhere('p.updatedAt BETWEEN :start AND :end', { start, end })
          .getRawOne()
          .then((r) => (parseFloat(r?.capital) || 0) + (parseFloat(r?.mora) || 0));
      })(),
      (async () => {
        const pagos = await this.pagoRepository.find({
          where: {
            estado: In([PagoEstado.PENDIENTE, PagoEstado.PARCIAL, PagoEstado.VENCIDO]),
          },
        });
        return PagoCalculator.sumarPendiente(pagos);
      })(),
      // Agrupar pagos por inmobiliaria para calcular top 5
      this.pagoRepository
        .createQueryBuilder('p')
        .select('p.inmobiliariaId', 'inmobiliariaId')
        .addSelect('COALESCE(SUM(p.montoAbonado), 0)', 'capital')
        .addSelect('COALESCE(SUM(p.moraAbonada), 0)', 'mora')
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
        montoRecaudado: (parseFloat(r.capital) || 0) + (parseFloat(r.mora) || 0),
      })),
    };
  }
}
