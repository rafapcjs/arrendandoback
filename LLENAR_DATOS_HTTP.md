# Guía para Llenar Datos en la Base de Datos por HTTP

## 1. CREAR USUARIO ADMIN

```bash
curl -X POST http://localhost:3019/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Rafael",
    "lastName": "Admin",
    "email": "admin@test.com",
    "password": "Admin123456",
    "role": "ADMIN"
  }'
```

**Respuesta esperada:**
```json
{
  "id": "uuid-admin",
  "firstName": "Rafael",
  "lastName": "Admin",
  "email": "admin@test.com",
  "role": "ADMIN"
}
```

---

## 2. LOGIN COMO ADMIN

```bash
curl -X POST http://localhost:3019/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123456"
  }'
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-admin",
    "firstName": "Rafael",
    "lastName": "Admin",
    "email": "admin@test.com",
    "role": "ADMIN"
  }
}
```

**👉 Guardar el `access_token` para las siguientes peticiones**

---

## 3. CREAR INMOBILIARIAS

Reemplaza `ACCESS_TOKEN` con el token obtenido en el paso 2.

### Inmobiliaria 1: Valgreen Inmobiliarios
```bash
curl -X POST http://localhost:3019/inmobiliarias \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "nombre": "Valgreen Inmobiliarios",
    "nit": "900123456-1",
    "direccion": "Carrera 7 #45-67, Bogotá",
    "telefono": "3001234567",
    "email": "contacto@valgreen.com"
  }'
```

**Guardar el `id` devuelto como: INMOB_1**

### Inmobiliaria 2: Centro Inmobiliaria
```bash
curl -X POST http://localhost:3019/inmobiliarias \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "nombre": "Centro Inmobiliaria",
    "nit": "900234567-2",
    "direccion": "Calle 50 #15-40, Bogotá",
    "telefono": "3009876543",
    "email": "info@centroinmobiliaria.com"
  }'
```

**Guardar el `id` devuelto como: INMOB_2**

### Inmobiliaria 3: Vivienda Premium
```bash
curl -X POST http://localhost:3019/inmobiliarias \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "nombre": "Vivienda Premium",
    "nit": "900345678-3",
    "direccion": "Avenida Chile #120-50, Bogotá",
    "telefono": "3005551234",
    "email": "ventas@viviendapremium.com"
  }'
```

**Guardar el `id` devuelto como: INMOB_3**

---

## 4. CREAR USUARIOS INMOBILIARIA (para cada inmobiliaria)

### Usuario para Valgreen
```bash
curl -X POST http://localhost:3019/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Carlos",
    "lastName": "Valgreen",
    "email": "carlos@valgreen.com",
    "password": "Valgreen123456",
    "role": "INMOBILIARIA",
    "inmobiliariaId": "INMOB_1"
  }'
```

### Usuario para Centro Inmobiliaria
```bash
curl -X POST http://localhost:3019/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "María",
    "lastName": "Centro",
    "email": "maria@centroinmobiliaria.com",
    "password": "Centro123456",
    "role": "INMOBILIARIA",
    "inmobiliariaId": "INMOB_2"
  }'
```

### Usuario para Vivienda Premium
```bash
curl -X POST http://localhost:3019/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Premium",
    "email": "juan@viviendapremium.com",
    "password": "Premium123456",
    "role": "INMOBILIARIA",
    "inmobiliariaId": "INMOB_3"
  }'
```

---

## 5. LOGIN COMO INMOBILIARIA

### Obtener token de Valgreen
```bash
curl -X POST http://localhost:3019/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@valgreen.com",
    "password": "Valgreen123456"
  }'
```

**Guardar token como: TOKEN_VALGREEN**

### Obtener token de Centro Inmobiliaria
```bash
curl -X POST http://localhost:3019/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@centroinmobiliaria.com",
    "password": "Centro123456"
  }'
```

**Guardar token como: TOKEN_CENTRO**

### Obtener token de Vivienda Premium
```bash
curl -X POST http://localhost:3019/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@viviendapremium.com",
    "password": "Premium123456"
  }'
```

**Guardar token como: TOKEN_PREMIUM**

---

## 6. CREAR PROPIETARIOS

Usa TOKEN_VALGREEN, TOKEN_CENTRO, TOKEN_PREMIUM según corresponda.

### Propietarios para Valgreen
```bash
# Propietario 1
curl -X POST http://localhost:3019/propietarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_VALGREEN" \
  -d '{
    "nombre": "Pedro López",
    "documento": "CC-1234567890",
    "documentoType": "CC",
    "telefono": "3101234567",
    "email": "pedro@email.com"
  }'
```

### Propietarios para Centro
```bash
curl -X POST http://localhost:3019/propietarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_CENTRO" \
  -d '{
    "nombre": "Ana García",
    "documento": "CC-0987654321",
    "documentoType": "CC",
    "telefono": "3209876543",
    "email": "ana@email.com"
  }'
```

---

## 7. CREAR PROPIEDADES/INMUEBLES

```bash
curl -X POST http://localhost:3019/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_VALGREEN" \
  -d '{
    "direccion": "Carrera 7 #45-67 Apto 301, Bogotá",
    "codigoServicioAgua": "A-001234",
    "codigoServicioGas": "G-001234",
    "codigoServicioLuz": "L-001234",
    "disponible": true,
    "descripcion": "Apartamento moderno con 3 habitaciones, sala, cocina y 2 baños"
  }'
```

**Guardar el `id` devuelto como: PROPERTY_1**

---

## 8. CREAR INQUILINOS

```bash
curl -X POST http://localhost:3019/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_VALGREEN" \
  -d '{
    "cedula": "1098765432",
    "nombres": "Roberto",
    "apellidos": "Martínez",
    "telefono": "3156789012",
    "correo": "roberto@email.com",
    "direccion": "Calle 30 #10-20",
    "ciudad": "Bogotá",
    "contactoEmergencia": "María Martínez"
  }'
```

**Guardar el `id` devuelto como: TENANT_1**

---

## 9. CREAR CONTRATOS

```bash
curl -X POST http://localhost:3019/contratos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_VALGREEN" \
  -d '{
    "inmuebleId": "PROPERTY_1",
    "inquilinoId": "TENANT_1",
    "fechaInicio": "2025-01-01",
    "fechaFin": "2026-01-01",
    "canonMensual": 1500000,
    "garantia": 3000000
  }'
```

**Guardar el `id` devuelto como: CONTRACT_1**

---

## 10. CREAR PAGOS

```bash
curl -X POST http://localhost:3019/pagos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_VALGREEN" \
  -d '{
    "contratoId": "CONTRACT_1",
    "montoTotal": 1500000,
    "fechaPagoEsperada": "2025-02-01"
  }'
```

---

## 11. REGISTRAR ABONO A PAGO

```bash
# Obtener el ID del pago creado (se devuelve en el paso anterior)
curl -X PATCH http://localhost:3019/pagos/PAGO_ID/abono \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_VALGREEN" \
  -d '{
    "monto": 750000,
    "metodoPago": "TRANSFERENCIA_BANCARIA"
  }'
```

---

## 12. GENERAR REPORTES

### Reporte de Ingresos Mensual
```bash
curl -X GET "http://localhost:3019/reports/monthly?year=2025&month=1" \
  -H "Authorization: Bearer TOKEN_VALGREEN"
```

### Reporte de Ingresos Anual
```bash
curl -X GET "http://localhost:3019/reports/annual?year=2025" \
  -H "Authorization: Bearer TOKEN_VALGREEN"
```

### Reporte Comparativo
```bash
curl -X GET "http://localhost:3019/reports/comparison?fechaInicio=2025-01-01&fechaFin=2025-12-31" \
  -H "Authorization: Bearer TOKEN_VALGREEN"
```

---

## ⚡ Alternativa: Usar Postman

1. Importar la colección de Postman desde `/api/docs` (Swagger)
2. Crear variables de entorno:
   - `BASE_URL = http://localhost:3019`
   - `ACCESS_TOKEN = (token obtenido del login)`
   - `INMOB_1, INMOB_2, INMOB_3 = IDs de inmobiliarias`
   - `TOKEN_VALGREEN, TOKEN_CENTRO, TOKEN_PREMIUM = tokens`
   - `PROPERTY_1, TENANT_1, CONTRACT_1 = IDs creados`

3. Ejecutar las peticiones en orden

---

## 📊 Resumen del Flujo Completo

```
1. Crear Admin → Login
2. Crear 3 Inmobiliarias
3. Crear 3 Usuarios Inmobiliaria → Login cada uno
4. Crear Propietarios (por inmobiliaria)
5. Crear Propiedades/Inmuebles (por inmobiliaria)
6. Crear Inquilinos (por inmobiliaria)
7. Crear Contratos (vincular inmueble + inquilino)
8. Crear Pagos (vincular al contrato)
9. Registrar Abonos (ir pagando los pagos)
10. Generar Reportes (ver ingresos por período)
```

---

## 🔗 Documentación Swagger

Accede a: `http://localhost:3019/api/docs`

Ahí puedes:
- Ver todas las rutas disponibles
- Probar las peticiones directamente
- Ver los esquemas de request/response
- Copiar ejemplos

