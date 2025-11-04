import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>(
        'SMTP_FROM',
        'noreply@arrendando.com',
      ),
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Error enviando el correo');
    }
  }

  async sendPasswordRecoveryEmail(
    to: string,
    newPassword: string,
  ): Promise<void> {
    await this.sendEmail(
      to,
      '🔐 Recuperación de Contraseña - Arrendando Admin',
      this.getPasswordRecoveryTemplate(newPassword)
    );
  }

  async sendContactFormEmail(
    name: string,
    email: string,
    phone: string,
    message: string,
  ): Promise<void> {
    const adminEmail = this.configService.get<string>(
      'ADMIN_EMAIL',
      'rafaelcorredorgambin1@gmail.com',
    );
    
    await this.sendEmail(
      adminEmail,
      `📞 Nuevo Mensaje de Contacto de ${name} - Arrendando`,
      this.getContactFormTemplate(name, email, phone, message)
    );
  }

  private getPasswordRecoveryTemplate(newPassword: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña</title>
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
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
          
          .password-container {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
            border: 2px solid #e1e8ed;
          }
          
          .password-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
          }
          
          .password {
            font-family: 'Courier New', monospace;
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            background: #ffffff;
            padding: 15px 25px;
            border-radius: 10px;
            border: 2px dashed #4facfe;
            display: inline-block;
            letter-spacing: 4px;
            margin: 10px 0;
            box-shadow: 0 4px 12px rgba(79, 172, 254, 0.2);
          }
          
          .warning {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
            border-left: 4px solid #ff6b6b;
          }
          
          .warning-title {
            font-weight: 700;
            color: #d63031;
            margin-bottom: 8px;
            font-size: 16px;
          }
          
          .warning-text {
            color: #74b9ff;
            font-size: 14px;
            line-height: 1.5;
          }
          
          .instructions {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .instructions h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .instructions ol {
            color: #555;
            padding-left: 20px;
          }
          
          .instructions li {
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
          
          .footer-text {
            font-size: 14px;
            opacity: 0.8;
            line-height: 1.5;
          }
          
          .contact-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .contact-info p {
            margin: 5px 0;
            font-size: 13px;
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
            
            .password {
              font-size: 24px;
              letter-spacing: 2px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 Arrendando</h1>
            <div class="subtitle">Plataforma de Gestión de Arrendamientos</div>
          </div>
          
          <div class="content">
            <div class="greeting">¡Hola, Administrador!</div>
            
            <div class="message">
              Hemos recibido una solicitud para recuperar tu contraseña de administrador. 
              Tu nueva contraseña temporal ha sido generada exitosamente.
            </div>
            
            <div class="password-container">
              <div class="password-label">Tu nueva contraseña temporal</div>
              <div class="password">${newPassword}</div>
            </div>
            
            <div class="warning">
              <div class="warning-title">⚠️ Importante - Medidas de Seguridad</div>
              <div class="warning-text">
                Esta contraseña es temporal y única. Por tu seguridad, te recomendamos 
                cambiarla inmediatamente después de iniciar sesión.
              </div>
            </div>
            
            <div class="instructions">
              <h3>📋 Instrucciones de Uso</h3>
              <ol>
                <li>Accede al panel de administración con tu email y esta contraseña temporal</li>
                <li>Ve inmediatamente a la sección de "Perfil" o "Configuración"</li>
                <li>Cambia tu contraseña por una nueva y segura</li>
                <li>Guarda tu nueva contraseña en un lugar seguro</li>
                <li>No compartas esta información con nadie</li>
              </ol>
            </div>
            
            <div class="message">
              Si no solicitaste este cambio de contraseña, por favor contacta inmediatamente 
              con el equipo técnico para verificar la seguridad de tu cuenta.
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-title">🔐 Arrendando - Administración</div>
            <div class="footer-text">
              Sistema seguro de gestión de propiedades y arrendamientos
            </div>
            
            <div class="contact-info">
              <p><strong>📧 Soporte:</strong> rafaelcorredorgambin1@gmail.com</p>
              <p><strong>🌐 Web:</strong> www.arrendando.com</p>
              <p><strong>📱 WhatsApp:</strong> +57 300 XXX XXXX</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getContactFormTemplate(name: string, email: string, phone: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Mensaje de Contacto</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          
          .contact-info {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #667eea;
          }
          
          .contact-field {
            margin-bottom: 15px;
          }
          
          .field-label {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
            display: block;
            font-size: 14px;
          }
          
          .field-value {
            color: #34495e;
            font-size: 16px;
            background: #ffffff;
            padding: 10px 15px;
            border-radius: 8px;
            border: 1px solid #e1e8ed;
          }
          
          .message-content {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
            border: 1px solid #e9ecef;
          }
          
          .message-content h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .message-text {
            color: #555;
            line-height: 1.6;
            white-space: pre-wrap;
            background: #ffffff;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e1e8ed;
          }
          
          .timestamp {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin: 20px 0;
            padding: 15px;
            background: #f1f2f6;
            border-radius: 8px;
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
          
          .footer-text {
            font-size: 14px;
            opacity: 0.8;
            line-height: 1.5;
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
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📞 Nuevo Mensaje de Contacto</h1>
            <div class="subtitle">Arrendando - Sistema de Gestión</div>
          </div>
          
          <div class="content">
            <div class="contact-info">
              <div class="contact-field">
                <span class="field-label">👤 Nombre:</span>
                <div class="field-value">${name}</div>
              </div>
              
              <div class="contact-field">
                <span class="field-label">📧 Correo Electrónico:</span>
                <div class="field-value">${email}</div>
              </div>
              
              <div class="contact-field">
                <span class="field-label">📱 Teléfono:</span>
                <div class="field-value">${phone}</div>
              </div>
            </div>
            
            <div class="message-content">
              <h3>💬 Mensaje:</h3>
              <div class="message-text">${message}</div>
            </div>
            
            <div class="timestamp">
              📅 Recibido el ${new Date().toLocaleString('es-CO')}
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #e8f4fd; border-radius: 10px; border-left: 4px solid #3498db;">
              <p style="color: #2c3e50; margin-bottom: 10px;"><strong>💡 Recordatorio:</strong></p>
              <p style="color: #555; font-size: 14px; line-height: 1.5;">
                Recuerda responder a este mensaje lo antes posible para brindar un excelente servicio al cliente.
                Puedes responder directamente al correo: <strong>${email}</strong>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-title">🏠 Arrendando</div>
            <div class="footer-text">
              Sistema de Gestión de Propiedades y Arrendamientos
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
