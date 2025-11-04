# 📧 Sistema de Notificaciones Automáticas

## Funcionalidades Implementadas

### ✅ Recordatorios de Pago
- **Frecuencia**: Diariamente a las 9:00 AM
- **Condición**: 2 días antes del vencimiento de cuotas pendientes
- **Destinatario**: Email del inquilino
- **Contenido**: Monto, fecha de vencimiento, dirección de la propiedad

### ✅ Recordatorios de Vencimiento de Contrato
- **Frecuencia**: Diariamente a las 10:00 AM
- **Condición**: 3 meses antes del vencimiento de contratos activos
- **Destinatario**: Email del inquilino
- **Contenido**: Fecha de vencimiento, dirección de la propiedad, recomendaciones

## Configuración de Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Configuración SMTP para notificaciones por email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password-de-aplicacion
SMTP_FROM=tu-email@gmail.com
```

### Para Gmail:
1. Habilitar la verificación en 2 pasos
2. Generar una contraseña de aplicación específica
3. Usar esa contraseña en `SMTP_PASS`

### Para otros proveedores:
- **Outlook/Hotmail**: `smtp.live.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Configurar según tu proveedor

## Estructura de Archivos

```
src/notifications/
├── services/
│   ├── email.service.ts          # Servicio para envío de emails
│   └── notifications.service.ts  # Servicio principal con cron jobs
├── templates/                    # (Futuro) Templates HTML
└── notifications.module.ts       # Módulo de notificaciones
```

## Cron Jobs Configurados

### 1. Recordatorios de Pago
```typescript
@Cron(CronExpression.EVERY_DAY_AT_9AM)
async checkPaymentReminders()
```

### 2. Vencimiento de Contratos
```typescript
@Cron(CronExpression.EVERY_DAY_AT_10AM)
async checkContractExpirations()
```

## API Endpoints Disponibles

### Envío Manual de Recordatorios

```typescript
// En el servicio NotificationsService
async sendManualPaymentReminder(pagoId: string)
async sendManualContractExpirationReminder(contratoId: string)
```

## Logs y Monitoreo

El sistema incluye logs detallados para:
- ✅ Número de notificaciones enviadas
- ❌ Errores en el envío de emails
- 📊 Estadísticas diarias de ejecución

## Plantillas de Email

### 🧾 Recordatorio de Pago
- Diseño responsive
- Información del monto y fecha
- Detalles de la propiedad
- Recordatorio de días restantes

### 📄 Vencimiento de Contrato
- Alerta visual sobre vencimiento
- Información del contrato
- Recomendaciones de acción
- Tiempo restante (3 meses)

## Próximas Mejoras

- [ ] Panel de administración para configurar horarios
- [ ] Plantillas de email personalizables
- [ ] Notificaciones por WhatsApp
- [ ] Historial de notificaciones enviadas
- [ ] Configuración de recordatorios múltiples