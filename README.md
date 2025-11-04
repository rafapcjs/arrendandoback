# 🏠 Arrendando - Sistema de Gestión de Arriendos

API REST para la gestión integral de propiedades de arriendo, desarrollada con NestJS, TypeScript y PostgreSQL.

## 📋 Descripción del Proyecto

**Arrendando** es una aplicación backend que permite gestionar de manera eficiente propiedades en arriendo, inquilinos, contratos y pagos. El sistema está diseñado para propietarios y administradores de inmuebles que necesitan una herramienta robusta para el control de sus operaciones de arrendamiento.

## 🎯 Funcionalidades Principales

### 🔐 Autenticación y Autorización
- **Registro y login de usuarios**
- **Autenticación JWT con Bearer tokens**
- **Sistema de roles (ADMIN por defecto)**
- **Gestión de usuarios con activación/desactivación**
- **Recuperación de contraseñas**

### 🏢 Gestión de Inmuebles (Properties)
- **CRUD completo de propiedades**
- **Información de servicios públicos** (agua, gas, luz)
- **Control de disponibilidad**
- **Descripción detallada de inmuebles**
- **Búsqueda y filtrado de propiedades**
- **Paginación de resultados**

### 👥 Gestión de Inquilinos (Tenants)
- **Registro completo de inquilinos**
- **Información personal y contacto**
- **Contacto de emergencia**
- **Gestión de estado activo/inactivo**
- **Búsqueda y filtrado**
- **Paginación de resultados**

### 📄 Gestión de Contratos (Contratos)
- **Creación y gestión de contratos de arriendo**
- **Estados del contrato:**
  - `BORRADOR` - Contrato en preparación
  - `ACTIVO` - Contrato vigente
  - `PROXIMO_VENCER` - Próximo a vencer
  - `VENCIDO` - Contrato vencido
  - `FINALIZADO` - Contrato terminado
- **Vinculación entre inquilinos e inmuebles**
- **Definición de canon mensual**
- **Control de fechas de inicio y fin**
- **Búsqueda y filtrado avanzado**

### 💰 Gestión de Pagos (Pagos)
- **Seguimiento de pagos de arriendo**
- **Estados de pago:**
  - `PENDIENTE` - Pago por realizar
  - `PARCIAL` - Pago parcial realizado
  - `PAGADO` - Pago completado
  - `VENCIDO` - Pago vencido
- **Control de montos totales y abonados**
- **Fechas esperadas vs fechas reales de pago**
- **Vinculación automática con contratos**

### 🔔 Notificaciones (Notifications)
- **Sistema de notificaciones automáticas**
- **Alertas de vencimiento de contratos**
- **Recordatorios de pagos pendientes**
- **Notificaciones por email**

### 📊 Reportes (Reports)
- **Generación de reportes de gestión**
- **Estadísticas de propiedades**
- **Análisis de pagos y morosidad**
- **Reportes de contratos activos**

### 🛠 Utilidades Comunes (Common)
- **Validadores personalizados**
- **DTOs compartidos**
- **Decoradores y guards**
- **Servicios utilitarios**

## 🏗 Arquitectura Técnica

### Stack Tecnológico
- **Framework:** NestJS
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL
- **ORM:** TypeORM
- **Autenticación:** JWT + Passport
- **Documentación:** Swagger/OpenAPI
- **Validación:** class-validator + class-transformer
- **Encriptación:** bcrypt

### Estructura del Proyecto
```
src/
├── auth/                    # Módulo de autenticación
│   ├── dto/                 # DTOs de autenticación
│   ├── entities/            # Entidad User
│   └── strategies/          # Estrategias JWT
├── tenants/                 # Módulo de inquilinos
│   ├── dto/                 # DTOs de inquilinos
│   └── entities/            # Entidad Tenant
├── properties/              # Módulo de propiedades
│   ├── dto/                 # DTOs de propiedades
│   └── entities/            # Entidad Property
├── contratos/               # Módulo de contratos
│   ├── dto/                 # DTOs de contratos
│   └── entities/            # Entidad Contrato
├── pagos/                   # Módulo de pagos
│   ├── dto/                 # DTOs de pagos
│   └── entities/            # Entidad Pago
├── notifications/           # Módulo de notificaciones
├── reports/                 # Módulo de reportes
└── common/                  # Utilidades compartidas
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (v18 o superior)
- PostgreSQL
- npm o yarn

### Variables de Entorno
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/arrendando
JWT_SECRET=your-jwt-secret
NODE_ENV=development
PORT=3013
```

### Comandos de Desarrollo
```bash
# Instalar dependencias
npm install

# Desarrollo
npm run start:dev

# Construcción
npm run build

# Producción
npm run start:prod

# Tests
npm run test
npm run test:e2e

# Linting
npm run lint
npm run format
```

## 📖 Documentación de la API

La documentación completa de la API está disponible en:
```
http://localhost:3013/api/docs
```

### Endpoints Principales

#### Autenticación
- `POST /auth/register` - Registro de usuarios
- `POST /auth/login` - Inicio de sesión
- `POST /auth/change-password` - Cambio de contraseña

#### Propiedades
- `GET /properties` - Listar propiedades
- `POST /properties` - Crear propiedad
- `GET /properties/:id` - Obtener propiedad
- `PATCH /properties/:id` - Actualizar propiedad
- `DELETE /properties/:id` - Eliminar propiedad

#### Inquilinos
- `GET /tenants` - Listar inquilinos
- `POST /tenants` - Crear inquilino
- `GET /tenants/:id` - Obtener inquilino
- `PATCH /tenants/:id` - Actualizar inquilino

#### Contratos
- `GET /contratos` - Listar contratos
- `POST /contratos` - Crear contrato
- `GET /contratos/:id` - Obtener contrato
- `PATCH /contratos/:id` - Actualizar contrato

#### Pagos
- `GET /pagos` - Listar pagos
- `POST /pagos` - Crear pago
- `PATCH /pagos/:id` - Actualizar pago

## 🔒 Seguridad

- **Autenticación JWT obligatoria** para todas las rutas protegidas
- **Validación de entrada** con class-validator
- **Encriptación de contraseñas** con bcrypt
- **CORS habilitado** para desarrollo
- **SSL configurado** para PostgreSQL

## 🎯 Casos de Uso

1. **Propietario registra una nueva propiedad** con todos sus servicios
2. **Administrador crea un inquilino** con información completa
3. **Se genera un contrato** vinculando inquilino y propiedad
4. **Sistema crea pagos automáticamente** basados en el contrato
5. **Notificaciones automáticas** para vencimientos y recordatorios
6. **Generación de reportes** para análisis de rentabilidad

## 📞 Soporte

Para soporte técnico o consultas sobre el proyecto, contacte al equipo de desarrollo.

---

**Versión:** 1.0  
**Desarrollado con:** NestJS + TypeScript  
**Base de Datos:** PostgreSQL  
**Puerto por defecto:** 3013
