# Arrendando — Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/tests-311%20passing-success)](#testing)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)](#license)

Plataforma multi-inmobiliaria para la gestión integral de arriendos: propietarios, inmuebles, inquilinos, contratos, cobros, mora, dashboards y reportes financieros.

---

## Tabla de Contenidos

- [Overview](#overview)
- [Características](#características)
- [Arquitectura](#arquitectura)
  - [Capas](#capas)
  - [Pipeline de una request](#pipeline-de-una-request)
  - [Multi-tenancy](#multi-tenancy)
  - [Modelo de dominio](#modelo-de-dominio)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Reglas de negocio](#reglas-de-negocio)
  - [Cálculo de mora](#cálculo-de-mora)
  - [Distribución de un abono](#distribución-de-un-abono)
  - [Helpers de agregación](#helpers-de-agregación)
- [Getting Started](#getting-started)
  - [Prerrequisitos](#prerrequisitos)
  - [Instalación](#instalación)
  - [Variables de entorno](#variables-de-entorno)
  - [Scripts](#scripts)
- [API Reference](#api-reference)
- [KPIs y cálculos](#kpis-y-cálculos)
- [Testing](#testing)
- [Infraestructura de producción](#infraestructura-de-producción)
- [Deployment](#deployment)
- [Convenciones de código](#convenciones-de-código)
- [License](#license)

---

## Overview

**Arrendando** es una API REST construida con NestJS que permite a múltiples inmobiliarias administrar de forma aislada todas sus operaciones de arrendamiento sobre una misma base de datos compartida. El sistema cubre desde el ciclo de vida de un contrato hasta el cálculo de mora del 1 % diario, abonos parciales, dashboards en tiempo real, reportes financieros y notificaciones automáticas por correo.

**Casos de uso principales:**

- Inmobiliarias que administran inmuebles de terceros y necesitan trazabilidad de pagos.
- Generación automática de cuotas mensuales y detección de morosidad.
- Reportes consolidados de recaudo, deuda y ocupación.
- Cobro y conciliación de mora con distribución automática capital + mora.

---

## Características

| Dominio | Capacidades |
|---|---|
| **Autenticación** | JWT Bearer, roles (`ADMIN`, `INMOBILIARIA`), recuperación de contraseña, activación de cuentas |
| **Multi-inmobiliaria** | Aislamiento por `inmobiliariaId`, JWT con scope, ADMIN global vs INMOBILIARIA scoped |
| **Inmuebles** | CRUD con servicios públicos, disponibilidad, búsqueda paginada |
| **Inquilinos** | Datos completos, contacto de emergencia, unicidad por inmobiliaria |
| **Contratos** | Vinculación inquilino + inmueble + propietario, estados automáticos |
| **Pagos** | Cuotas mensuales auto-generadas, abonos parciales, mora del 1 % diario |
| **Reportes** | Mensual, anual y comparativo — todos consistentes con mora |
| **Dashboards** | KPIs en tiempo real, top 5 inmobiliarias, debug de mora |
| **Notificaciones** | SMTP con fallback de puertos, recordatorios y alertas automáticas |
| **Auditoría** | Trazabilidad de cambios sensibles |
| **Documentación** | Swagger / OpenAPI autogenerada |

---

## Arquitectura

### Capas

El backend sigue un patrón **Controller → Service → Repository** estricto, con helpers puros para la lógica de dominio compleja.

```
┌────────────────────────────────────────────────────────────────┐
│  CLIENTES  (Frontend Web, Mobile, Postman, Otros backends)     │
└────────────────────────────────────────────────────────────────┘
                              │ HTTPS + JWT
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  CAPA HTTP                                                     │
│  ─ Controllers  (@Controller, @Get, @Post, @Patch)             │
│  ─ Guards       (JwtAuthGuard → RolesGuard)                    │
│  ─ Pipes        (ValidationPipe global)                        │
│  ─ DTOs         (class-validator + class-transformer)          │
│  Responsabilidad: traducir HTTP ↔ dominio                      │
└────────────────────────────────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  CAPA DE NEGOCIO                                               │
│  ─ Services        (reglas de dominio, transacciones)          │
│  ─ Tenant filters  (aislamiento por inmobiliariaId)            │
│  ─ Use cases       (crearPago, registrarAbono, etc.)           │
│  Responsabilidad: QUÉ hace el sistema                          │
└────────────────────────────────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  HELPERS / PURE FUNCTIONS                                      │
│  ─ PagoCalculator     (mora, agregaciones, derivados)          │
│  ─ Validators         (MatchPasswords, etc.)                   │
│  Sin dependencias de NestJS — 100 % testable en aislamiento    │
└────────────────────────────────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  PERSISTENCIA                                                  │
│  ─ Repositories  (TypeORM, @InjectRepository)                  │
│  ─ Entities      (@Entity, @AfterLoad, @BeforeInsert)          │
│  ─ Migrations    (synchronize o migrations explícitas)         │
└────────────────────────────────────────────────────────────────┘
                              ▼
                  ┌──────────────────────┐
                  │   PostgreSQL 14+     │
                  │   Shared DB schema   │
                  └──────────────────────┘

      ─── Servicios externos consumidos por la capa de negocio ───
      ┌──────────────┐  ┌────────────┐  ┌──────────────────┐
      │ SMTP         │  │ Cloudinary │  │ Cron Scheduler   │
      │ (Nodemailer) │  │ (uploads)  │  │ (@nestjs/schedule)│
      └──────────────┘  └────────────┘  └──────────────────┘
```

### Pipeline de una request

```
Request
  └─► JwtAuthGuard         valida JWT, inyecta req.user = { sub, role, inmobiliariaId }
       └─► RolesGuard      verifica @Roles(...) coincide con req.user.role
            └─► ValidationPipe   valida y transforma el DTO (whitelist + types)
                 └─► Controller  delega al servicio inyectando req.user
                      └─► Service
                           ├─ Aplica tenantFilter(user)
                           ├─ Ejecuta lógica de negocio
                           ├─ Coordina helpers (PagoCalculator)
                           └─ Persiste vía Repository
                                └─► Response JSON
```

### Multi-tenancy

**Patrón:** *Shared Database + Tenant Isolation*.

Cada entidad transaccional lleva `inmobiliariaId`. El JWT incluye el `inmobiliariaId` del usuario; los servicios filtran automáticamente cuando el rol no es `ADMIN`:

```ts
private tenantFilter(user: RequestUser): any {
  if (user.role === Role.ADMIN) return {};
  return { inmobiliariaId: user.inmobiliariaId ?? 'no-access' };
}
```

**Reglas:**

- `ADMIN` ve y opera sobre cualquier inmobiliaria.
- `INMOBILIARIA` ve solo su scope; `inmobiliariaId` viene del JWT, no del body.
- Restricciones únicas compuestas en `Tenant`: `(cedula + inmobiliariaId)` y `(correo + inmobiliariaId)`.
- Una cédula puede repetirse en distintas inmobiliarias.

### Modelo de dominio

```
┌───────────────────┐         ┌─────────────────────┐
│   Inmobiliaria    │ 1───* ⟶ │        User         │
│   estado, NIT     │         │  role, inmobiliariaId│
└────────┬──────────┘         └─────────────────────┘
         │ 1
         │
         * 
┌────────────────────┐    ┌──────────────────────┐
│    Propietario     │    │        Tenant        │
│  inmobiliariaId    │    │  cedula UQ + inmoId  │
└────────┬───────────┘    │  correo UQ + inmoId  │
         │ 1              └──────────┬───────────┘
         *                           │
┌────────────────────┐               │
│      Property      │               │
│   propietarioId    │               │
│   disponible       │               │
└────────┬───────────┘               │
         │ 1                         │ 1
         *                           *
         └─────────────┬─────────────┘
                       ▼
        ┌──────────────────────────────┐
        │          Contrato            │
        │  canonMensual                │
        │  fechaInicio / fechaFin      │
        │  estado: BORRADOR | ACTIVO   │
        │          | PROXIMO_VENCER    │
        │          | VENCIDO           │
        │          | FINALIZADO        │
        └──────────────┬───────────────┘
                       │ 1
                       *
        ┌──────────────────────────────┐
        │             Pago             │
        │  ─ Persistido ─              │
        │  montoTotal                  │
        │  montoAbonado (capital)      │
        │  moraAbonada                 │
        │  fechaPagoEsperada           │
        │  fechaPagoReal               │
        │  estado: PENDIENTE | PARCIAL │
        │          | PAGADO | VENCIDO  │
        │  ─ Derivado (@AfterLoad) ─   │
        │  saldoPendiente              │
        │  diasRetraso                 │
        │  moraGenerada                │
        │  mora (pendiente)            │
        │  totalAPagar                 │
        │  totalRecibido               │
        └──────────────────────────────┘
```

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 18+ |
| Framework | NestJS | 11 |
| Lenguaje | TypeScript | 5 |
| Base de datos | PostgreSQL | 14+ |
| ORM | TypeORM | 0.3 |
| Autenticación | Passport JWT | 4 |
| Validación | class-validator + class-transformer | 0.14 / 0.5 |
| Hash | bcrypt | 6 |
| Email | Nodemailer | 7 |
| Imágenes | Cloudinary | 2 |
| Scheduler | @nestjs/schedule | 6 |
| Documentación | Swagger / OpenAPI | 11 |
| Tests | Jest + ts-jest | 30 / 29 |

---

## Estructura del proyecto

```
arrendandoback/
├── src/
│   ├── main.ts                       # Bootstrap, CORS, Swagger, ValidationPipe
│   ├── app.module.ts                 # Módulo raíz
│   │
│   ├── auth/                         # Identidad: login, registro, JWT, recovery
│   │   ├── dto/
│   │   ├── entities/                 # User
│   │   ├── strategies/               # JwtStrategy
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   │
│   ├── inmobiliarias/                # Tenants del sistema (solo ADMIN crea)
│   ├── propietarios/                 # Dueños de inmuebles por inmobiliaria
│   ├── properties/                   # Catálogo de inmuebles
│   ├── tenants/                      # Inquilinos
│   ├── contratos/                    # Contratos de arriendo
│   │
│   ├── pagos/                        # Núcleo financiero
│   │   ├── dto/
│   │   ├── entities/                 # Pago (con @AfterLoad)
│   │   ├── utils/
│   │   │   ├── pago-calculator.ts    # Helper puro: mora y agregaciones
│   │   │   └── pago-calculator.spec.ts
│   │   ├── pagos.controller.ts
│   │   ├── pagos.service.ts
│   │   └── pagos.module.ts
│   │
│   ├── reports/                      # Reportes mensual / anual / comparativo
│   ├── notifications/                # SMTP + cron jobs
│   ├── audit/                        # Trazabilidad
│   │
│   └── common/                       # Cross-cutting concerns
│       ├── controllers/              # DashboardController
│       ├── services/                 # DashboardService, EmailService
│       ├── dto/                      # DTOs compartidos
│       ├── decorators/               # @GetUser, @Roles
│       ├── guards/                   # JwtAuthGuard, RolesGuard
│       ├── enums/                    # Role
│       └── validators/               # Validadores personalizados
│
├── test/                             # Tests E2E (jest-e2e.json)
├── package.json
└── README.md
```

---

## Reglas de negocio

### Cálculo de mora

La mora se calcula con una **función pura** (`PagoCalculator.aplicar`) que se ejecuta automáticamente con `@AfterLoad` cada vez que una entidad `Pago` se carga desde la base de datos.

**Parámetros del sistema:**

| Constante | Valor | Descripción |
|---|---|---|
| `TASA_MORA_DIARIA` | `0.01` | 1 % diario sobre el saldo pendiente |
| `TOLERANCIA_COP` | `1` | ±1 COP de tolerancia al cerrar como PAGADO |
| Días de gracia | `3` | Cron solo marca VENCIDO tras 3 días de la fecha esperada |

**Fórmulas:**

```text
saldoPendiente  = max(montoTotal − montoAbonado, 0)
diasRetraso     = max(días enteros entre fechaPagoEsperada y hoy, 0)
moraGenerada    = saldoPendiente × 0.01 × diasRetraso     // bruta
mora            = max(moraGenerada − moraAbonada, 0)      // pendiente
totalAPagar     = saldoPendiente + mora
totalRecibido   = montoAbonado + moraAbonada
```

### Distribución de un abono

Cuando se invoca `PATCH /pagos/:id/abono`, el monto recibido se distribuye así:

```text
1. aplicadoCapital = min(monto, saldoPendiente)
2. excedente       = monto − aplicadoCapital
3. aplicadoMora    = min(excedente, mora pendiente + TOLERANCIA_COP)
4. montoAbonado   += aplicadoCapital
5. moraAbonada    += aplicadoMora

6. Si capital + mora quedan cubiertos (±1 COP):
       estado = PAGADO
       fechaPagoReal = dto.fechaPago ?? now
   Sino:
       estado = PARCIAL
```

### Helpers de agregación

Toda métrica financiera del sistema **pasa por estos tres helpers** para garantizar consistencia. Viven en `src/pagos/utils/pago-calculator.ts`:

```ts
PagoCalculator.sumarRecaudado(pagos: Pago[]): number
//   Σ (montoAbonado + moraAbonada)
//   Usado en: dashboard, reports.totalPagado

PagoCalculator.sumarPendiente(pagos: Pago[], fechaReferencia?: Date): number
//   Σ (saldoPendiente + mora pendiente)
//   Usado en: dashboard.montoPendienteRecaudar, reports.totalPendiente

PagoCalculator.sumarEsperado(pagos: Pago[], fechaReferencia?: Date): number
//   Σ (montoTotal + max(moraGenerada, moraAbonada))
//   Usado en: reports.totalEsperado, pagos.estadisticas.total
//   Invariante: totalEsperado ≥ totalRecaudado siempre
```

---

## Getting Started

### Prerrequisitos

- Node.js 18 o superior
- PostgreSQL 14 o superior
- npm 9 o superior

### Instalación

```bash
git clone <repo-url>
cd arrendandoback
npm install
```

Crea un archivo `.env` (ver siguiente sección) y arranca la base de datos PostgreSQL.

### Variables de entorno

```bash
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/arrendando

# Autenticación
JWT_SECRET=tu-secreto-super-seguro
JWT_EXPIRES_IN=1h

# Servidor
NODE_ENV=development
PORT=3019

# SMTP (notificaciones)
SMTP_HOST=smtp.example.com
SMTP_PORT=2525                     # 2525, 8025 o 25 — evitar 465/587 en Render
SMTP_USER=usuario@correo.com
SMTP_PASS=********
SMTP_FROM="noreply@arrendando.com"

# Cloudinary (uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

> **Nota Render:** los puertos 465/587 están bloqueados para salida. Usa `SMTP_PORT=2525`. Si no se especifica, el servicio reintenta automáticamente en el orden `2525 → 8025 → 25`.

### Scripts

```bash
npm run start:dev        # desarrollo con hot reload
npm run start:debug      # desarrollo con debugger
npm run build            # compila a dist/
npm run start:prod       # producción

npm test                 # tests unitarios
npm run test:watch       # modo watch
npm run test:cov         # con coverage
npm run test:e2e         # tests end-to-end

npm run lint             # eslint --fix
npm run format           # prettier
```

Una vez arrancado, la documentación interactiva Swagger queda en:

```
http://localhost:3019/api/docs
```

---

## API Reference

> Todos los endpoints (excepto `/auth/register` y `/auth/login`) requieren `Authorization: Bearer <jwt>`. La documentación completa con schemas y ejemplos vive en `/api/docs`.

### Auth — `/auth`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | público | Registro de usuario |
| POST | `/auth/login` | público | Login → `{ access_token, user }` |
| GET | `/auth/profile` | JWT | Perfil del usuario actual |
| POST | `/auth/recover-password` | público | Inicia recuperación |
| POST | `/auth/logout` | JWT | Cierra sesión |

### Inmobiliarias — `/inmobiliarias`

CRUD completo (solo `ADMIN`) + activar/desactivar.

### Propietarios — `/propietarios`

CRUD por inmobiliaria, asociación con inmuebles.

### Inmuebles — `/properties`

CRUD con búsqueda, filtros (disponibilidad, ciudad), paginación.

### Inquilinos — `/tenants`

CRUD con búsqueda y paginación. Unicidad por `(cedula, inmobiliariaId)`.

### Contratos — `/contratos`

CRUD con transición de estados automática vía cron.

### Pagos — `/pagos`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/pagos` | Crear pago |
| GET | `/pagos` | Listar pagos (filtra por tenant) |
| GET | `/pagos/estadisticas` | **KPIs agregados (incluye mora)** |
| GET | `/pagos/deuda/inquilino/:cedula` | Deuda completa del inquilino |
| GET | `/pagos/estado/:estado` | Pagos por estado |
| GET | `/pagos/contrato/:contratoId` | Pagos de un contrato |
| GET | `/pagos/:id` | Pago por ID |
| PATCH | `/pagos/:id` | Actualizar pago |
| PATCH | `/pagos/:id/abono` | Registrar abono (capital + mora) |

### Dashboard — `/dashboard`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/dashboard/stats` | ADMIN, INMOBILIARIA | KPIs de la inmobiliaria |
| GET | `/dashboard/admin-stats` | ADMIN | KPIs globales + top 5 inmobiliarias |
| GET | `/dashboard/debug-mora` | ADMIN, INMOBILIARIA | Diagnóstico de mora abonada |

### Reportes — `/reports`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/reports/income/monthly?year=YYYY&month=MM` | Reporte mensual |
| GET | `/reports/income/annual?year=YYYY` | Reporte anual |
| GET | `/reports/income/comparison?fechaInicio=&fechaFin=` | Comparativo por estado |

---

## KPIs y cálculos

Todos los cálculos del backend pasan por `PagoCalculator` y son consistentes entre dashboard, reportes y `/pagos/estadisticas`.

### Dashboard (`/dashboard/stats`)

```ts
montoRecaudadoMesActual = SUM(montoAbonado + moraAbonada)
                          WHERE estado = 'PAGADO'
                          AND updatedAt en mes actual

montoPendienteRecaudar  = Σ (saldoPendiente + mora pendiente)
                          WHERE estado IN ('PENDIENTE','PARCIAL','VENCIDO')
```

### Reportes (`/reports/income/*`)

```ts
totalEsperado = Σ (montoTotal + max(moraGenerada, moraAbonada))
totalPagado   = Σ (montoAbonado + moraAbonada)         // solo PAGADO
totalPendiente= Σ (saldoPendiente + mora pendiente)    // solo no-PAGADO
totalVencido  = Σ (saldoPendiente + mora pendiente)    // solo VENCIDO
```

**Invariantes garantizados:**

- `totalEsperado ≥ totalPagado` siempre.
- `porcentajePagado ≤ 100` siempre (capeado).
- `mora ≥ 0` siempre.

### Estadísticas de pagos (`/pagos/estadisticas`)

Endpoint diseñado para la pantalla "Gestión de Pagos" del frontend.

**Response:**

```json
{
  "totalPagos": 80,
  "estadisticas": {
    "pendientes": 47,
    "parciales": 0,
    "pagados": 23,
    "vencidos": 0
  },
  "montos": {
    "total": 2516196,
    "abonado": 832960,
    "pendiente": 1683236,
    "moraAbonada": 38983.96
  }
}
```

**Mapeo a la UI:**

| Campo UI | Origen |
|---|---|
| Total de Pagos | `totalPagos` |
| Monto Total Esperado | `montos.total` |
| Monto Recaudado | `montos.abonado` |
| Pagos Pendientes | `estadisticas.pendientes` |
| Pagos Parciales | `estadisticas.parciales` |
| Porcentaje Pagado | `min(montos.abonado / montos.total × 100, 100)` |

---

## Testing

```bash
npm test                 # ejecuta toda la suite
npm run test:cov         # con coverage
```

**Cobertura actual:**

| Métrica | Valor |
|---|---|
| Test suites | 19 |
| Tests | 311 |
| Tiempo de ejecución | ~17 s |

**Cobertura crítica:**

- `pago-calculator.spec.ts` — cálculo de mora, agregaciones, casos límite (sobreabono, fechas string, redondeo, mora ya pagada).
- `reports.service.spec.ts` — inclusión de mora en cada total, garantía de invariantes.
- `pagos.service.spec.ts` — flujos de abono, distribución capital/mora, transiciones de estado.
- `auth.service.spec.ts` — autenticación, JWT, recuperación.

Patrón de mocking estándar:

```ts
const repoMock = () => ({ find: jest.fn(), findOne: jest.fn(), save: jest.fn() });

beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      MyService,
      { provide: getRepositoryToken(MyEntity), useFactory: repoMock },
    ],
  }).compile();
});
```

---

## Infraestructura de producción

El sistema está desplegado en una nube con la siguiente topología de alto nivel:

- **VPC privada** — toda la infraestructura del backend vive dentro de una red privada con segmentación pública/privada. La base de datos y el cómputo no exponen IPs públicas; el acceso desde internet entra por una sola puerta controlada.
- **DNS público** — un dominio público resuelve hacia el endpoint del backend. TLS terminado en el borde, certificados gestionados por la plataforma.
- **PostgreSQL serverless** — base de datos administrada, sin servidor que aprovisionar, con escalado automático según carga. Conexión por TLS desde la VPC.
- **Aislamiento de red** — el backend solo es alcanzable a través del DNS público; la base de datos solo acepta conexiones desde dentro de la VPC.

### Topología

```
        Internet
            │
            ▼
   ┌────────────────────┐
   │   DNS público      │  ← dominio + TLS
   └─────────┬──────────┘
             │
             ▼
   ╔══════════════════════════════════════════╗
   ║                  VPC                     ║
   ║  ┌────────────────────────────────────┐  ║
   ║  │  Backend NestJS (puerto interno)   │  ║
   ║  └─────────────┬──────────────────────┘  ║
   ║                │                         ║
   ║                ▼                         ║
   ║  ┌────────────────────────────────────┐  ║
   ║  │  PostgreSQL serverless             │  ║
   ║  │  (solo accesible desde la VPC)     │  ║
   ║  └────────────────────────────────────┘  ║
   ╚══════════════════════════════════════════╝
```

### Buenas prácticas aplicadas

- **DB nunca expuesta a internet** — todo tráfico SQL se queda dentro de la VPC.
- **Secrets en variables de entorno gestionadas** — no en el repositorio.
- **TLS de extremo a extremo** — cliente → DNS → backend → Postgres.
- **JWT corto** + refresh — minimiza ventana de exposición ante robo de tokens.
- **CORS restringido** en producción a los dominios del frontend.

---

## Deployment

### Render / Railway / Fly.io

1. Configurar las variables de entorno (DB, JWT, SMTP, Cloudinary).
2. Build command: `npm run build`.
3. Start command: `npm run start:prod`.
4. **Render:** establecer `SMTP_PORT=2525` (los puertos 465/587 están bloqueados).

### Docker (referencia)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3019
CMD ["node", "dist/main.js"]
```

### Checklist pre-deploy

- [ ] `JWT_SECRET` rotado y fuerte
- [ ] `DATABASE_URL` con SSL en producción
- [ ] `NODE_ENV=production`
- [ ] CORS restringido a dominios del frontend
- [ ] Logs estructurados habilitados
- [ ] Backups de PostgreSQL configurados
- [ ] Cron jobs habilitados (vencimientos, recordatorios)

---

## Convenciones de código

### Estructura de un módulo

Cada módulo del dominio sigue el mismo patrón:

```
src/<modulo>/
├── dto/
│   ├── create-<modulo>.dto.ts
│   └── update-<modulo>.dto.ts
├── entities/
│   └── <modulo>.entity.ts
├── <modulo>.controller.ts
├── <modulo>.service.ts
├── <modulo>.service.spec.ts
└── <modulo>.module.ts
```

### Reglas

- **Controllers** solo manejan HTTP — nunca acceden a repositorios directamente.
- **Services** contienen toda la lógica de negocio — son inyectables y testables.
- **Helpers puros** (como `PagoCalculator`) no dependen de NestJS — testeables sin contexto.
- **Tenant filtering** se aplica en el servicio mediante `tenantFilter(user)`.
- **DTOs** validados con `class-validator`. Nunca recibir datos crudos en controllers.
- **Entidades** usan `@AfterLoad` para campos derivados — nunca persistir cálculos vivos.

### Naming

| Tipo | Convención | Ejemplo |
|---|---|---|
| Entidades | `PascalCase` | `Pago`, `Tenant` |
| Servicios | `PascalCase + Service` | `PagosService` |
| Helpers | `PascalCase` | `PagoCalculator` |
| Variables | `camelCase` | `montoAbonado` |
| Constantes | `UPPER_SNAKE_CASE` | `TASA_MORA_DIARIA` |
| Archivos | `kebab-case` | `pago-calculator.ts` |

---

## License

UNLICENSED — uso interno del proyecto Arrendando.

---

**Repositorio:** `arrendandoback`
**Versión:** 1.0
**Maintainer:** equipo Arrendando
