import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}