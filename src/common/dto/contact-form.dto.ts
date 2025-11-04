import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactFormDto {
  @ApiProperty({
    description: 'Nombre completo de la persona que envía el mensaje',
    example: 'Juan Pérez',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Dirección de correo electrónico del remitente',
    example: 'juan.perez@email.com',
  })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  email: string;

  @ApiProperty({
    description: 'Número de teléfono del remitente',
    example: '+57 300 123 4567',
    minLength: 7,
    maxLength: 20,
  })
  @IsNotEmpty({ message: 'El número de teléfono es requerido' })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @Length(7, 20, { message: 'El teléfono debe tener entre 7 y 20 caracteres' })
  phone: string;

  @ApiProperty({
    description: 'Mensaje o consulta que desea enviar',
    example: 'Hola, me gustaría obtener más información sobre sus servicios de arrendamiento...',
    minLength: 10,
    maxLength: 1000,
  })
  @IsNotEmpty({ message: 'El mensaje es requerido' })
  @IsString({ message: 'El mensaje debe ser una cadena de texto' })
  @Length(10, 1000, { message: 'El mensaje debe tener entre 10 y 1000 caracteres' })
  message: string;
}

export class ContactFormResponseDto {
  @ApiProperty({
    description: 'Indica si el mensaje fue enviado exitosamente',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de respuesta para el usuario',
    example: 'Tu mensaje ha sido enviado exitosamente. Te contactaremos pronto.',
  })
  message: string;
}