import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InmobiliariaEstado } from '../entities/inmobiliaria.entity';

export class CreateInmobiliariaDto {
  @ApiProperty({ example: 'Inmobiliaria Ejemplo S.A.S.' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString()
  nit: string;

  @ApiProperty({ example: 'Calle 10 # 20-30, Bogotá' })
  @IsString()
  direccion: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  telefono: string;

  @ApiProperty({ example: 'contacto@inmobiliaria.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: InmobiliariaEstado, required: false })
  @IsOptional()
  @IsEnum(InmobiliariaEstado)
  estado?: InmobiliariaEstado;
}
