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

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
  ) {}

  async crearPago(createPagoDto: CreatePagoDto): Promise<Pago> {
    // Verificar que el contrato existe
    const contrato = await this.contratoRepository.findOne({
      where: { id: createPagoDto.contratoId },
    });

    if (!contrato) {
      throw new NotFoundException(
        `Contrato con ID ${createPagoDto.contratoId} no encontrado`,
      );
    }

    // Calcular fecha de pago esperada basada en la fecha de inicio del contrato
    const fechaPagoEsperada = createPagoDto.fechaPagoEsperada;

    // Si no se proporciona fecha, usar el canon mensual del contrato
    const montoTotal = createPagoDto.montoTotal || contrato.canonMensual;

    const pago = this.pagoRepository.create({
      contratoId: createPagoDto.contratoId,
      montoTotal,
      fechaPagoEsperada,
      estado: PagoEstado.PENDIENTE,
      montoAbonado: 0,
    });

    return await this.pagoRepository.save(pago);
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
          montoTotal: contrato.canonMensual,
          fechaPagoEsperada: fechaPago,
          estado: PagoEstado.PENDIENTE,
          montoAbonado: 0,
        });

        const pagoGuardado = await this.pagoRepository.save(pago);
        pagos.push(pagoGuardado);
      }
    }

    return pagos;
  }

  async registrarAbono(
    id: string,
    registrarAbonoDto: RegistrarAbonoDto,
  ): Promise<Pago> {
    const pago = await this.findOne(id);

    if (pago.estado === PagoEstado.VENCIDO) {
      throw new BadRequestException('No se puede abonar a un pago vencido');
    }

    if (pago.estado === PagoEstado.PAGADO) {
      throw new BadRequestException('El pago ya está completamente pagado');
    }

    const nuevoMontoAbonado =
      Number(pago.montoAbonado) + Number(registrarAbonoDto.monto);

    if (nuevoMontoAbonado > Number(pago.montoTotal)) {
      throw new BadRequestException(
        'El monto del abono excede el monto total del pago',
      );
    }

    pago.montoAbonado = nuevoMontoAbonado;

    if (nuevoMontoAbonado === Number(pago.montoTotal)) {
      pago.estado = PagoEstado.PAGADO;
      pago.fechaPagoReal = registrarAbonoDto.fechaPago
        ? new Date(registrarAbonoDto.fechaPago)
        : new Date();
    } else {
      pago.estado = PagoEstado.PARCIAL;
    }

    return await this.pagoRepository.save(pago);
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

  async findAll(): Promise<Pago[]> {
    return await this.pagoRepository.find({
      relations: ['contrato'],
      order: { fechaPagoEsperada: 'DESC' },
    });
  }

  async findByContrato(contratoId: string): Promise<Pago[]> {
    return await this.pagoRepository.find({
      where: { contratoId },
      relations: ['contrato'],
      order: { fechaPagoEsperada: 'ASC' },
    });
  }

  async findByEstado(estado: PagoEstado): Promise<Pago[]> {
    return await this.pagoRepository.find({
      where: { estado },
      relations: ['contrato', 'contrato.inquilino', 'contrato.inmueble'],
      order: { fechaPagoEsperada: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Pago> {
    const pago = await this.pagoRepository.findOne({
      where: { id },
      relations: ['contrato'],
    });

    if (!pago) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return pago;
  }

  async update(id: string, updatePagoDto: UpdatePagoDto): Promise<Pago> {
    const pago = await this.findOne(id);

    if (pago.estado === PagoEstado.PAGADO) {
      throw new BadRequestException(
        'No se puede modificar un pago que ya está pagado',
      );
    }

    Object.assign(pago, updatePagoDto);
    return await this.pagoRepository.save(pago);
  }

  async remove(id: string): Promise<void> {
    const pago = await this.findOne(id);
    await this.pagoRepository.remove(pago);
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

  async verificarDeudaPorCedula(cedula: string) {
    // Buscar inquilino por cédula
    const queryInquilino = this.pagoRepository
      .createQueryBuilder('pago')
      .leftJoinAndSelect('pago.contrato', 'contrato')
      .leftJoinAndSelect('contrato.inquilino', 'inquilino')
      .leftJoinAndSelect('contrato.inmueble', 'inmueble')
      .where('inquilino.cedula = :cedula', { cedula });

    const pagosInquilino = await queryInquilino.getMany();

    if (pagosInquilino.length === 0) {
      throw new NotFoundException(
        `No se encontró inquilino con cédula ${cedula}`,
      );
    }

    const inquilino = pagosInquilino[0].contrato.inquilino;

    // Obtener contratos únicos del inquilino
    const contratos = [
      ...new Map(
        pagosInquilino.map((pago) => [pago.contrato.id, pago.contrato]),
      ).values(),
    ];

    // Calcular estadísticas de deuda
    const pagosPendientes = pagosInquilino.filter(
      (p) => p.estado === PagoEstado.PENDIENTE,
    );
    const pagosVencidos = pagosInquilino.filter(
      (p) => p.estado === PagoEstado.VENCIDO,
    );
    const pagosParciales = pagosInquilino.filter(
      (p) => p.estado === PagoEstado.PARCIAL,
    );
    const pagosPagados = pagosInquilino.filter(
      (p) => p.estado === PagoEstado.PAGADO,
    );

    // Calcular deuda total
    const deudaPendientes = pagosPendientes.reduce(
      (total, pago) =>
        total + (Number(pago.montoTotal) - Number(pago.montoAbonado)),
      0,
    );

    const deudaVencidos = pagosVencidos.reduce(
      (total, pago) =>
        total + (Number(pago.montoTotal) - Number(pago.montoAbonado)),
      0,
    );

    const deudaParciales = pagosParciales.reduce(
      (total, pago) =>
        total + (Number(pago.montoTotal) - Number(pago.montoAbonado)),
      0,
    );

    const totalDeuda = deudaPendientes + deudaVencidos + deudaParciales;

    // Encontrar último pago realizado
    const ultimoPagoRealizado = pagosPagados
      .filter((p) => p.fechaPagoReal)
      .sort(
        (a, b) =>
          new Date(b.fechaPagoReal).getTime() -
          new Date(a.fechaPagoReal).getTime(),
      )[0];

    // Determinar si está al día (no tiene pagos vencidos ni parciales con mora)
    const alDia = pagosVencidos.length === 0 && pagosParciales.length === 0;

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
      estadoDeuda: {
        alDia,
        totalDeuda,
        desglose: {
          pendientes: deudaPendientes,
          vencidos: deudaVencidos,
          parciales: deudaParciales,
        },
        cantidadPagos: {
          pendientes: pagosPendientes.length,
          vencidos: pagosVencidos.length,
          parciales: pagosParciales.length,
          pagados: pagosPagados.length,
          total: pagosInquilino.length,
        },
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
          : `El inquilino debe $${totalDeuda.toLocaleString()} en total`,
        nivel: alDia
          ? 'AL_DIA'
          : pagosVencidos.length > 0
            ? 'MOROSO'
            : 'PENDIENTE',
      },
    };
  }
}
