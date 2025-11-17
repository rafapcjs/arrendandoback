import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit } from './entities/audit.entity';
import { AccionAuditoria } from './enums/accion-auditoria.enum';

export interface CreateAuditDto {
  usuarioId?: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
  accion: AccionAuditoria;
  entidad?: string;
  entidadId?: string;
  datosPrevios?: any;
  datosNuevos?: any;
  contexto?: {
    ip?: string;
    userAgent?: string;
    metodo?: string;
    ruta?: string;
    headers?: any;
  };
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(Audit)
    private auditRepository: Repository<Audit>,
  ) {}

  /**
   * Crea un registro de auditoría en la base de datos
   * Fire-and-forget: si falla, solo registra el error y continúa
   */
  async create(data: CreateAuditDto): Promise<void> {
    try {
      const audit = this.auditRepository.create(data);
      await this.auditRepository.save(audit);
    } catch (error) {
      // No lanzar error, solo registrar en logs
      this.logger.error(
        `Error al crear auditoría: ${error.message}`,
        error.stack,
      );
    }
  }
}
