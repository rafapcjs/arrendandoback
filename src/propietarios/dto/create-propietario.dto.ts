import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropietarioDto {
  @ApiProperty({ description: 'UUID de la inmobiliaria (solo ADMIN)', required: false })
  @IsOptional()
  @IsUUID()
  inmobiliariaId?: string;

  @ApiProperty({ example: 'Carlos Ramírez' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  documento: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  telefono: string;

  @ApiProperty({ example: 'carlos@correo.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}
