import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AccionAuditoria } from '../enums/accion-auditoria.enum';

@Entity('auditorias')
@Index(['usuarioId'])
@Index(['accion'])
@Index(['entidad'])
@Index(['createdAt'])
export class Audit {
  @ApiProperty({ description: 'ID único de la auditoría' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID del usuario que realizó la acción' })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  usuarioId: string;

  @ApiProperty({ description: 'Nombre completo del usuario' })
  @Column({ nullable: true })
  usuarioNombre: string;

  @ApiProperty({ description: 'Email del usuario' })
  @Column({ nullable: true })
  usuarioEmail: string;

  @ApiProperty({
    description: 'Acción realizada',
    enum: AccionAuditoria,
  })
  @Column({
    type: 'enum',
    enum: AccionAuditoria,
  })
  @Index()
  accion: AccionAuditoria;

  @ApiProperty({ description: 'Entidad afectada (Property, Tenant, etc.)' })
  @Column({ nullable: true })
  @Index()
  entidad: string;

  @ApiProperty({ description: 'ID del registro afectado' })
  @Column({ type: 'uuid', nullable: true })
  entidadId: string;

  @ApiProperty({
    description: 'Datos anteriores del registro (antes del cambio)',
  })
  @Column({ type: 'jsonb', nullable: true })
  datosPrevios: any;

  @ApiProperty({
    description: 'Datos nuevos del registro (después del cambio)',
  })
  @Column({ type: 'jsonb', nullable: true })
  datosNuevos: any;

  @ApiProperty({
    description: 'Contexto técnico de la petición (IP, userAgent, método, ruta)',
  })
  @Column({ type: 'jsonb', nullable: true })
  contexto: {
    ip?: string;
    userAgent?: string;
    metodo?: string;
    ruta?: string;
    headers?: any;
  };

  @ApiProperty({ description: 'Fecha de creación de la auditoría' })
  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
