import { IsEmail, IsString, IsPhoneNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'Número de cédula del inquilino' })
  @IsString()
  cedula: string;

  @ApiProperty({ description: 'Nombres del inquilino' })
  @IsString()
  nombres: string;

  @ApiProperty({ description: 'Apellidos del inquilino' })
  @IsString()
  apellidos: string;

  @ApiProperty({ description: 'Número de teléfono del inquilino' })
  @IsString()
  telefono: string;

  @ApiProperty({ description: 'Correo electrónico del inquilino' })
  @IsEmail()
  correo: string;

  @ApiProperty({ description: 'Dirección de residencia del inquilino' })
  @IsString()
  direccion: string;

  @ApiProperty({ description: 'Ciudad de residencia del inquilino' })
  @IsString()
  ciudad: string;

  @ApiProperty({ description: 'Contacto de emergencia del inquilino' })
  @IsString()
  contactoEmergencia: string;

  @ApiProperty({ description: 'Estado activo del inquilino', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}