import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum InmobiliariaEstado {
  ACTIVA = 'ACTIVA',
  INACTIVA = 'INACTIVA',
}

@Entity('inmobiliarias')
export class Inmobiliaria {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 20, unique: true })
  nit: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 300 })
  direccion: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 20 })
  telefono: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @ApiProperty({ enum: InmobiliariaEstado })
  @Column({
    type: 'enum',
    enum: InmobiliariaEstado,
    default: InmobiliariaEstado.ACTIVA,
  })
  estado: InmobiliariaEstado;

  @ApiProperty({ required: false })
  @Column({ type: 'uuid', nullable: true })
  creadoPorId: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
