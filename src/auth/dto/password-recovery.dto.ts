import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class PasswordRecoveryDto {
  @ApiProperty({
    description: 'Email del usuario administrador',
    example: 'admin@arrendando.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;
}
