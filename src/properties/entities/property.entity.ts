import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('properties')
export class Property {
  @ApiProperty({ description: 'UUID único del inmueble' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Dirección del inmueble' })
  @Column({ type: 'varchar', length: 500 })
  direccion: string;

  @ApiProperty({ description: 'Código del servicio de agua' })
  @Column({ type: 'varchar', length: 100 })
  codigoServicioAgua: string;

  @ApiProperty({ description: 'Código del servicio de gas' })
  @Column({ type: 'varchar', length: 100 })
  codigoServicioGas: string;

  @ApiProperty({ description: 'Código del servicio de luz' })
  @Column({ type: 'varchar', length: 100 })
  codigoServicioLuz: string;

  @ApiProperty({ description: 'Estado de disponibilidad del inmueble' })
  @Column({ type: 'boolean', default: true })
  disponible: boolean;

  @ApiProperty({ description: 'Descripción detallada del inmueble' })
  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización del registro' })
  @UpdateDateColumn()
  updatedAt: Date;
}
