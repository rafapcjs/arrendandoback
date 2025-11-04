import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PagosService } from './pagos.service';

@Injectable()
export class PagosCron {
  private readonly logger = new Logger(PagosCron.name);

  constructor(private readonly pagosService: PagosService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async verificarPagosVencidosAutomatico() {
    this.logger.log('Iniciando verificación automática de pagos vencidos...');

    try {
      const resultado = await this.pagosService.verificarPagosVencidos();

      this.logger.log(
        `Verificación completada: ${resultado.procesados} pagos procesados, ${resultado.vencidos} marcados como vencidos`,
      );
    } catch (error) {
      this.logger.error('Error en verificación de pagos vencidos:', error);
    }
  }

  @Cron('0 0 1 * *') // El primer día de cada mes a medianoche
  async generarPagosMensualesAutomatico() {
    this.logger.log('Iniciando generación automática de pagos mensuales...');

    try {
      // Aquí puedes implementar lógica para generar pagos automáticamente
      // por ejemplo, para contratos activos
      this.logger.log('Generación de pagos mensuales completada');
    } catch (error) {
      this.logger.error('Error en generación de pagos mensuales:', error);
    }
  }
}
