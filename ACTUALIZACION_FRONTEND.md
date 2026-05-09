# 🔄 Guía de Actualización Frontend - Multi-tenant

## 📌 Resumen de Cambios

El backend pasó de ser **single-tenant** (un ADMIN) a **multi-tenant** (ADMIN + INMOBILIARIAs).

### Cambios principales:
- ✅ Nuevo enum de Roles: `ADMIN` y `INMOBILIARIA`
- ✅ Nuevo campo en JWT: `inmobiliariaId`
- ✅ Nuevos módulos: Inmobiliarias y Propietarios
- ✅ Aislamiento automático: INMOBILIARIA solo ve sus datos
- ✅ Nuevos campos en entidades: `inmobiliariaId` y `propietarioId`

---

## 🔑 PASO 1: Actualizar Servicio de Autenticación

### Antes (viejo):
```typescript
// auth.service.ts
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string; // "ADMIN"
}
```

### Después (nuevo):
```typescript
// auth.service.ts
import { Role } from './enums/roles.enum';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role; // "ADMIN" | "INMOBILIARIA"
  inmobiliariaId: string | null; // ⚠️ NUEVO
}

// Al hacer login, guardar inmobiliariaId también
const saveUser = (user: User) => {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('userRole', user.role);
  localStorage.setItem('inmobiliariaId', user.inmobiliariaId || 'null');
};

// Función helper para obtener el rol
const getUserRole = (): Role => {
  return localStorage.getItem('userRole') as Role;
};

// Función helper para obtener inmobiliariaId
const getInmobiliariaId = (): string | null => {
  const id = localStorage.getItem('inmobiliariaId');
  return id === 'null' ? null : id;
};

// Función helper para saber si es ADMIN
const isAdmin = (): boolean => {
  return getUserRole() === Role.ADMIN;
};

// Función helper para saber si es INMOBILIARIA
const isInmobiliaria = (): boolean => {
  return getUserRole() === Role.INMOBILIARIA;
};
```

---

## 🛠️ PASO 2: Actualizar Interceptor HTTP

### Antes:
```typescript
// http.interceptor.ts
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  const token = localStorage.getItem('token');
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next.handle(req);
}
```

### Después:
```typescript
// http.interceptor.ts
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  const token = localStorage.getItem('token');
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  return next.handle(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        // Token inválido o permisos insuficientes
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirigir a login
        this.router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
}
```

---

## 📋 PASO 3: Crear Enum de Roles

### Crear archivo: `src/models/enums/roles.enum.ts`
```typescript
export enum Role {
  ADMIN = 'ADMIN',
  INMOBILIARIA = 'INMOBILIARIA'
}
```

---

## 🏢 PASO 4: Crear Servicio de Inmobiliarias

### Crear archivo: `src/services/inmobiliarias.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Inmobiliaria {
  id: string;
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  estado: 'ACTIVA' | 'INACTIVA';
  creadoPorId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class InmobiliariasService {
  private apiUrl = '/inmobiliarias';

  constructor(private http: HttpClient) {}

  // Solo ADMIN
  create(data: Omit<Inmobiliaria, 'id' | 'creadoPorId' | 'createdAt' | 'updatedAt'>): Observable<Inmobiliaria> {
    return this.http.post<Inmobiliaria>(this.apiUrl, data);
  }

  // Solo ADMIN
  getAll(): Observable<Inmobiliaria[]> {
    return this.http.get<Inmobiliaria[]>(this.apiUrl);
  }

  getById(id: string): Observable<Inmobiliaria> {
    return this.http.get<Inmobiliaria>(`${this.apiUrl}/${id}`);
  }

  update(id: string, data: Partial<Inmobiliaria>): Observable<Inmobiliaria> {
    return this.http.patch<Inmobiliaria>(`${this.apiUrl}/${id}`, data);
  }

  toggleEstado(id: string): Observable<Inmobiliaria> {
    return this.http.patch<Inmobiliaria>(`${this.apiUrl}/${id}/toggle-estado`, {});
  }
}
```

---

## 👥 PASO 5: Crear Servicio de Propietarios

### Crear archivo: `src/services/propietarios.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Propietario {
  id: string;
  inmobiliariaId: string;
  nombre: string;
  documento: string;
  telefono: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PropietariosService {
  private apiUrl = '/propietarios';

  constructor(private http: HttpClient) {}

  create(data: Omit<Propietario, 'id' | 'createdAt' | 'updatedAt'>, isAdmin: boolean): Observable<Propietario> {
    // Si es ADMIN, debe incluir inmobiliariaId
    // Si es INMOBILIARIA, NO debe incluir inmobiliariaId (se toma del JWT)
    if (!isAdmin) {
      const { inmobiliariaId, ...dataWithoutInmo } = data;
      return this.http.post<Propietario>(this.apiUrl, dataWithoutInmo);
    }
    return this.http.post<Propietario>(this.apiUrl, data);
  }

  getAll(): Observable<Propietario[]> {
    // ADMIN ve todos
    // INMOBILIARIA ve solo los suyos (automático por JWT)
    return this.http.get<Propietario[]>(this.apiUrl);
  }

  getById(id: string): Observable<Propietario> {
    return this.http.get<Propietario>(`${this.apiUrl}/${id}`);
  }

  update(id: string, data: Partial<Propietario>): Observable<Propietario> {
    return this.http.patch<Propietario>(`${this.apiUrl}/${id}`, data);
  }

  toggleActive(id: string, isActive: boolean): Observable<Propietario> {
    return this.http.patch<Propietario>(`${this.apiUrl}/${id}/activate`, { isActive });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

---

## 🏠 PASO 6: Actualizar Servicio de Inmuebles (Properties)

### Cambios necesarios en `properties.service.ts`:

```typescript
// ANTES - Sin inmobiliariaId
create(data: CreatePropertyDto): Observable<Property> {
  return this.http.post<Property>('/properties', data);
}

// DESPUÉS - Con inmobiliariaId e propietarioId
create(data: CreatePropertyDto & { inmobiliariaId?: string; propietarioId?: string }, isAdmin: boolean): Observable<Property> {
  if (!isAdmin) {
    // INMOBILIARIA - remover inmobiliariaId, el backend lo toma del JWT
    const { inmobiliariaId, ...dataWithoutInmo } = data;
    return this.http.post<Property>('/properties', dataWithoutInmo);
  }
  return this.http.post<Property>('/properties', data);
}

// ANTES - Sin filtros multi-tenant
getAll(pagination?: PaginationParams): Observable<PaginatedResponse<Property>> {
  return this.http.get<PaginatedResponse<Property>>('/properties', { params: pagination });
}

// DESPUÉS - Automáticamente filtra por inmobiliariaId (el backend lo maneja)
// No hay cambio en la llamada, pero el backend filtra automáticamente
getAll(pagination?: PaginationParams): Observable<PaginatedResponse<Property>> {
  return this.http.get<PaginatedResponse<Property>>('/properties', { params: pagination });
}
```

---

## 👨‍👩‍👧 PASO 7: Actualizar Servicio de Inquilinos (Tenants)

```typescript
// ANTES - Sin inmobiliariaId
create(data: CreateTenantDto): Observable<Tenant> {
  return this.http.post<Tenant>('/tenants', data);
}

// DESPUÉS - Con inmobiliariaId
create(data: CreateTenantDto & { inmobiliariaId?: string }, isAdmin: boolean): Observable<Tenant> {
  if (!isAdmin) {
    // INMOBILIARIA - remover inmobiliariaId
    const { inmobiliariaId, ...dataWithoutInmo } = data;
    return this.http.post<Tenant>('/tenants', dataWithoutInmo);
  }
  return this.http.post<Tenant>('/tenants', data);
}
```

---

## 📝 PASO 8: Actualizar Servicio de Contratos

```typescript
// ANTES - Sin inmobiliariaId ni propietarioId
create(data: CreateContratoDto): Observable<Contrato> {
  return this.http.post<Contrato>('/contratos', data);
}

// DESPUÉS - Con inmobiliariaId y propietarioId
create(data: CreateContratoDto & { inmobiliariaId?: string; propietarioId?: string }, isAdmin: boolean): Observable<Contrato> {
  if (!isAdmin) {
    // INMOBILIARIA - remover inmobiliariaId
    const { inmobiliariaId, ...dataWithoutInmo } = data;
    return this.http.post<Contrato>('/contratos', dataWithoutInmo);
  }
  return this.http.post<Contrato>('/contratos', data);
}
```

---

## 💰 PASO 9: Actualizar Servicio de Pagos

```typescript
// Los pagos ahora incluyen automáticamente inmobiliariaId
// del contrato asociado. No hay cambios en las llamadas.

// ANTES y DESPUÉS son iguales
create(data: CreatePagoDto): Observable<Pago> {
  return this.http.post<Pago>('/pagos', data);
}

getAll(): Observable<Pago[]> {
  return this.http.get<Pago[]>('/pagos');
}
```

---

## 🎨 PASO 10: Actualizar Componentes

### Ejemplo: Crear Inmueble (ADMIN vs INMOBILIARIA)

#### Antes (no tenía selector de inmobiliaria):
```typescript
export class CreatePropertyComponent {
  form = this.fb.group({
    direccion: ['', Validators.required],
    codigoServicioAgua: ['', Validators.required],
    codigoServicioGas: ['', Validators.required],
    codigoServicioLuz: ['', Validators.required],
    descripcion: [''],
    propietarioId: [''] // ANTES: no existía
  });

  onSubmit() {
    this.propertiesService.create(this.form.value).subscribe(...);
  }
}
```

#### Después (con selector condicional):
```typescript
import { Role } from './models/enums/roles.enum';
import { AuthService } from './services/auth.service';

export class CreatePropertyComponent implements OnInit {
  inmobiliarias: Inmobiliaria[] = [];
  isAdmin = false;

  form = this.fb.group({
    inmobiliariaId: ['', Validators.required], // ✅ NUEVO (solo ADMIN)
    propietarioId: ['', Validators.required], // ✅ NUEVO
    direccion: ['', Validators.required],
    codigoServicioAgua: ['', Validators.required],
    codigoServicioGas: ['', Validators.required],
    codigoServicioLuz: ['', Validators.required],
    descripcion: ['']
  });

  constructor(
    private fb: FormBuilder,
    private propertiesService: PropertiesService,
    private inmobiliariasService: InmobiliariasService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    
    // Si es ADMIN, cargar inmobiliarias para selector
    if (this.isAdmin) {
      this.inmobiliariasService.getAll().subscribe(
        inmos => this.inmobiliarias = inmos
      );
    } else {
      // Si es INMOBILIARIA, pre-llenar con su inmobiliariaId
      this.form.patchValue({
        inmobiliariaId: this.authService.getInmobiliariaId()
      });
      // Y deshabilitar el selector
      this.form.get('inmobiliariaId')?.disable();
    }
  }

  onSubmit() {
    const data = this.form.value;
    this.propertiesService.create(data, this.isAdmin).subscribe(
      success => console.log('Inmueble creado'),
      error => console.error('Error:', error)
    );
  }
}
```

---

## 🎯 PASO 11: Actualizar Listados

### Ejemplo: Listar Propietarios

#### Antes:
```typescript
export class PropietariosListComponent implements OnInit {
  propietarios: Propietario[] = [];

  constructor(private propietariosService: PropietariosService) {}

  ngOnInit() {
    this.propietariosService.getAll().subscribe(
      data => this.propietarios = data
    );
  }
}
```

#### Después (exactamente igual - el filtrado es automático):
```typescript
export class PropietariosListComponent implements OnInit {
  propietarios: Propietario[] = [];

  constructor(private propietariosService: PropietariosService) {}

  ngOnInit() {
    // ✅ Igual que antes
    // ADMIN verá todos los propietarios
    // INMOBILIARIA verá solo los suyos (filtrado automáticamente por el backend)
    this.propietariosService.getAll().subscribe(
      data => this.propietarios = data
    );
  }
}
```

---

## 🔒 PASO 12: Proteger Rutas por Rol

### Crear guardia: `src/guards/role.guard.ts`
```typescript
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/enums/roles.enum';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = route.data['roles'] as Role[];
    const userRole = this.authService.getUserRole();

    if (!requiredRoles || requiredRoles.includes(userRole)) {
      return true;
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
}
```

### Usar en rutas:
```typescript
const routes: Routes = [
  // Solo ADMIN
  {
    path: 'inmobiliarias',
    component: InmobiliariasListComponent,
    canActivate: [RoleGuard],
    data: { roles: [Role.ADMIN] }
  },
  
  // ADMIN e INMOBILIARIA
  {
    path: 'propietarios',
    component: PropietariosListComponent,
    canActivate: [RoleGuard],
    data: { roles: [Role.ADMIN, Role.INMOBILIARIA] }
  },
  
  // ADMIN e INMOBILIARIA
  {
    path: 'properties',
    component: PropertiesListComponent,
    canActivate: [RoleGuard],
    data: { roles: [Role.ADMIN, Role.INMOBILIARIA] }
  }
];
```

---

## ✅ CHECKLIST - Qué Actualizar

- [ ] Actualizar `auth.service.ts` con `inmobiliariaId`
- [ ] Actualizar interceptor HTTP con manejo de errores 401/403
- [ ] Crear `roles.enum.ts`
- [ ] Crear `inmobiliarias.service.ts` ⭐ NUEVO
- [ ] Crear `propietarios.service.ts` ⭐ NUEVO
- [ ] Actualizar `properties.service.ts` (agregar `inmobiliariaId`, `propietarioId`)
- [ ] Actualizar `tenants.service.ts` (agregar `inmobiliariaId`)
- [ ] Actualizar `contratos.service.ts` (agregar `inmobiliariaId`, `propietarioId`)
- [ ] Actualizar todos los componentes de **crear** (condicionar `inmobiliariaId`)
- [ ] Crear componentes de Inmobiliarias (ADMIN solo)
- [ ] Crear componentes de Propietarios (ADMIN + INMOBILIARIA)
- [ ] Crear `role.guard.ts`
- [ ] Actualizar rutas con `RoleGuard`
- [ ] Agregar selectores de Inmobiliaria en formularios ADMIN
- [ ] Probar login como ADMIN
- [ ] Probar login como INMOBILIARIA
- [ ] Verificar que INMOBILIARIA solo ve sus datos

---

## 🧪 Pruebas Recomendadas

```typescript
// Test 1: ADMIN crea inmobiliaria
// Test 2: ADMIN crea propietario en inmobiliaria X
// Test 3: ADMIN crea inmueble en inmobiliaria X
// Test 4: INMOBILIARIA_Y intenta acceder a datos de INMOBILIARIA_X → debe fallar (403)
// Test 5: INMOBILIARIA_X ve solo sus propietarios → debe ver solo lo suyo
// Test 6: INMOBILIARIA_X intenta crear sin inmobiliariaId → debe funcionar (toma del JWT)
```

---

## 🚀 Orden de Implementación Recomendado

1. Actualizar `auth.service.ts` ← empezar aquí
2. Crear enums y servicios ← segundo
3. Actualizar servicios existentes ← tercero
4. Actualizar componentes de crear ← cuarto
5. Crear nuevos componentes (inmobiliarias) ← quinto
6. Crear guardias y proteger rutas ← sexto
7. Probar todo ← séptimo

---

## 📞 Soporte

Si algo no funciona:
- Verificar que el token incluye `inmobiliariaId`
- Verificar que INMOBILIARIA **no** envía `inmobiliariaId` en body
- Verificar que ADMIN **sí** envía `inmobiliariaId` en body
- Ver logs del servidor para errores 403/400
