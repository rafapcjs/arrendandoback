# 🎯 Guía para Frontend - Implementación de Inmobiliarias y Propietarios

## 📌 Contexto Arquitectónico

El backend ahora soporta **multi-tenant** con dos roles:
- **ADMIN** → Acceso total a todas las inmobiliarias y datos
- **INMOBILIARIA** → Acceso solo a sus propios datos (automático por JWT)

---

## 🔑 Configuración Inicial

### 1. Token JWT esperado
```json
{
  "sub": "user-uuid",
  "email": "usuario@example.com",
  "role": "ADMIN" | "INMOBILIARIA",
  "inmobiliariaId": "uuid-inmobiliaria" | null,
  "iat": 1234567890,
  "exp": 1234571490
}
```

### 2. Guardar en localStorage
```javascript
// Después del login
localStorage.setItem('token', response.access_token);
localStorage.setItem('user', JSON.stringify(response.user));
```

### 3. Interceptor HTTP global
```javascript
// Agregar a cada request
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

---

## 📋 Flujo: INMOBILIARIAS

### Para ADMIN

#### ✅ Crear Inmobiliaria
```javascript
const createInmobiliaria = async (data) => {
  const response = await fetch('/inmobiliarias', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nombre: data.nombre,
      nit: data.nit,
      direccion: data.direccion,
      telefono: data.telefono,
      email: data.email,
      estado: 'ACTIVA' // o 'INACTIVA'
    })
  });
  return response.json();
};
```

#### ✅ Listar todas las Inmobiliarias
```javascript
const getInmobiliarias = async () => {
  const response = await fetch('/inmobiliarias', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

#### ✅ Obtener Inmobiliaria por ID
```javascript
const getInmobiliariaById = async (id) => {
  const response = await fetch(`/inmobiliarias/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

#### ✅ Actualizar Inmobiliaria
```javascript
const updateInmobiliaria = async (id, data) => {
  const response = await fetch(`/inmobiliarias/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data) // Solo los campos a actualizar
  });
  return response.json();
};
```

#### ✅ Togglear Estado Inmobiliaria
```javascript
const toggleInmobiliariaEstado = async (id) => {
  const response = await fetch(`/inmobiliarias/${id}/toggle-estado`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## 👥 Flujo: PROPIETARIOS

### Para ADMIN

```javascript
// ✅ CREAR PROPIETARIO
const createPropietario = async (inmobiliariaId, data) => {
  // ADMIN DEBE especificar inmobiliariaId
  const response = await fetch('/propietarios', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inmobiliariaId: inmobiliariaId, // ⚠️ ADMIN LO ESPECIFICA
      nombre: data.nombre,
      documento: data.documento,
      telefono: data.telefono,
      email: data.email
    })
  });
  return response.json();
};

// ✅ LISTAR PROPIETARIOS
const getPropietarios = async () => {
  // ADMIN ve todos, INMOBILIARIA ve solo los suyos
  const response = await fetch('/propietarios', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// ✅ OBTENER PROPIETARIO POR ID
const getPropietarioById = async (id) => {
  const response = await fetch(`/propietarios/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// ✅ ACTUALIZAR PROPIETARIO
const updatePropietario = async (id, data) => {
  const response = await fetch(`/propietarios/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
};

// ✅ ACTIVAR/DESACTIVAR PROPIETARIO
const togglePropietarioActive = async (id, isActive) => {
  const response = await fetch(`/propietarios/${id}/activate`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isActive })
  });
  return response.json();
};

// ✅ ELIMINAR PROPIETARIO
const deletePropietario = async (id) => {
  const response = await fetch(`/propietarios/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.status === 204; // true si éxito
};
```

### Para INMOBILIARIA

```javascript
// ⚠️ CREAR PROPIETARIO (sin especificar inmobiliariaId)
const createPropietarioAsInmobiliaria = async (data) => {
  // INMOBILIARIA NO especifica inmobiliariaId
  // El backend lo toma automáticamente del JWT
  const response = await fetch('/propietarios', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // ❌ NO INCLUIR inmobiliariaId
      nombre: data.nombre,
      documento: data.documento,
      telefono: data.telefono,
      email: data.email
    })
  });
  return response.json();
};

// ✅ LISTAR SUS PROPIETARIOS
const getPropietarios = async () => {
  // Automáticamente filtra por su inmobiliariaId
  const response = await fetch('/propietarios', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## 🛡️ Manejo de Errores

```javascript
const handleApiError = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 400:
        console.error('Validación fallida:', error.message);
        // Mostrar errores de validación al usuario
        break;
      case 403:
        console.error('Permiso insuficiente');
        // Redirigir a login o mostrar mensaje de acceso denegado
        break;
      case 404:
        console.error('Recurso no encontrado');
        break;
      case 409:
        console.error('Conflicto (NIT/email/documento duplicado):', error.message);
        break;
      default:
        console.error('Error del servidor:', error.message);
    }
    
    throw error;
  }
};
```

---

## 📊 Casos de Uso Comunes

### Caso 1: ADMIN Administra Inmobiliarias

```javascript
// Flujo típico
const adminFlow = async () => {
  try {
    // 1. Crear inmobiliaria
    const newInmo = await createInmobiliaria({
      nombre: 'Mi Inmobiliaria',
      nit: '900123456-7',
      direccion: 'Calle 1 # 1-1',
      telefono: '3001234567',
      email: 'contacto@inmobiliaria.com'
    });
    console.log('Inmobiliaria creada:', newInmo.id);

    // 2. Listar todas las inmobiliarias
    const inmos = await getInmobiliarias();
    console.log('Total inmobiliarias:', inmos.length);

    // 3. Crear propietario en esa inmobiliaria
    const newPropietario = await createPropietario(newInmo.id, {
      nombre: 'Carlos López',
      documento: '12345678',
      telefono: '3001234567',
      email: 'carlos@correo.com'
    });
    console.log('Propietario creado:', newPropietario.id);

  } catch (error) {
    handleApiError(error);
  }
};
```

### Caso 2: INMOBILIARIA Gestiona Sus Propietarios

```javascript
const inmobiliariaFlow = async () => {
  try {
    // 1. Crear propietario (sin especificar inmobiliariaId)
    const newPropietario = await createPropietarioAsInmobiliaria({
      nombre: 'Juan Pérez',
      documento: '87654321',
      telefono: '3009876543',
      email: 'juan@correo.com'
    });
    console.log('Propietario creado en mi inmobiliaria:', newPropietario.id);

    // 2. Listar mis propietarios
    const misPropietarios = await getPropietarios();
    console.log('Mis propietarios:', misPropietarios);

    // 3. Actualizar propietario
    const updated = await updatePropietario(newPropietario.id, {
      telefono: '3009999999'
    });
    console.log('Propietario actualizado');

  } catch (error) {
    handleApiError(error);
  }
};
```

---

## 🚨 Validaciones Frontend que DEBES hacer

```javascript
// Antes de enviar cualquier request

const validateInmobiliaria = (data) => {
  if (!data.nombre || data.nombre.trim() === '') 
    throw new Error('Nombre requerido');
  if (!data.nit || data.nit.trim() === '') 
    throw new Error('NIT requerido');
  if (!data.direccion || data.direccion.trim() === '') 
    throw new Error('Dirección requerida');
  if (!data.telefono || data.telefono.trim() === '') 
    throw new Error('Teléfono requerido');
  if (!data.email || !data.email.includes('@')) 
    throw new Error('Email válido requerido');
};

const validatePropietario = (data) => {
  if (!data.nombre || data.nombre.trim() === '') 
    throw new Error('Nombre requerido');
  if (!data.documento || data.documento.trim() === '') 
    throw new Error('Documento requerido');
  if (!data.telefono || data.telefono.trim() === '') 
    throw new Error('Teléfono requerido');
  if (data.email && !data.email.includes('@')) 
    throw new Error('Email válido requerido');
};
```

---

## 📋 Checklist Implementación

- [ ] Token JWT almacenado en localStorage
- [ ] Interceptor HTTP agregado a todos los requests
- [ ] Función para crear inmobiliaria (ADMIN)
- [ ] Función para listar inmobiliarias (ADMIN)
- [ ] Función para obtener inmobiliaria por ID
- [ ] Función para actualizar inmobiliaria
- [ ] Función para crear propietario (distinguir ADMIN vs INMOBILIARIA)
- [ ] Función para listar propietarios (automático por rol)
- [ ] Función para actualizar propietario
- [ ] Función para activar/desactivar propietario
- [ ] Función para eliminar propietario
- [ ] Manejo de errores 400/403/404/409
- [ ] Validaciones frontend antes de enviar
- [ ] Mensajes de error al usuario
- [ ] Indicadores de carga

---

## 🔗 Rutas relacionadas

Una vez tengas esto listo, puedes integrar con:
- **Inmuebles** (`/properties`) - requieren `propietarioId` y `inmobiliariaId`
- **Inquilinos** (`/tenants`) - requieren `inmobiliariaId`
- **Contratos** (`/contratos`) - relacionan propietario, inmueble, inquilino

Ver `API_ENDPOINTS.md` para detalles completos.
