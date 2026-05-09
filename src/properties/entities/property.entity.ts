import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';

@Entity('properties')
export class Property {
  @ApiProperty({ description: 'UUID único del inmueble' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'UUID de la inmobiliaria propietaria' })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  inmobiliariaId: string;

  @ApiProperty({ description: 'UUID del propietario del inmueble', required: false })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  propietarioId: string;

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

  @ApiProperty({ description: 'URL de la foto del inmueble', required: false })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  fotoUrl: string;

  @ApiProperty({ description: 'Public ID de la foto en Cloudinary', required: false })
  @Column({ type: 'varchar', length: 500, nullable: true })
  fotoPublicId: string;

  @ManyToOne(() => User, (user) => user.propiedadesCreadas, { nullable: true, eager: false })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: User;

  @Column({ type: 'uuid', nullable: true })
  creadoPorId: string;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización del registro' })
  @UpdateDateColumn()
  updatedAt: Date;
}
