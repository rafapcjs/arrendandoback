import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Inmobiliaria } from '../../inmobiliarias/entities/inmobiliaria.entity';

@Entity('propietarios')
export class Propietario {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  @Index()
  inmobiliariaId: string;

  @ManyToOne(() => Inmobiliaria, { nullable: false })
  @JoinColumn({ name: 'inmobiliariaId' })
  inmobiliaria: Inmobiliaria;

  @ApiProperty()
  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 30 })
  documento: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 20 })
  telefono: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string;

  @ApiProperty({ default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
