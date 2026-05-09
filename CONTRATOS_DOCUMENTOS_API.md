# API — Documentos de Respaldo en Contratos

Los contratos ahora soportan archivos adjuntos (cédulas, PDFs, Word, imágenes) guardados directamente en el objeto del contrato bajo el campo `documentos`.

---

## Estructura del contrato con documentos

Cualquier endpoint que retorne un contrato (`GET /contratos`, `GET /contratos/:id`, `POST /contratos`, etc.) ahora incluye el campo `documentos`:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-12-31",
  "canonMensual": 1500000,
  "estado": "ACTIVO",
  "inquilinoId": "uuid",
  "inmuebleId": "uuid",
  "documentos": [
    {
      "docId": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://res.cloudinary.com/diaxo8ovb/raw/upload/contratos/documentos/cedula.pdf",
      "nombre": "cedula_inquilino.pdf",
      "tipo": "application/pdf",
      "subidoEn": "2026-05-09T18:00:00.000Z"
    },
    {
      "docId": "660e8400-e29b-41d4-a716-446655440001",
      "url": "https://res.cloudinary.com/diaxo8ovb/raw/upload/contratos/documentos/contrato_firmado.pdf",
      "nombre": "contrato_firmado.pdf",
      "tipo": "application/pdf",
      "subidoEn": "2026-05-09T18:05:00.000Z"
    }
  ],
  "inquilino": { ... },
  "inmueble": { ... }
}
```

> Si el contrato no tiene documentos el campo llega como `"documentos": []`.

---

## Endpoints

### 1. Subir documento
```
POST /contratos/:id/documentos
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
| Campo | Tipo   | Requerido | Descripción          |
|-------|--------|-----------|----------------------|
| file  | File   | Sí        | El archivo a subir   |

**Tipos aceptados:**
- `application/pdf`
- `application/msword` (.doc)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- `image/jpeg`
- `image/png`
- `image/webp`

**Tamaño máximo:** 10 MB

**Respuesta exitosa (200):** El contrato completo con el nuevo documento agregado al array `documentos`.

**Ejemplo con fetch:**
```js
const formData = new FormData();
formData.append('file', archivoSeleccionado);

const res = await fetch(`/contratos/${contratoId}/documentos`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
const contratoActualizado = await res.json();
```

---

### 2. Reemplazar documento (editar)
```
PATCH /contratos/:id/documentos/:docId
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

El `docId` es el identificador único del documento dentro del array `documentos` del contrato.

**Body (form-data):**
| Campo | Tipo   | Requerido | Descripción              |
|-------|--------|-----------|--------------------------|
| file  | File   | Sí        | El archivo de reemplazo  |

**Respuesta exitosa (200):** El contrato completo con el documento reemplazado (misma posición en el array, mismo `docId`, nuevo `url`, `nombre`, `tipo` y `subidoEn`).

**Ejemplo con fetch:**
```js
const formData = new FormData();
formData.append('file', nuevoArchivo);

const res = await fetch(`/contratos/${contratoId}/documentos/${docId}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
const contratoActualizado = await res.json();
```

---

### 3. Eliminar documento
```
DELETE /contratos/:id/documentos/:docId
Authorization: Bearer <token>
```

Sin body. Solo elimina el archivo de la lista. **El contrato no se borra.**

**Respuesta exitosa (200):** El contrato completo sin ese documento en el array.

**Ejemplo con fetch:**
```js
const res = await fetch(`/contratos/${contratoId}/documentos/${docId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
const contratoActualizado = await res.json();
```

---

## Flujo completo en UI

### Vista detalle del contrato

```
┌─────────────────────────────────────────────┐
│  Contrato #001 — Activo                     │
│  Inquilino: Juan Pérez                       │
│  Inmueble: Cra 5 #10-20                     │
│  Canon: $1.500.000                          │
├─────────────────────────────────────────────┤
│  📎 Documentos de respaldo                  │
│                                             │
│  📄 cedula_inquilino.pdf          09/05/26  │
│     [Ver] [Reemplazar] [Eliminar]           │
│                                             │
│  📄 contrato_firmado.pdf          09/05/26  │
│     [Ver] [Reemplazar] [Eliminar]           │
│                                             │
│  [+ Subir documento]                        │
└─────────────────────────────────────────────┘
```

### Acciones:
- **Ver** → `window.open(documento.url)` — abre el archivo en Cloudinary directamente
- **Subir documento** → input file → `POST /contratos/:id/documentos`
- **Reemplazar** → input file → `PATCH /contratos/:id/documentos/:docId`
- **Eliminar** → confirmación → `DELETE /contratos/:id/documentos/:docId`

### Cómo obtener el `docId`
El `docId` viene dentro de cada objeto del array `documentos`:
```js
contrato.documentos.forEach(doc => {
  console.log(doc.docId);   // UUID para usar en PATCH y DELETE
  console.log(doc.url);     // Link directo al archivo
  console.log(doc.nombre);  // Nombre original del archivo
  console.log(doc.tipo);    // MIME type
  console.log(doc.subidoEn); // Fecha ISO
});
```

---

## Errores comunes

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | `Debe enviar un archivo` | No se adjuntó ningún file en el form |
| 400 | `Solo se permiten PDF, Word, JPG, PNG o WEBP` | Tipo de archivo no permitido |
| 400 | `El archivo supera el límite de 10MB` | Archivo muy grande |
| 404 | `Contrato no encontrado` | El ID del contrato no existe |
| 404 | `Documento no encontrado en este contrato` | El `docId` no existe en ese contrato |
| 403 | `No tienes acceso a este contrato` | El contrato pertenece a otra inmobiliaria |
