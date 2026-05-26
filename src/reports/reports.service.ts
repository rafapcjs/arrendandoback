import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Pago, PagoEstado } from '../pagos/entities/pago.entity';
import {
  MonthlyIncomeReportDto,
  AnnualIncomeReportDto,
  ComparisonReportDto,
} from './dto/income-report.dto';

interface RequestUser {
  id: string;
  role: string;
  inmobiliariaId?: string | null;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
  ) {}

  private buildWhere(extra: object, user: RequestUser): object {
    const inmobiliariaId = user.inmobiliariaId || 'no-access';
    return { ...extra, inmobiliariaId };
  }

  async getMonthlyIncomeReport(
    year: number,
    month: number,
    user: RequestUser,
  ): Promise<MonthlyIncomeReportDto> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const pagos = await this.pagoRepository.find({
      where: this.buildWhere({ fechaPagoEsperada: Between(startDate, endDate) }, user),
    });

    const totalEsperado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoTotal),
      0,
    );
    const totalPagado = pagos
      .filter((pago) => pago.estado === PagoEstado.PAGADO)
      .reduce(
        (sum, pago) => sum + Number(pago.montoAbonado) + Number(pago.moraAbonada),
        0,
      );

    const totalPendiente = pagos
      .filter((pago) => pago.estado !== PagoEstado.PAGADO)
      .reduce((sum, pago) => sum + Number(pago.montoTotal) - Number(pago.montoAbonado), 0);
    const porcentajePagado =
      totalEsperado > 0 ? Math.min((totalPagado / totalEsperado) * 100, 100) : 0;

    const numeroPagosEsperados = pagos.length;
    const numeroPagosCompletados = pagos.filter(
      (pago) => pago.estado === PagoEstado.PAGADO,
    ).length;

    return {
      year,
      month,
      totalEsperado,
      totalPagado,
      totalPendiente,
      porcentajePagado: Math.round(porcentajePagado * 100) / 100,
      numeroPagosEsperados,
      numeroPagosCompletados,
    };
  }

  async getAnnualIncomeReport(year: number, user: RequestUser): Promise<AnnualIncomeReportDto> {
    const reporteMensual: MonthlyIncomeReportDto[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthlyReport = await this.getMonthlyIncomeReport(year, month, user);
      reporteMensual.push(monthlyReport);
    }

    const totalEsperado = reporteMensual.reduce(
      (sum, report) => sum + report.totalEsperado,
      0,
    );
    const totalPagado = reporteMensual.reduce(
      (sum, report) => sum + report.totalPagado,
      0,
    );
    const totalPendiente = reporteMensual.reduce(
      (sum, report) => sum + report.totalPendiente,
      0,
    );
    const porcentajePagado =
      totalEsperado > 0 ? Math.min((totalPagado / totalEsperado) * 100, 100) : 0;

    return {
      year,
      totalEsperado,
      totalPagado,
      totalPendiente,
      porcentajePagado: Math.round(porcentajePagado * 100) / 100,
      reporteMensual,
    };
  }

  async getComparisonReport(
    fechaInicio: string,
    fechaFin: string,
    user: RequestUser,
  ): Promise<ComparisonReportDto> {
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);

    const pagos = await this.pagoRepository.find({
      where: this.buildWhere({ fechaPagoEsperada: Between(startDate, endDate) }, user),
    });

    const totalEsperado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoTotal),
      0,
    );

    const pagosPorEstado = {
      [PagoEstado.PAGADO]: pagos.filter((p) => p.estado === PagoEstado.PAGADO),
      [PagoEstado.PARCIAL]: pagos.filter(
        (p) => p.estado === PagoEstado.PARCIAL,
      ),
      [PagoEstado.PENDIENTE]: pagos.filter(
        (p) => p.estado === PagoEstado.PENDIENTE,
      ),
      [PagoEstado.VENCIDO]: pagos.filter(
        (p) => p.estado === PagoEstado.VENCIDO,
      ),
    };

    const totalPagado = pagosPorEstado[PagoEstado.PAGADO].reduce(
      (sum, pago) => sum + Number(pago.montoAbonado) + Number(pago.moraAbonada),
      0,
    );

    const totalParcial = pagosPorEstado[PagoEstado.PARCIAL].reduce(
      (sum, pago) => sum + Number(pago.montoAbonado) + Number(pago.moraAbonada),
      0,
    );

    const totalPendiente = pagosPorEstado[PagoEstado.PENDIENTE].reduce(
      (sum, pago) => sum + Number(pago.montoTotal),
      0,
    );

    const totalVencido = pagosPorEstado[PagoEstado.VENCIDO].reduce(
      (sum, pago) => sum + Number(pago.montoTotal),
      0,
    );

    const porcentajePagadoVsEsperado =
      totalEsperado > 0 ? (totalPagado / totalEsperado) * 100 : 0;

    const distribucionPorEstado = {
      pagado: {
        cantidad: pagosPorEstado[PagoEstado.PAGADO].length,
        monto: totalPagado,
        porcentaje: totalEsperado > 0 ? (totalPagado / totalEsperado) * 100 : 0,
      },
      parcial: {
        cantidad: pagosPorEstado[PagoEstado.PARCIAL].length,
        monto: totalParcial,
        porcentaje:
          totalEsperado > 0 ? (totalParcial / totalEsperado) * 100 : 0,
      },
      pendiente: {
        cantidad: pagosPorEstado[PagoEstado.PENDIENTE].length,
        monto: totalPendiente,
        porcentaje:
          totalEsperado > 0 ? (totalPendiente / totalEsperado) * 100 : 0,
      },
      vencido: {
        cantidad: pagosPorEstado[PagoEstado.VENCIDO].length,
        monto: totalVencido,
        porcentaje:
          totalEsperado > 0 ? (totalVencido / totalEsperado) * 100 : 0,
      },
    };

    return {
      fechaInicio,
      fechaFin,
      totalEsperado,
      totalPagado,
      totalParcial,
      totalPendiente,
      totalVencido,
      porcentajePagadoVsEsperado:
        Math.round(porcentajePagadoVsEsperado * 100) / 100,
      distribucionPorEstado,
    };
  }
}
