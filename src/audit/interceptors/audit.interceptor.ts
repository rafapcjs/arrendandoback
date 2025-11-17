import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AccionAuditoria } from '../enums/accion-auditoria.enum';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly recentAudits = new Map<string, number>();
  private readonly DEDUP_WINDOW_MS = 1000; // 1 segundo

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip, headers, body } = request;

    // Filtrar peticiones GET (consultas) - solo auditar acciones que modifican datos
    const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap((data) => {
        // No auditar consultas GET
        if (!shouldAudit) {
          return;
        }

        try {
          // Determinar acción según método HTTP
          const accion = this.determinarAccion(method, url);

          // Extraer entidad de la URL
          const entidad = this.extraerEntidad(url);

          // Extraer ID de la entidad si existe
          const entidadId = this.extraerEntidadId(data);

          // Crear clave única para deduplicación
          const deduplicationKey = `${user?.id || 'anon'}-${method}-${url}-${accion}-${entidadId || 'new'}`;
          const now = Date.now();
          const lastAudit = this.recentAudits.get(deduplicationKey);

          // Si ya se registró esta acción en el último segundo, ignorar
          if (lastAudit && now - lastAudit < this.DEDUP_WINDOW_MS) {
            this.logger.debug(`Auditoría duplicada ignorada: ${deduplicationKey}`);
            return;
          }

          // Guardar timestamp de esta auditoría
          this.recentAudits.set(deduplicationKey, now);

          // Limpiar entradas antiguas (mayores a 2 segundos)
          setTimeout(() => {
            this.recentAudits.delete(deduplicationKey);
          }, this.DEDUP_WINDOW_MS * 2);

          // Registrar auditoría de forma asíncrona (fire-and-forget)
          setImmediate(() => {
            this.auditService.create({
              usuarioId: user?.id,
              usuarioNombre: user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`.trim()
                : user?.email || 'Sistema',
              usuarioEmail: user?.email || null,
              accion,
              entidad,
              entidadId,
              datosNuevos: this.sanitizarDatos(data),
              contexto: {
                ip: this.extraerIP(request),
                userAgent: headers['user-agent'],
                metodo: method,
                ruta: url,
              },
            });
          });
        } catch (error) {
          // No afectar la petición si falla la auditoría
          this.logger.error(
            `Error en interceptor de auditoría: ${error.message}`,
          );
        }
      }),
    );
  }

  private determinarAccion(method: string, url: string): AccionAuditoria {
    // Casos especiales según la ruta (en orden de prioridad)
    // Rutas específicas primero para evitar conflictos
    if (url.includes('/activate')) return AccionAuditoria.ACTIVAR;
    if (url.includes('/deactivate')) return AccionAuditoria.DESACTIVAR;
    if (url.includes('/abono')) return AccionAuditoria.PAGO_ABONO;
    if (url.includes('/finalizar')) return AccionAuditoria.CONTRATO_FINALIZADO;
    if (url.includes('/marcar-vencido')) return AccionAuditoria.CONTRATO_VENCIDO;
    
    // Autenticación
    if (url.includes('/login')) return AccionAuditoria.LOGIN;
    if (url.includes('/logout')) return AccionAuditoria.LOGOUT;
    if (url.includes('/register') || url.includes('/registro'))
      return AccionAuditoria.REGISTRO;
    if (url.includes('/change-password') || url.includes('/cambiar-contrasena'))
      return AccionAuditoria.CAMBIO_CONTRASENA;
    if (url.includes('/recover') || url.includes('/recuperar'))
      return AccionAuditoria.RECUPERAR_CONTRASENA;
    
    // Consultas y reportes
    if (url.includes('/reports') || url.includes('/reportes'))
      return AccionAuditoria.CONSULTA_REPORTES;
    if (url.includes('/export')) return AccionAuditoria.EXPORTAR_DATOS;

    // Solo si NO es ninguna ruta especial, usar método HTTP
    switch (method) {
      case 'POST':
        return AccionAuditoria.CREAR;
      case 'PUT':
      case 'PATCH':
        return AccionAuditoria.ACTUALIZAR;
      case 'DELETE':
        return AccionAuditoria.ELIMINAR;
      default:
        return AccionAuditoria.CREAR;
    }
  }

  private extraerEntidad(url: string): string | undefined {
    // Extraer nombre de entidad de la URL
    // Las rutas pueden ser /api/properties o directamente /properties
    const match = url.match(/\/(api\/)?([^\/\?]+)/);
    if (match && match[2]) {
      const entidad = match[2];
      // Mapear nombres de rutas a entidades
      const mapeo: Record<string, string> = {
        properties: 'Property',
        tenants: 'Tenant',
        contratos: 'Contrato',
        pagos: 'Pago',
        users: 'User',
        auth: 'Auth',
        dashboard: 'Dashboard',
        reports: 'Reports',
        contact: 'Contact',
      };
      return mapeo[entidad] || entidad.charAt(0).toUpperCase() + entidad.slice(1);
    }
    return 'Sistema';
  }

  private extraerEntidadId(data: any): string | undefined {
    // Intentar extraer ID del resultado
    if (data && typeof data === 'object') {
      return data.id || data.data?.id;
    }
    return undefined;
  }

  private extraerIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip
    );
  }

  private sanitizarDatos(data: any): any {
    if (!data || typeof data !== 'object') return data;

    // Clonar objeto para no modificar el original
    const sanitizado = JSON.parse(JSON.stringify(data));

    // Eliminar campos sensibles
    const camposSensibles = [
      'password',
      'contrasena',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
    ];

    const eliminarCamposSensibles = (obj: any) => {
      for (const key in obj) {
        if (camposSensibles.includes(key)) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          eliminarCamposSensibles(obj[key]);
        }
      }
    };

    eliminarCamposSensibles(sanitizado);
    return sanitizado;
  }
}
