import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, In } from 'typeorm';
import { Pago, PagoEstado } from './entities/pago.entity';
import { Contrato } from '../contratos/entities/contrato.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { RegistrarAbonoDto } from './dto/registrar-abono.dto';
import { Role } from '../common/enums/roles.enum';
import { PagoCalculator } from './utils/pago-calculator';

interface RequestUser {
  id: string;
  role: string;
  inmobiliariaId?: string | null;
}

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
  ) {}

  private tenantFilter(user: RequestUser): any {
    if (user.role === Role.ADMIN) return {};
    if (!user.inmobiliariaId) return { id: 'no-access' };
    return { inmobiliariaId: user.inmobiliariaId };
  }

  async crearPago(createPagoDto: CreatePagoDto, user?: RequestUser): Promise<Pago> {
    const contrato = await this.contratoRepository.findOne({
      where: { id: createPagoDto.contratoId },
    });

    if (!contrato) {
      throw new NotFoundException(
        `Contrato con ID ${createPagoDto.contratoId} no encontrado`,
      );
    }

    const fechaPagoEsperada = createPagoDto.fechaPagoEsperada;
    const montoTotal = createPagoDto.montoTotal || contrato.canonMensual;

    const pago = this.pagoRepository.create({
      contratoId: createPagoDto.contratoId,
      inmobiliariaId: contrato.inmobiliariaId,
      montoTotal,
      fechaPagoEsperada,
      estado: PagoEstado.PENDIENTE,
      montoAbonado: 0,
      registradoPorId: user?.id,
    });

    const guardado = await this.pagoRepository.save(pago);
    // El hook @AfterLoad no se dispara tras save(): recalculamos manualmente
    // para que la respuesta incluya saldo, mora y total a pagar en tiempo real.
    return PagoCalculator.aplicar(guardado);
  }

  async crearPagosMensuales(
    contratoId: string,
    mesesAGenerar: number = 12,
  ): Promise<Pago[]> {
    const contrato = await this.contratoRepository.findOne({
      where: { id: contratoId },
    });

    if (!contrato) {
      throw new NotFoundException(
        `Contrato con ID ${contratoId} no encontrado`,
      );
    }

    const pagos: Pago[] = [];
    const fechaInicio = new Date(contrato.fechaInicio);

    for (let i = 0; i < mesesAGenerar; i++) {
      const fechaPago = new Date(fechaInicio);
      fechaPago.setMonth(fechaInicio.getMonth() + i);

      // Verificar que no existe ya un pago para esta fecha
      const pagoExistente = await this.pagoRepository.findOne({
        where: {
          contratoId,
          fechaPagoEsperada: fechaPago,
        },
      });

      if (!pagoExistente) {
        const pago = this.pagoRepository.create({
          contratoId,
          inmobiliariaId: contrato.inmobiliariaId,
          montoTotal: contrato.canonMensual,
          fechaPagoEsperada: fechaPago,
          estado: PagoEstado.PENDIENTE,
          montoAbonado: 0,
        });

        const pagoGuardado = await this.pagoRepository.save(pago);
        pagos.push(PagoCalculator.aplicar(pagoGuardado));
      }
    }

    return pagos;
  }

  /**
   * Registra un abono distribuyéndolo entre capital y mora.
   *
   * Reglas:
   *  - El monto recibido se aplica primero al saldo de capital pendiente.
   *  - El excedente (si lo hay) se aplica a la mora pendiente.
   *  - Se acepta hasta totalAPagar + TOLERANCIA_COP (1 peso) para absorber
   *    diferencias de redondeo entre la mora calculada en backend (decimal)
   *    y el monto entero que envía el front.
   *  - La cuota queda PAGADO solo cuando capital y mora estén saldados.
   */
  async registrarAbono(
    id: string,
    registrarAbonoDto: RegistrarAbonoDto,
    user?: RequestUser,
  ): Promise<Pago> {
    const TOLERANCIA_COP = 1; // ±1 peso de tolerancia por redondeo

    const pago = await this.findOne(id, user);

    if (pago.estado === PagoEstado.PAGADO) {
      throw new BadRequestException('El pago ya está completamente pagado');
    }

    // Re-aseguramos que los campos derivados estén frescos al momento del abono.
    PagoCalculator.aplicar(pago);

    const monto = Number(registrarAbonoDto.monto);
    const saldoCapital = Number(pago.saldoPendiente) || 0;
    const moraPendiente = Number(pago.mora) || 0;
    const totalAPagar = Number(pago.totalAPagar) || 0;

    if (monto <= 0) {
      throw new BadRequestException('El monto del abono debe ser mayor a 0');
    }

    if (monto > totalAPagar + TOLERANCIA_COP) {
      throw new BadRequestException(
        `El monto del abono ($${monto}) excede el total a pagar ($${totalAPagar}) incluyendo mora`,
      );
    }

    // Distribución: primero capital, el excedente va a mora.
    const aplicadoCapital = Math.min(monto, saldoCapital);
    const excedente = monto - aplicadoCapital;
    const aplicadoMora = Math.min(excedente, moraPendiente + TOLERANCIA_COP);

    pago.montoAbonado = Number(pago.montoAbonado) + aplicadoCapital;
    pago.moraAbonada = Number(pago.moraAbonada || 0) + aplicadoMora;

    // ¿Quedó todo saldado? Capital cubierto y mora pendiente dentro de tolerancia.
    const capitalCubierto =
      Number(pago.montoAbonado) >= Number(pago.montoTotal) - TOLERANCIA_COP;
    const moraCubierta = moraPendiente - aplicadoMora <= TOLERANCIA_COP;

    if (capitalCubierto && moraCubierta) {
      pago.estado = PagoEstado.PAGADO;
      pago.fechaPagoReal = registrarAbonoDto.fechaPago
        ? new Date(registrarAbonoDto.fechaPago)
        : new Date();
    } else {
      pago.estado = PagoEstado.PARCIAL;
    }

    const guardado = await this.pagoRepository.save(pago);
    // Recalculamos para reflejar el nuevo saldo, mora pendiente y total a pagar
    // inmediatamente después de registrar el abono.
    return PagoCalculator.aplicar(guardado);
  }

  async verificarPagosVencidos(): Promise<{
    procesados: number;
    vencidos: number;
  }> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 3); // 3 días hábiles de gracia

    const pagosAVerificar = await this.pagoRepository.find({
      where: {
        fechaPagoEsperada: LessThanOrEqual(fechaLimite),
        estado: Not(In([PagoEstado.PAGADO, PagoEstado.VENCIDO])),
      },
    });

    let vencidos = 0;
    for (const pago of pagosAVerificar) {
      pago.estado = PagoEstado.VENCIDO;
      await this.pagoRepository.save(pago);
      vencidos++;
    }

    return { procesados: pagosAVerificar.length, vencidos };
  }

  async findAll(user?: RequestUser): Promise<Pago[]> {
    const where = user ? this.tenantFilter(user) : {};
    return await this.pagoRepository.find({
      where,
      relations: ['contrato'],
      order: { fechaPagoEsperada: 'DESC' },
    });
  }

  async findByContrato(contratoId: string, user: RequestUser): Promise<Pago[]> {
    const where: any = { contratoId };
    if (user.inmobiliariaId) where.inmobiliariaId = user.inmobiliariaId;
    return await this.pagoRepository.find({
      where,
      relations: ['contrato'],
      order: { fechaPagoEsperada: 'ASC' },
    });
  }

  async findByEstado(estado: PagoEstado, user?: RequestUser): Promise<Pago[]> {
    const where: any = { estado };
    if (user && user.role !== Role.ADMIN) {
      where.inmobiliariaId = user.inmobiliariaId || 'no-access';
    }
    return await this.pagoRepository.find({
      where,
      relations: ['contrato', 'contrato.inquilino', 'contrato.inmueble'],
      order: { fechaPagoEsperada: 'DESC' },
    });
  }

  async findOne(id: string, user?: RequestUser): Promise<Pago> {
    const where: any = { id };
    if (user?.inmobiliariaId) where.inmobiliariaId = user.inmobiliariaId;

    const pago = await this.pagoRepository.findOne({
      where,
      relations: ['contrato'],
    });

    if (!pago) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return pago;
  }

  async update(id: string, updatePagoDto: UpdatePagoDto, user?: RequestUser): Promise<Pago> {
    const pago = await this.findOne(id, user);

    if (pago.estado === PagoEstado.PAGADO) {
      throw new BadRequestException(
        'No se puede modificar un pago que ya está pagado',
      );
    }

    Object.assign(pago, updatePagoDto);
    const guardado = await this.pagoRepository.save(pago);
    return PagoCalculator.aplicar(guardado);
  }

  async remove(id: string): Promise<void> {
    const pago = await this.findOne(id);

    // Prevent deleting payments that are already paid or overdue
    if (pago.estado === PagoEstado.PAGADO || pago.estado === PagoEstado.VENCIDO) {
      throw new BadRequestException(
        `No se puede eliminar un pago en estado ${pago.estado}. Solo se pueden eliminar pagos pendientes.`,
      );
    }

    await this.pagoRepository.remove(pago);
  }

  /**
   * Eliminar pagos pendientes asociados a un contrato.
   * Devuelve la cantidad de pagos eliminados.
   */
  async removePendingByContrato(contratoId: string): Promise<number> {
    // Delete all payments for the contract except those with estado PAGADO or VENCIDO
    const pagosAEliminar = await this.pagoRepository.find({
      where: {
        contratoId,
        estado: Not(In([PagoEstado.PAGADO, PagoEstado.VENCIDO])),
      },
      select: ['id'],
    });

    if (!pagosAEliminar || pagosAEliminar.length === 0) {
      return 0;
    }

    const ids = pagosAEliminar.map((p) => p.id);
    const result = await this.pagoRepository.delete(ids);
    return (result.affected as number) || ids.length;
  }

  async buscar(filtros: {
    contratoId?: string;
    estado?: PagoEstado;
    fechaInicio?: Date;
    fechaFin?: Date;
  }): Promise<Pago[]> {
    const query = this.pagoRepository
      .createQueryBuilder('pago')
      .leftJoinAndSelect('pago.contrato', 'contrato');

    if (filtros.contratoId) {
      query.andWhere('pago.contratoId = :contratoId', {
        contratoId: filtros.contratoId,
      });
    }

    if (filtros.estado) {
      query.andWhere('pago.estado = :estado', { estado: filtros.estado });
    }

    if (filtros.fechaInicio) {
      query.andWhere('pago.fechaPagoEsperada >= :fechaInicio', {
        fechaInicio: filtros.fechaInicio,
      });
    }

    if (filtros.fechaFin) {
      query.andWhere('pago.fechaPagoEsperada <= :fechaFin', {
        fechaFin: filtros.fechaFin,
      });
    }

    return await query.orderBy('pago.fechaPagoEsperada', 'DESC').getMany();
  }

  async obtenerEstadisticasPagos(contratoId?: string) {
    const query = this.pagoRepository.createQueryBuilder('pago');

    if (contratoId) {
      query.where('pago.contratoId = :contratoId', { contratoId });
    }

    const [
      totalPagos,
      pagosPendientes,
      pagosParciales,
      pagosPagados,
      pagosVencidos,
    ] = await Promise.all([
      query.getCount(),
      query
        .clone()
        .where('pago.estado = :estado', { estado: PagoEstado.PENDIENTE })
        .getCount(),
      query
        .clone()
        .where('pago.estado = :estado', { estado: PagoEstado.PARCIAL })
        .getCount(),
      query
        .clone()
        .where('pago.estado = :estado', { estado: PagoEstado.PAGADO })
        .getCount(),
      query
        .clone()
        .where('pago.estado = :estado', { estado: PagoEstado.VENCIDO })
        .getCount(),
    ]);

    const montos = await query
      .select([
        'SUM(pago.montoTotal) as montoTotal',
        'SUM(pago.montoAbonado) as montoAbonado',
      ])
      .getRawOne();

    return {
      totalPagos,
      estadisticas: {
        pendientes: pagosPendientes,
        parciales: pagosParciales,
        pagados: pagosPagados,
        vencidos: pagosVencidos,
      },
      montos: {
        total: Number(montos.montoTotal) || 0,
        abonado: Number(montos.montoAbonado) || 0,
        pendiente:
          (Number(montos.montoTotal) || 0) - (Number(montos.montoAbonado) || 0),
      },
    };
  }

  /**
   * Recolecta toda la deuda de un inquilino identificado por su cédula.
   * Incluye saldo, mora y total a pagar por cuota y agregados.
   * Los pagos vienen recalculados por @AfterLoad → PagoCalculator.
   */
  async verificarDeudaPorCedula(cedula: string) {
    const pagosInquilino = await this.pagoRepository
      .createQueryBuilder('pago')
      .leftJoinAndSelect('pago.contrato', 'contrato')
      .leftJoinAndSelect('contrato.inquilino', 'inquilino')
      .leftJoinAndSelect('contrato.inmueble', 'inmueble')
      .where('inquilino.cedula = :cedula', { cedula })
      .orderBy('pago.fechaPagoEsperada', 'ASC')
      .getMany();

    if (pagosInquilino.length === 0) {
      throw new NotFoundException(
        `No se encontró inquilino con cédula ${cedula}`,
      );
    }

    const inquilino = pagosInquilino[0].contrato.inquilino;

    // Contratos únicos asociados al inquilino
    const contratos = [
      ...new Map(
        pagosInquilino.map((pago) => [pago.contrato.id, pago.contrato]),
      ).values(),
    ];

    // Particionamos por estado en una sola pasada (O(n)).
    const pagosPendientes: Pago[] = [];
    const pagosVencidos: Pago[] = [];
    const pagosParciales: Pago[] = [];
    const pagosPagados: Pago[] = [];

    for (const p of pagosInquilino) {
      switch (p.estado) {
        case PagoEstado.PENDIENTE:
          pagosPendientes.push(p);
          break;
        case PagoEstado.VENCIDO:
          pagosVencidos.push(p);
          break;
        case PagoEstado.PARCIAL:
          pagosParciales.push(p);
          break;
        case PagoEstado.PAGADO:
          pagosPagados.push(p);
          break;
      }
    }

    // Helper que agrega saldo, mora y total a pagar para un grupo de pagos.
    const agrupar = (lista: Pago[]) =>
      lista.reduce(
        (acc, p) => {
          acc.saldo += Number(p.saldoPendiente) || 0;
          acc.mora += Number(p.mora) || 0;
          acc.totalAPagar += Number(p.totalAPagar) || 0;
          return acc;
        },
        { meses: lista.length, saldo: 0, mora: 0, totalAPagar: 0 },
      );

    const agPendientes = agrupar(pagosPendientes);
    const agVencidos = agrupar(pagosVencidos);
    const agParciales = agrupar(pagosParciales);

    // Totales globales (solo cuentan los pagos NO pagados).
    const totalMeses =
      agPendientes.meses + agVencidos.meses + agParciales.meses;
    const totalSaldoCapital =
      agPendientes.saldo + agVencidos.saldo + agParciales.saldo;
    const totalMora = agPendientes.mora + agVencidos.mora + agParciales.mora;
    const totalAPagar =
      agPendientes.totalAPagar +
      agVencidos.totalAPagar +
      agParciales.totalAPagar;

    // Último pago realmente realizado
    const ultimoPagoRealizado = pagosPagados
      .filter((p) => p.fechaPagoReal)
      .sort(
        (a, b) =>
          new Date(b.fechaPagoReal).getTime() -
          new Date(a.fechaPagoReal).getTime(),
      )[0];

    const alDia = totalMeses === 0;

    // Detalle por cuota adeudada (excluye los pagados).
    const cuotas = [...pagosPendientes, ...pagosParciales, ...pagosVencidos]
      .sort(
        (a, b) =>
          new Date(a.fechaPagoEsperada).getTime() -
          new Date(b.fechaPagoEsperada).getTime(),
      )
      .map((p) => ({
        id: p.id,
        contratoId: p.contratoId,
        estado: p.estado,
        fechaPagoEsperada: p.fechaPagoEsperada,
        montoTotal: Number(p.montoTotal),
        montoAbonado: Number(p.montoAbonado),
        saldoPendiente: p.saldoPendiente ?? 0,
        diasRetraso: p.diasRetraso ?? 0,
        mora: p.mora ?? 0,
        totalAPagar: p.totalAPagar ?? 0,
      }));

    return {
      inquilino: {
        id: inquilino.id,
        cedula: inquilino.cedula,
        nombres: inquilino.nombres,
        apellidos: inquilino.apellidos,
        correo: inquilino.correo,
        telefono: inquilino.telefono,
        ciudad: inquilino.ciudad,
      },
      contratos: contratos.map((contrato) => ({
        id: contrato.id,
        canonMensual: Number(contrato.canonMensual),
        estado: contrato.estado,
        fechaInicio: contrato.fechaInicio,
        fechaFin: contrato.fechaFin,
        inmueble: {
          direccion: contrato.inmueble.direccion,
          descripcion: contrato.inmueble.descripcion,
        },
      })),
      deuda: {
        alDia,
        totalMeses,                  // Cantidad de meses (cuotas) adeudados
        totalSaldoCapital,           // Suma de saldos sin mora
        totalMora,                   // Suma de moras de todas las cuotas
        totalAPagar,                 // saldo capital + mora
        desglose: {
          pendientes: agPendientes,  // { meses, saldo, mora, totalAPagar }
          vencidos: agVencidos,
          parciales: agParciales,
        },
        cantidadPagos: {
          pendientes: pagosPendientes.length,
          vencidos: pagosVencidos.length,
          parciales: pagosParciales.length,
          pagados: pagosPagados.length,
          total: pagosInquilino.length,
        },
        cuotas,                      // Detalle cuota a cuota con su mora
        ultimoPago: ultimoPagoRealizado
          ? {
              fecha: ultimoPagoRealizado.fechaPagoReal,
              monto: Number(ultimoPagoRealizado.montoTotal),
              pagoId: ultimoPagoRealizado.id,
            }
          : null,
      },
      resumen: {
        mensaje: alDia
          ? 'El inquilino está al día con sus pagos'
          : `El inquilino debe $${totalAPagar.toLocaleString()} en ${totalMeses} mes(es)`,
        nivel: alDia
          ? 'AL_DIA'
          : pagosVencidos.length > 0
            ? 'MOROSO'
            : 'PENDIENTE',
      },
    };
  }
}
