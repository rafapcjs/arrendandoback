import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Property } from '../../properties/entities/property.entity';

export enum ContratoEstado {
  BORRADOR = 'BORRADOR',
  ACTIVO = 'ACTIVO',
  PROXIMO_VENCER = 'PROXIMO_VENCER',
  VENCIDO = 'VENCIDO',
  FINALIZADO = 'FINALIZADO',
}

@Entity('contratos')
export class Contrato {
  @ApiProperty({ description: 'ID único del contrato' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Fecha de inicio del contrato' })
  @Column({ type: 'date' })
  fechaInicio: Date;

  @ApiProperty({ description: 'Fecha de fin del contrato' })
  @Column({ type: 'date' })
  fechaFin: Date;

  @ApiProperty({ description: 'Canon mensual del contrato' })
  @Column('decimal', { precision: 10, scale: 2 })
  canonMensual: number;


  @ApiProperty({ description: 'Estado del contrato', enum: ContratoEstado })
  @Column({
    type: 'enum',
    enum: ContratoEstado,
    default: ContratoEstado.BORRADOR,
  })
  estado: ContratoEstado;

  @ApiProperty({ description: 'ID del inquilino' })
  @Column({ type: 'uuid' })
  inquilinoId: string;

  @ApiProperty({ description: 'ID del inmueble' })
  @Column({ type: 'uuid' })
  inmuebleId: string;

  @ApiProperty({ description: 'Inquilino asociado al contrato' })
  @ManyToOne(() => Tenant, { eager: true })
  @JoinColumn({ name: 'inquilinoId' })
  inquilino: Tenant;

  @ApiProperty({ description: 'Inmueble asociado al contrato' })
  @ManyToOne(() => Property, { eager: true })
  @JoinColumn({ name: 'inmuebleId' })
  inmueble: Property;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización del registro' })
  @UpdateDateColumn()
  updatedAt: Date;
}