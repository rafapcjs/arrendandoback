# API Endpoints - Inmobiliarias y Propietarios

## Base URL
```
/api/v1
```

---

## 📋 INMOBILIARIAS

### 1. Crear Inmobiliaria (Solo ADMIN)
```http
POST /inmobiliarias
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Inmobiliaria Ejemplo S.A.S.",
  "nit": "900123456-7",
  "direccion": "Calle 10 # 20-30, Bogotá",
  "telefono": "3001234567",
  "email": "contacto@inmobiliaria.com",
  "estado": "ACTIVA"
}
```

**Response (201):**
```json
{
  "id": "uuid-inmobiliaria",
  "nombre": "Inmobiliaria Ejemplo S.A.S.",
  "nit": "900123456-7",
  "direccion": "Calle 10 # 20-30, Bogotá",
  "telefono": "3001234567",
  "email": "contacto@inmobiliaria.com",
  "estado": "ACTIVA",
  "creadoPorId": "uuid-usuario",
  "createdAt": "2025-05-08T10:30:00.000Z",
  "updatedAt": "2025-05-08T10:30:00.000Z"
}
```

---

### 2. Listar todas las Inmobiliarias (Solo ADMIN)
```http
GET /inmobiliarias
Authorization: Bearer {token}
```

**Response (200):**
```json
[
  {
    "id": "uuid-inmobiliaria-1",
    "nombre": "Inmobiliaria A",
    "nit": "900111111-1",
    "direccion": "Calle 1 # 1-1",
    "telefono": "3001111111",
    "email": "a@inmobiliaria.com",
    "estado": "ACTIVA",
    "creadoPorId": "uuid-usuario",
    "createdAt": "2025-05-08T10:30:00.000Z",
    "updatedAt": "2025-05-08T10:30:00.000Z"
  },
  {
    "id": "uuid-inmobiliaria-2",
    "nombre": "Inmobiliaria B",
    "nit": "900222222-2",
    "direccion": "Calle 2 # 2-2",
    "telefono": "3002222222",
    "email": "b@inmobiliaria.com",
    "estado": "ACTIVA",
    "creadoPorId": "uuid-usuario",
    "createdAt": "2025-05-08T10:35:00.000Z",
    "updatedAt": "2025-05-08T10:35:00.000Z"
  }
]
```

---

### 3. Obtener Inmobiliaria por ID
```http
GET /inmobiliarias/{id}
Authorization: Bearer {token}
```

**Parámetros:**
- `id` (UUID): ID de la inmobiliaria

**Response (200):**
```json
{
  "id": "uuid-inmobiliaria",
  "nombre": "Inmobiliaria Ejemplo S.A.S.",
  "nit": "900123456-7",
  "direccion": "Calle 10 # 20-30, Bogotá",
  "telefono": "3001234567",
  "email": "contacto@inmobiliaria.com",
  "estado": "ACTIVA",
  "creadoPorId": "uuid-usuario",
  "createdAt": "2025-05-08T10:30:00.000Z",
  "updatedAt": "2025-05-08T10:30:00.000Z"
}
```

---

### 4. Actualizar Inmobiliaria (Solo ADMIN)
```http
PATCH /inmobiliarias/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**Parámetros:**
- `id` (UUID): ID de la inmobiliaria

**Body (todos opcionales):**
```json
{
  "nombre": "Inmobiliaria Actualizada",
  "nit": "900123456-7",
  "direccion": "Nueva Calle 10 # 20-30",
  "telefono": "3009999999",
  "email": "nuevo@inmobiliaria.com",
  "estado": "ACTIVA"
}
```

**Response (200):** Mismo formato que GET /inmobiliarias/{id}

---

### 5. Activar/Desactivar Inmobiliaria (Solo ADMIN)
```http
PATCH /inmobiliarias/{id}/toggle-estado
Authorization: Bearer {token}
```

**Parámetros:**
- `id` (UUID): ID de la inmobiliaria

**Response (200):** Inmobiliaria con estado toggleado

---

## 👥 PROPIETARIOS

### 1. Crear Propietario
```http
POST /propietarios
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "inmobiliariaId": "uuid-inmobiliaria",
  "nombre": "Carlos Ramírez López",
  "documento": "12345678",
  "telefono": "3001234567",
  "email": "carlos@correo.com"
}
```

**Notas:**
- Si rol es `INMOBILIARIA`: `inmobiliariaId` es **ignorado**, se usa el del token
- Si rol es `ADMIN`: `inmobiliariaId` es **requerido**

**Response (201):**
```json
{
  "id": "uuid-propietario",
  "inmobiliariaId": "uuid-inmobiliaria",
  "nombre": "Carlos Ramírez López",
  "documento": "12345678",
  "telefono": "3001234567",
  "email": "carlos@correo.com",
  "isActive": true,
  "createdAt": "2025-05-08T10:30:00.000Z",
  "updatedAt": "2025-05-08T10:30:00.000Z"
}
```

---

### 2. Listar Propietarios
```http
GET /propietarios
Authorization: Bearer {token}
```

**Behavior:**
- Si rol es `ADMIN`: lista todos los propietarios de todas las inmobiliarias
- Si rol es `INMOBILIARIA`: lista solo propietarios de su inmobiliaria

**Response (200):**
```json
[
  {
    "id": "uuid-propietario-1",
    "inmobiliariaId": "uuid-inmobiliaria",
    "nombre": "Carlos Ramírez López",
    "documento": "12345678",
    "telefono": "3001234567",
    "email": "carlos@correo.com",
    "isActive": true,
    "createdAt": "2025-05-08T10:30:00.000Z",
    "updatedAt": "2025-05-08T10:30:00.000Z"
  }
]
```

---

### 3. Obtener Propietario por ID
```http
GET /propietarios/{id}
Authorization: Bearer {token}
```

**Parámetros:**
- `id` (UUID): ID del propietario

**Behavior:**
- Si rol es `INMOBILIARIA`: solo si el propietario pertenece a su inmobiliaria (error 403 si no)

**Response (200):** Mismo formato que crear propietario

---

### 4. Actualizar Propietario
```http
PATCH /propietarios/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**Parámetros:**
- `id` (UUID): ID del propietario

**Body (todos opcionales):**
```json
{
  "nombre": "Carlos Ramírez López Actualizado",
  "documento": "12345678",
  "telefono": "3009999999",
  "email": "newemail@correo.com"
}
```

**Response (200):** Propietario actualizado

---

### 5. Activar/Desactivar Propietario
```http
PATCH /propietarios/{id}/activate
Authorization: Bearer {token}
Content-Type: application/json
```

**Parámetros:**
- `id` (UUID): ID del propietario

**Body:**
```json
{
  "isActive": false
}
```

**Response (200):** Propietario con nuevo estado

---

### 6. Eliminar Propietario
```http
DELETE /propietarios/{id}
Authorization: Bearer {token}
```

**Parámetros:**
- `id` (UUID): ID del propietario

**Response (204):** Sin contenido

---

## 🔐 Autenticación

Todos los endpoints requieren:
```
Authorization: Bearer {jwt_token}
```

El JWT debe contener:
```json
{
  "sub": "uuid-usuario",
  "email": "usuario@example.com",
  "role": "ADMIN" | "INMOBILIARIA",
  "inmobiliariaId": "uuid-inmobiliaria" | null
}
```

---

## ❌ Códigos de Error

| Código | Significado |
|--------|-------------|
| 201 | Creado exitosamente |
| 200 | OK |
| 204 | Sin contenido (DELETE exitoso) |
| 400 | Bad Request (validación fallida) |
| 403 | Forbidden (permiso insuficiente) |
| 404 | Not Found |
| 409 | Conflict (NIT/email duplicado) |

---

## 📌 Notas importantes

1. **Aislamiento por Inmobiliaria:**
   - INMOBILIARIA solo ve/modifica sus propios propietarios
   - ADMIN ve/modifica todo

2. **inmobiliariaId en Body:**
   - ADMIN: siempre debe incluirlo
   - INMOBILIARIA: se ignora, se usa el del token

3. **Estados de Inmobiliaria:**
   - `ACTIVA` - funcionando
   - `INACTIVA` - desactivada

4. **Estados de Propietario:**
   - `isActive: true` - disponible
   - `isActive: false` - desactivado
