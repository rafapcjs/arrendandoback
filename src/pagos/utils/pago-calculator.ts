import { Pago } from '../entities/pago.entity';

/**
 * Tasa diaria de mora aplicada sobre el saldo pendiente (1 % por día de retraso).
 */
const TASA_MORA_DIARIA = 0.01;

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Helper puro encargado de derivar los campos financieros de un pago.
 *
 * Reglas de negocio:
 *  - Saldo pendiente = montoTotal − montoAbonado (nunca negativo).
 *  - Mora generada (bruta) = saldoPendiente × 1 % × días de retraso.
 *  - Mora pendiente = max(moraGenerada − moraAbonada, 0).
 *  - Total a pagar = saldoPendiente + mora pendiente.
 *  - Si la cuota no está vencida o el saldo es ≤ 0, la mora generada es 0.
 */
export class PagoCalculator {
  /**
   * Calcula y asigna los campos derivados sobre el pago recibido.
   * Se usa una fecha de referencia inyectable para facilitar pruebas.
   */
  static aplicar(pago: Pago, fechaReferencia: Date = new Date()): Pago {
    if (!pago) return pago;

    const montoTotal = Number(pago.montoTotal) || 0;
    const montoAbonado = Number(pago.montoAbonado) || 0;
    const moraAbonada = Number(pago.moraAbonada) || 0;

    const saldoPendiente = Math.max(montoTotal - montoAbonado, 0);
    const diasRetraso = PagoCalculator.calcularDiasRetraso(
      pago.fechaPagoEsperada,
      fechaReferencia,
    );

    // Mora bruta generada hasta hoy sobre el saldo de capital aún vivo.
    const moraGenerada =
      saldoPendiente > 0 && diasRetraso > 0
        ? saldoPendiente * TASA_MORA_DIARIA * diasRetraso
        : 0;

    // Mora pendiente = generada menos lo ya pagado por mora (nunca negativa).
    const moraPendiente = Math.max(moraGenerada - moraAbonada, 0);

    pago.saldoPendiente = PagoCalculator.redondear(saldoPendiente);
    pago.diasRetraso = diasRetraso;
    pago.moraGenerada = PagoCalculator.redondear(moraGenerada);
    pago.mora = PagoCalculator.redondear(moraPendiente);
    pago.totalAPagar = PagoCalculator.redondear(saldoPendiente + moraPendiente);
    pago.totalRecibido = PagoCalculator.redondear(montoAbonado + moraAbonada);

    return pago;
  }

  /**
   * Aplica el cálculo sobre una colección completa de pagos en una sola pasada.
   */
  static aplicarLista(pagos: Pago[], fechaReferencia: Date = new Date()): Pago[] {
    if (!pagos?.length) return pagos ?? [];
    for (const pago of pagos) {
      PagoCalculator.aplicar(pago, fechaReferencia);
    }
    return pagos;
  }

  /**
   * Días enteros transcurridos entre la fecha de vencimiento y la fecha actual.
   * Devuelve 0 cuando la cuota aún no está vencida.
   */
  private static calcularDiasRetraso(
    fechaVencimiento: Date | string,
    fechaActual: Date,
  ): number {
    if (!fechaVencimiento) return 0;

    const vencimiento = PagoCalculator.aMedianoche(new Date(fechaVencimiento));
    const hoy = PagoCalculator.aMedianoche(new Date(fechaActual));

    if (Number.isNaN(vencimiento.getTime()) || hoy <= vencimiento) return 0;

    return Math.floor((hoy.getTime() - vencimiento.getTime()) / MS_POR_DIA);
  }

  private static aMedianoche(fecha: Date): Date {
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }

  /** Redondea a 2 decimales para evitar arrastre de errores de punto flotante. */
  private static redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}
