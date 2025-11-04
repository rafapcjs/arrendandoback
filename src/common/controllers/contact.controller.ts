import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  Logger,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse 
} from '@nestjs/swagger';
import { EmailService } from '../services/email.service';
import { ContactFormDto, ContactFormResponseDto } from '../dto/contact-form.dto';

@ApiTags('📞 Contacto')
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('send-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar mensaje de contacto',
    description: 'Permite a los usuarios enviar mensajes de contacto que serán reenviados al administrador del sistema por correo electrónico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje enviado exitosamente',
    type: ContactFormResponseDto,
    example: {
      success: true,
      message: 'Tu mensaje ha sido enviado exitosamente. Te contactaremos pronto.',
    },
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
    example: {
      statusCode: 400,
      message: [
        'El nombre es requerido',
        'Debe proporcionar un correo electrónico válido',
        'El mensaje debe tener entre 10 y 1000 caracteres'
      ],
      error: 'Bad Request',
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor al enviar el correo',
    example: {
      statusCode: 500,
      message: 'Error interno del servidor al procesar la solicitud',
      error: 'Internal Server Error',
    },
  })
  async sendContactEmail(
    @Body() contactFormDto: ContactFormDto,
  ): Promise<ContactFormResponseDto> {
    const { name, email, phone, message } = contactFormDto;

    try {
      this.logger.log(`📧 Nuevo mensaje de contacto recibido de: ${name} (${email})`);

      // Validación adicional de seguridad
      if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
        throw new BadRequestException('Todos los campos son requeridos y no pueden estar vacíos');
      }

      // Enviar el correo al administrador
      await this.emailService.sendContactFormEmail(name, email, phone, message);

      this.logger.log(`✅ Mensaje de contacto enviado exitosamente desde: ${email}`);

      return {
        success: true,
        message: 'Tu mensaje ha sido enviado exitosamente. Te contactaremos pronto.',
      };

    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje de contacto desde ${email}:`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno del servidor al procesar la solicitud. Por favor, inténtalo de nuevo más tarde.'
      );
    }
  }
}