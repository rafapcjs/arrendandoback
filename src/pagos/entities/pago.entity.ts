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
import { Contrato } from '../../contratos/entities/contrato.entity';

export enum PagoEstado {
  PENDIENTE = 'PENDIENTE',
  PARCIAL = 'PARCIAL',
  PAGADO = 'PAGADO',
  VENCIDO = 'VENCIDO',
}

@Entity('pagos')
export class Pago {
  @ApiProperty({ description: 'ID único del pago' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Monto total del pago' })
  @Column('decimal', { precision: 12, scale: 4 })
  montoTotal: number;

  @ApiProperty({ description: 'Monto abonado del pago' })
  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  montoAbonado: number;

  @ApiProperty({ description: 'Estado del pago', enum: PagoEstado })
  @Column({
    type: 'enum',
    enum: PagoEstado,
    default: PagoEstado.PENDIENTE,
  })
  estado: PagoEstado;

  @ApiProperty({ description: 'Fecha esperada de pago' })
  @Column({ type: 'date' })
  fechaPagoEsperada: Date;

  @ApiProperty({ description: 'Fecha real de pago', required: false })
  @Column({ type: 'date', nullable: true })
  fechaPagoReal: Date;

  @ApiProperty({ description: 'ID del contrato' })
  @Column({ type: 'uuid' })
  contratoId: string;

  @ApiProperty({ description: 'Contrato asociado al pago' })
  @ManyToOne(() => Contrato, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contratoId' })
  contrato: Contrato;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización del registro' })
  @UpdateDateColumn()
  updatedAt: Date;
}
