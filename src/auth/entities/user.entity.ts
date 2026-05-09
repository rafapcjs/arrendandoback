import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Contrato } from '../../contratos/entities/contrato.entity';
import { Pago } from '../../pagos/entities/pago.entity';
import { Role } from '../../common/enums/roles.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: Role, default: Role.ADMIN })
  role: Role;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  inmobiliariaId: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones de auditoría - TypeORM las maneja automáticamente
  @OneToMany(() => Property, (property) => property.creadoPor)
  propiedadesCreadas: Property[];

  @OneToMany(() => Tenant, (tenant) => tenant.creadoPor)
  inquilinosCreados: Tenant[];

  @OneToMany(() => Contrato, (contrato) => contrato.creadoPor)
  contratosCreados: Contrato[];

  @OneToMany(() => Pago, (pago) => pago.registradoPor)
  pagosRegistrados: Pago[];
}
