import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Pago, PagoEstado } from '../pagos/entities/pago.entity';
import {
  MonthlyIncomeReportDto,
  AnnualIncomeReportDto,
  ComparisonReportDto,
} from './dto/income-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
  ) {}

  async getMonthlyIncomeReport(
    year: number,
    month: number,
  ): Promise<MonthlyIncomeReportDto> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const pagos = await this.pagoRepository.find({
      where: {
        fechaPagoEsperada: Between(startDate, endDate),
      },
    });

    const totalEsperado = pagos.reduce(
      (sum, pago) => sum + Number(pago.montoTotal),
      0,
    );
    const totalPagado = pagos
      .filter((pago) => pago.estado === PagoEstado.PAGADO)
      .reduce((sum, pago) => sum + Number(pago.montoTotal), 0);

    const totalPendiente = totalEsperado - totalPagado;
    const porcentajePagado =
      totalEsperado > 0 ? (totalPagado / totalEsperado) * 100 : 0;

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

  async getAnnualIncomeReport(year: number): Promise<AnnualIncomeReportDto> {
    const reporteMensual: MonthlyIncomeReportDto[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthlyReport = await this.getMonthlyIncomeReport(year, month);
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
    const totalPendiente = totalEsperado - totalPagado;
    const porcentajePagado =
      totalEsperado > 0 ? (totalPagado / totalEsperado) * 100 : 0;

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
  ): Promise<ComparisonReportDto> {
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);

    const pagos = await this.pagoRepository.find({
      where: {
        fechaPagoEsperada: Between(startDate, endDate),
      },
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
      (sum, pago) => sum + Number(pago.montoTotal),
      0,
    );

    const totalParcial = pagosPorEstado[PagoEstado.PARCIAL].reduce(
      (sum, pago) => sum + Number(pago.montoAbonado),
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
