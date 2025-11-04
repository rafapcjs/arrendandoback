import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contrato } from '../contratos/entities/contrato.entity';
import { Pago, PagoEstado } from '../pagos/entities/pago.entity';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Contrato)
    private contratoRepository: Repository<Contrato>,
    @InjectRepository(Pago)
    private pagoRepository: Repository<Pago>,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkPaymentReminders() {
    this.logger.log('🔄 Iniciando verificación de recordatorios de pago...');
    
    try {
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      
      // Buscar pagos pendientes que vencen en 2 días
      const pendingPayments = await this.pagoRepository
        .createQueryBuilder('pago')
        .innerJoinAndSelect('pago.contrato', 'contrato')
        .innerJoinAndSelect('contrato.inquilino', 'inquilino')
        .innerJoinAndSelect('contrato.inmueble', 'inmueble')
        .where('pago.estado = :estado', { estado: PagoEstado.PENDIENTE })
        .andWhere('DATE(pago.fechaPagoEsperada) = DATE(:fecha)', { 
          fecha: twoDaysFromNow.toISOString().split('T')[0] 
        })
        .getMany();

      for (const pago of pendingPayments) {
        await this.sendPaymentReminder(pago);
      }

      this.logger.log(`✅ Recordatorios de pago enviados: ${pendingPayments.length}`);
    } catch (error) {
      this.logger.error('❌ Error en recordatorios de pago:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkContractExpirations() {
    this.logger.log('🔄 Iniciando verificación de vencimientos de contrato...');
    
    try {
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      // Buscar contratos que vencen en 3 meses
      const expiringContracts = await this.contratoRepository
        .createQueryBuilder('contrato')
        .innerJoinAndSelect('contrato.inquilino', 'inquilino')
        .innerJoinAndSelect('contrato.inmueble', 'inmueble')
        .where('contrato.estado = :estado', { estado: 'ACTIVO' })
        .andWhere('DATE(contrato.fechaFin) = DATE(:fecha)', { 
          fecha: threeMonthsFromNow.toISOString().split('T')[0] 
        })
        .getMany();

      for (const contrato of expiringContracts) {
        await this.sendContractExpirationReminder(contrato);
      }

      this.logger.log(`✅ Recordatorios de vencimiento enviados: ${expiringContracts.length}`);
    } catch (error) {
      this.logger.error('❌ Error en recordatorios de vencimiento:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_11AM)
  async checkOverduePayments() {
    this.logger.log('🔄 Iniciando verificación de pagos vencidos...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Buscar pagos que están vencidos (fecha de vencimiento menor a hoy)
      const overduePayments = await this.pagoRepository
        .createQueryBuilder('pago')
        .where('pago.estado = :estado', { estado: PagoEstado.PENDIENTE })
        .andWhere('pago.fechaPagoEsperada < :fecha', { fecha: today })
        .getMany();

      // Cambiar estado a 'vencido'
      for (const pago of overduePayments) {
        await this.pagoRepository.update(pago.id, { estado: PagoEstado.VENCIDO });
      }

      this.logger.log(`✅ Pagos marcados como vencidos: ${overduePayments.length}`);
    } catch (error) {
      this.logger.error('❌ Error actualizando pagos vencidos:', error);
    }
  }

  async sendPaymentReminder(pago: Pago) {
    try {
      const emailContent = this.getPaymentReminderTemplate(pago);
      
      await this.emailService.sendEmail(
        pago.contrato.inquilino.correo,
        '💰 Recordatorio de Pago - Arrendando',
        emailContent
      );
      
      this.logger.log(`📧 Recordatorio de pago enviado a: ${pago.contrato.inquilino.correo}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando recordatorio de pago a ${pago.contrato.inquilino.correo}:`, error);
    }
  }

  async sendContractExpirationReminder(contrato: Contrato) {
    try {
      const emailContent = this.getContractExpirationTemplate(contrato);
      
      await this.emailService.sendEmail(
        contrato.inquilino.correo,
        '📄 Recordatorio de Vencimiento de Contrato - Arrendando',
        emailContent
      );
      
      this.logger.log(`📧 Recordatorio de vencimiento enviado a: ${contrato.inquilino.correo}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando recordatorio de vencimiento a ${contrato.inquilino.correo}:`, error);
    }
  }

  async sendManualPaymentReminder(pagoId: string) {
    const pago = await this.pagoRepository
      .createQueryBuilder('pago')
      .innerJoinAndSelect('pago.contrato', 'contrato')
      .innerJoinAndSelect('contrato.inquilino', 'inquilino')
      .innerJoinAndSelect('contrato.inmueble', 'inmueble')
      .where('pago.id = :id', { id: pagoId })
      .getOne();

    if (pago) {
      await this.sendPaymentReminder(pago);
    }
  }

  async sendManualContractExpirationReminder(contratoId: string) {
    const contrato = await this.contratoRepository
      .createQueryBuilder('contrato')
      .innerJoinAndSelect('contrato.inquilino', 'inquilino')
      .innerJoinAndSelect('contrato.inmueble', 'inmueble')
      .where('contrato.id = :id', { id: contratoId })
      .getOne();

    if (contrato) {
      await this.sendContractExpirationReminder(contrato);
    }
  }

  private getPaymentReminderTemplate(pago: Pago): string {
    const daysUntilDue = Math.ceil(
      (new Date(pago.fechaPagoEsperada).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recordatorio de Pago</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
            font-weight: 600;
          }
          
          .message {
            font-size: 16px;
            color: #555;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          
          .payment-info {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #ff6b6b;
          }
          
          .payment-amount {
            font-size: 32px;
            font-weight: bold;
            color: #d63031;
            text-align: center;
            margin: 15px 0;
          }
          
          .payment-details {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .payment-details h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e9ecef;
          }
          
          .detail-label {
            font-weight: 600;
            color: #666;
          }
          
          .detail-value {
            color: #2c3e50;
          }
          
          .urgency {
            background: linear-gradient(135deg, #ff7675 0%, #d63031 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          }
          
          .urgency-title {
            font-weight: 700;
            font-size: 18px;
            margin-bottom: 8px;
          }
          
          .footer {
            background: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
          }
          
          .footer-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .contact-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          @media (max-width: 600px) {
            body {
              padding: 20px 10px;
            }
            
            .container {
              border-radius: 15px;
            }
            
            .header, .content, .footer {
              padding: 25px 20px;
            }
            
            .payment-amount {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Recordatorio de Pago</h1>
            <div class="subtitle">Arrendando - Gestión de Propiedades</div>
          </div>
          
          <div class="content">
            <div class="greeting">¡Hola, ${pago.contrato.inquilino.nombres}!</div>
            
            <div class="message">
              Te recordamos que tienes un pago próximo a vencer. Es importante que realices 
              tu pago a tiempo para evitar inconvenientes.
            </div>
            
            <div class="payment-info">
              <div style="text-align: center; color: #d63031; font-weight: 600; margin-bottom: 10px;">
                Monto a Pagar
              </div>
              <div class="payment-amount">$${pago.montoTotal.toLocaleString('es-CO')}</div>
            </div>
            
            <div class="payment-details">
              <h3>📋 Detalles del Pago</h3>
              <div class="detail-row">
                <span class="detail-label">📅 Fecha de Vencimiento:</span>
                <span class="detail-value">${new Date(pago.fechaPagoEsperada).toLocaleDateString('es-CO')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🏠 Propiedad:</span>
                <span class="detail-value">${pago.contrato.inmueble.direccion}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📄 Concepto:</span>
                <span class="detail-value">Arriendo mensual</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">⏰ Días restantes:</span>
                <span class="detail-value">${daysUntilDue} días</span>
              </div>
            </div>
            
            ${daysUntilDue <= 1 ? `
            <div class="urgency">
              <div class="urgency-title">⚠️ URGENTE</div>
              <div>Tu pago vence ${daysUntilDue === 0 ? 'HOY' : 'MAÑANA'}. 
              Por favor realiza el pago lo antes posible.</div>
            </div>
            ` : ''}
            
            <div class="message">
              Para realizar tu pago, por favor contacta con la administración o utiliza 
              los métodos de pago acordados en tu contrato.
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-title">🏠 Arrendando</div>
            <div>Sistema de Gestión de Propiedades</div>
            
            <div class="contact-info">
              <p><strong>📧 Contacto:</strong> rafaelcorredorgambin1@gmail.com</p>
              <p><strong>📱 WhatsApp:</strong> +57 300 XXX XXXX</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getContractExpirationTemplate(contrato: Contrato): string {
    const monthsUntilExpiration = Math.ceil(
      (new Date(contrato.fechaFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vencimiento de Contrato</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
            font-weight: 600;
          }
          
          .message {
            font-size: 16px;
            color: #555;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          
          .contract-info {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #f39c12;
          }
          
          .expiration-date {
            font-size: 24px;
            font-weight: bold;
            color: #e67e22;
            text-align: center;
            margin: 15px 0;
          }
          
          .contract-details {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .contract-details h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e9ecef;
          }
          
          .detail-label {
            font-weight: 600;
            color: #666;
          }
          
          .detail-value {
            color: #2c3e50;
          }
          
          .recommendations {
            background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%);
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .recommendations h3 {
            color: #27ae60;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .recommendations ul {
            color: #2c3e50;
            padding-left: 20px;
          }
          
          .recommendations li {
            margin-bottom: 8px;
            line-height: 1.5;
          }
          
          .footer {
            background: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
          }
          
          .footer-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .contact-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          @media (max-width: 600px) {
            body {
              padding: 20px 10px;
            }
            
            .container {
              border-radius: 15px;
            }
            
            .header, .content, .footer {
              padding: 25px 20px;
            }
            
            .expiration-date {
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Vencimiento de Contrato</h1>
            <div class="subtitle">Arrendando - Gestión de Propiedades</div>
          </div>
          
          <div class="content">
            <div class="greeting">¡Hola, ${contrato.inquilino.nombres}!</div>
            
            <div class="message">
              Te informamos que tu contrato de arrendamiento está próximo a vencer. 
              Es importante que tomes las medidas necesarias con anticipación.
            </div>
            
            <div class="contract-info">
              <div style="text-align: center; color: #e67e22; font-weight: 600; margin-bottom: 10px;">
                Fecha de Vencimiento
              </div>
              <div class="expiration-date">${new Date(contrato.fechaFin).toLocaleDateString('es-CO')}</div>
              <div style="text-align: center; color: #e67e22; font-size: 14px; margin-top: 10px;">
                Faltan aproximadamente ${monthsUntilExpiration} meses
              </div>
            </div>
            
            <div class="contract-details">
              <h3>📋 Detalles del Contrato</h3>
              <div class="detail-row">
                <span class="detail-label">🏠 Propiedad:</span>
                <span class="detail-value">${contrato.inmueble.direccion}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Fecha de Inicio:</span>
                <span class="detail-value">${new Date(contrato.fechaInicio).toLocaleDateString('es-CO')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Fecha de Fin:</span>
                <span class="detail-value">${new Date(contrato.fechaFin).toLocaleDateString('es-CO')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">💰 Valor Mensual:</span>
                <span class="detail-value">$${contrato.canonMensual.toLocaleString('es-CO')}</span>
              </div>
            </div>
            
            <div class="recommendations">
              <h3>💡 Recomendaciones</h3>
              <ul>
                <li>Contacta con la administración para discutir la renovación del contrato</li>
                <li>Revisa las condiciones actuales y posibles actualizaciones</li>
                <li>Programa una reunión para negociar los términos de renovación</li>
                <li>Si no planeas renovar, informa con anticipación según lo establecido en el contrato</li>
                <li>Asegúrate de cumplir con todos los pagos pendientes</li>
              </ul>
            </div>
            
            <div class="message">
              Para cualquier consulta sobre la renovación o terminación del contrato, 
              no dudes en contactarnos. Estamos aquí para ayudarte.
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-title">🏠 Arrendando</div>
            <div>Sistema de Gestión de Propiedades</div>
            
            <div class="contact-info">
              <p><strong>📧 Contacto:</strong> rafaelcorredorgambin1@gmail.com</p>
              <p><strong>📱 WhatsApp:</strong> +57 300 XXX XXXX</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}