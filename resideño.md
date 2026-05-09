# Rediseño Arquitectónico Sistema Inmobiliario Multiempresa - NestJS + PostgreSQL

# Objetivo

Necesito reorganizar y rediseñar completamente la arquitectura de mi sistema inmobiliario actual para convertirlo en una plataforma multiempresa (multi-tenant), limpia, modular, escalable y profesional usando NestJS + PostgreSQL.

NO quiero solamente agregar funcionalidades nuevas.  
Quiero reorganizar correctamente toda la arquitectura backend antes de seguir desarrollando.

---

# Stack Tecnológico

## Backend
- NestJS
- PostgreSQL
- TypeScript
- JWT Authentication

## ORM
Quiero recomendación entre:
- Prisma
- TypeORM

---

## Frontend
- React

---

# Estado Actual del Proyecto

Actualmente el sistema funciona con un único usuario ADMIN que controla toda la plataforma.

El proyecto ya tiene módulos funcionales como:
- auth
- users
- properties
- tenants
- contracts
- payments
- reports
- dashboard

Pero la arquitectura actual NO está preparada para multiempresa.

---

# Nuevo Objetivo Arquitectónico

Quiero convertir el sistema en una plataforma multiempresa donde:

## ADMIN (Super Admin)

El ADMIN pertenece a la plataforma global.

Tiene acceso TOTAL a:
- todas las inmobiliarias
- todos los inmuebles
- todos los contratos
- todos los pagos
- todos los propietarios
- todos los inquilinos
- todos los reportes
- auditoría global
- dashboards globales

Además puede:
- crear inmobiliarias
- editar inmobiliarias
- activar/desactivar inmobiliarias
- gestionar usuarios de inmobiliarias
- supervisar toda la operación

IMPORTANTE:
El ADMIN NO pertenece a una inmobiliaria específica.

Por tanto:

```ts
inmobiliariaId = null
```

---

# INMOBILIARIA

Cada inmobiliaria funciona como una empresa independiente dentro del sistema.

Cada inmobiliaria SOLO puede gestionar:
- sus propiedades
- sus propietarios
- sus inquilinos
- sus contratos
- sus pagos
- sus reportes
- sus datos internos

IMPORTANTE:
- una inmobiliaria NO puede ver información de otra inmobiliaria
- el sistema debe estar completamente aislado por empresa

---

# Usuarios con Login

Solo existirán dos tipos de usuarios autenticados:

```ts
ADMIN
INMOBILIARIA
```

---

# Entidades SIN Login

Estas entidades NO tendrán acceso al sistema:

- propietarios
- inquilinos

Solo son entidades de negocio.

NO quiero crear login para ellos por ahora.

---

# Arquitectura Multiempresa

Quiero implementar:

```txt
Shared Database + Tenant Isolation
```

SIN:
- microservicios
- múltiples bases de datos
- schemas separados
- sobreingeniería

---

# Regla Principal

Toda la información del negocio debe pertenecer a una inmobiliaria.

Por ejemplo:

```ts
inmobiliariaId
```

debe existir en:
- properties
- tenants
- contracts
- payments
- propietarios

---

# Flujo del Negocio

## Inmobiliaria
Una inmobiliaria:
- administra propiedades
- administra propietarios
- administra inquilinos
- administra contratos
- administra pagos

---

## Propietario
Un propietario:
- pertenece a una inmobiliaria
- puede tener múltiples propiedades

---

## Inquilino
Un inquilino:
- pertenece a una inmobiliaria
- puede tener múltiples contratos históricamente

---

## Propiedad
Una propiedad:
- pertenece a una inmobiliaria
- pertenece a un propietario
- puede tener contratos

---

## Contrato
Un contrato relaciona:
- inmobiliaria
- propiedad
- propietario
- inquilino

---

## Pago
Un pago pertenece a:
- contrato
- inmobiliaria

---

# Requerimientos Arquitectónicos

Necesito ayuda para reorganizar correctamente:

- arquitectura backend
- módulos NestJS
- entidades
- relaciones PostgreSQL
- guards
- autenticación
- autorización
- aislamiento multiempresa
- auditoría
- DTOs
- validaciones
- estructura escalable

---

# JWT

El JWT debe incluir:

```ts
{
   userId,
   role,
   inmobiliariaId
}
```

---

# Comportamiento Esperado

## ADMIN

Debe poder consultar TODO:

```ts
return this.propertyRepository.find();
```

---

## INMOBILIARIA

Solo debe consultar sus propios datos:

```ts
return this.propertyRepository.find({
   where: {
      inmobiliariaId: user.inmobiliariaId
   }
});
```

---

# Guards Necesarios

Necesito diseño profesional para:

## JwtAuthGuard
Validación JWT.

---

## RolesGuard

Restricción por roles.

Ejemplo:

```ts
@Roles(Role.ADMIN)
@Roles(Role.INMOBILIARIA)
```

---

## Tenant Isolation Strategy

Necesito una estrategia limpia y profesional para filtrar automáticamente por:

```ts
inmobiliariaId
```

---

# Entidades Requeridas

Necesito rediseño profesional de entidades PostgreSQL.

---

# User

```ts
- id
- nombre
- email
- password
- role
- inmobiliariaId (nullable)
- active
- createdAt
- updatedAt
```

---

# Inmobiliaria

```ts
- id
- nombre
- nit
- direccion
- telefono
- email
- estado
- createdBy
- createdAt
```

---

# Propietario

```ts
- id
- inmobiliariaId
- nombre
- documento
- telefono
- email
- createdAt
```

---

# Inquilino

```ts
- id
- inmobiliariaId
- nombre
- documento
- telefono
- email
```

---

# Property

```ts
- id
- inmobiliariaId
- propietarioId
- nombre
- direccion
- estado
- valorArriendo
- createdBy
```

---

# Contract

```ts
- id
- inmobiliariaId
- propertyId
- propietarioId
- tenantId
- fechaInicio
- fechaFin
- canon
- estado
```

---

# Payment

```ts
- id
- inmobiliariaId
- contractId
- monto
- fechaPago
- estado
- registradoPor
```

---

# Arquitectura Deseada

Necesito reorganizar el proyecto usando arquitectura modular de NestJS.

---

# Estructura Deseada

```txt
src/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── inmobiliarias/
│   ├── properties/
│   ├── propietarios/
│   ├── tenants/
│   ├── contracts/
│   ├── payments/
│   ├── reports/
│
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   ├── middleware/
│   ├── enums/
│   ├── constants/
│   ├── utils/
│
├── database/
│   ├── migrations/
│   ├── seeders/
│
├── config/
│
└── main.ts
```

---

# Auditoría

Actualmente uso AuditInterceptor.

Necesito una estrategia profesional para registrar:
- usuario
- acción
- endpoint
- payload
- IP
- timestamps

---

# Buenas Prácticas

Quiero aplicar:
- SOLID
- Clean Architecture
- DTOs
- separación controller/service/repository
- validaciones
- manejo profesional de errores
- modularización limpia
- escalabilidad
- mantenibilidad

---

# Refactorización

Necesito ayuda para:

1. Reorganizar la arquitectura sin romper el proyecto actual.
2. Migrar correctamente el sistema existente.
3. Implementar multiempresa de forma limpia.
4. Refactorizar módulos existentes.
5. Diseñar relaciones PostgreSQL correctamente.
6. Crear una arquitectura preparada para crecimiento futuro.

---

# Importante

NO quiero:
- microservicios
- múltiples bases de datos
- complejidad innecesaria
- arquitectura exageradamente enterprise
- sobreingeniería

SÍ quiero:
- arquitectura limpia
- modular
- profesional
- multiempresa
- escalable
- mantenible
- preparada para producción

---

# Lo que necesito de ti

Quiero que actúes como un arquitecto senior especializado en:
- NestJS
- PostgreSQL
- Prisma/TypeORM
- Sistemas multiempresa
- Arquitectura backend empresarial
- Sistemas inmobiliarios

Y me ayudes a:
- rediseñar la arquitectura
- proponer relaciones correctas
- reorganizar módulos
- mejorar seguridad
- mejorar mantenibilidad
- implementar multi-tenant correctamente
- preparar el sistema para crecimiento futuro
