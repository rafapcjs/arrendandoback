import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  cedula: string;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @Column()
  telefono: string;

  @Column({ unique: true })
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

  @ManyToOne(() => User, (user) => user.inquilinosCreados, { nullable: true })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Promise<User>;

  @Column({ type: 'uuid', nullable: true })
  creadoPorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
