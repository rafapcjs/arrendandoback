import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  Validate,
} from 'class-validator';
import { MatchPasswords } from '../../common/validators/match-passwords.validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'abc12345',
  })
  @IsString({ message: 'La contraseña actual debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword: string;

  @ApiProperty({
    description:
      'Nueva contraseña (mínimo 8 caracteres, debe contener al menos una mayúscula, una minúscula y un número)',
    example: 'MiNuevaPassword123',
  })
  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message:
      'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'MiNuevaPassword123',
  })
  @IsString({
    message: 'La confirmación de contraseña debe ser una cadena de texto',
  })
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  @Validate(MatchPasswords, ['newPassword'], {
    message:
      'La confirmación de contraseña no coincide con la nueva contraseña',
  })
  confirmPassword: string;
}
