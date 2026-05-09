import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('tenants')
@Unique(['cedula', 'inmobiliariaId'])
@Unique(['correo', 'inmobiliariaId'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  inmobiliariaId: string;

  @Column()
  cedula: string;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @Column()
  telefono: string;

  @Column()
  correo: string;

  @Column('text')
  direccion: string;

  @Column()
  ciudad: string;

  @Column()
  contactoEmergencia: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  disponible: boolean;

  @ManyToOne(() => User, (user) => user.inquilinosCreados, { nullable: true, eager: false })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: User;

  @Column({ type: 'uuid', nullable: true })
  creadoPorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
