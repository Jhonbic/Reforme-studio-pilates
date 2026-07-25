# Panel Administrativo — Reforme Studio Pilates

> Documentación del módulo administrativo para gestión de usuarios, fase 1.

## Estructura

```
src/
├── app/admin/
│   ├── layout.tsx           # Layout específico del admin
│   ├── page.tsx             # Dashboard con estadísticas
│   └── usuarios/
│       ├── page.tsx         # Listado de usuarios
│       ├── nuevo/
│       │   └── page.tsx     # Crear usuario
│       └── [id]/
│           └── editar/
│               └── page.tsx # Editar usuario
├── components/admin/
│   ├── AdminLayout.tsx      # Contenedor principal
│   ├── AdminNavbar.tsx      # Navegación lateral
│   ├── AdminCard.tsx        # Tarjeta de estadísticas
│   ├── UserTable.tsx        # Tabla de usuarios
│   └── UserForm.tsx         # Formulario compartido
├── lib/
│   └── usuarios.ts          # Funciones de gestión de usuarios (mock)
└── types/
    └── usuario.ts           # Tipos TypeScript
```

## Rutas

- **`/admin`** — Dashboard con estadísticas
- **`/admin/usuarios`** — Listado de usuarios
- **`/admin/usuarios/nuevo`** — Crear nuevo usuario
- **`/admin/usuarios/[id]/editar`** — Editar usuario

## Características

### Dashboard
- Tarjetas de estadísticas: Usuarios totales, Clientes activos, Instructores, Pendientes
- Registro de actividades recientes
- Accesos rápidos a módulos

### Gestión de Usuarios
- **Listado**: Tabla con filtros (todos, activos, pendientes)
- **Crear**: Formulario completo con validación
- **Editar**: Actualizar información del usuario
- **Eliminar**: Con confirmación (modal)

### Datos de Usuario
```typescript
interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  documento?: string;
  genero?: 'masculino' | 'femenino' | 'otro';
  fechaNacimiento?: string;
  rol: 'admin' | 'instructor' | 'cliente' | 'pendiente';
  estado: 'activo' | 'inactivo' | 'suspendido';
  fechaRegistro: string;
  fechaVencimiento?: string;
  foto?: string;
  notas?: string;
}
```

## Diseño

### Paleta de Colores
- **Verde selvático** (`#284435`) — Principal
- **Dorado/Arena** (`#BE9B69`) — Acento
- **Beige** (`#E8E1D9`) — Secundario
- **Arena claro** (`#F7F6F3`) — Fondo

### Tipografía
- **Títulos**: Cormorant (serif elegante)
- **Cuerpo**: Lato (sans-serif)

### Componentes
- Navbar lateral fija con menú contextual
- Tarjetas con bordes dorados izquierdos
- Tabla con filas interactivas (hover)
- Badges de rol/estado con colores semánticos
- Formularios con campos validados

## Mock Data

Actualmente, los datos son simulados en `src/lib/usuarios.ts`. Incluye 3 usuarios de ejemplo.

### Próxima Fase (2)
- Conectar a backend real (endpoints `/api/usuarios`)
- Autenticación y autorización
- Validación en servidor
- Subida de fotos

## Uso

### Listar usuarios
```typescript
import { obtenerUsuarios } from '@/lib/usuarios';

const usuarios = await obtenerUsuarios();
```

### Crear usuario
```typescript
import { crearUsuario } from '@/lib/usuarios';

const nuevoUsuario = await crearUsuario({
  nombre: 'Sandra López',
  email: 'sandra@example.com',
  telefono: '+57 320 1234567',
  rol: 'cliente',
});
```

### Actualizar usuario
```typescript
import { actualizarUsuario } from '@/lib/usuarios';

const actualizado = await actualizarUsuario('1', {
  nombre: 'Sandra López García',
  estado: 'activo',
});
```

### Eliminar usuario
```typescript
import { eliminarUsuario } from '@/lib/usuarios';

await eliminarUsuario('1');
```

## Estados y Roles

### Roles
- `admin` — Administrador del sistema
- `instructor` — Instructor de pilates
- `cliente` — Cliente de pilates
- `pendiente` — Registro pendiente de aprobación

### Estados
- `activo` — Usuario activo y con acceso
- `inactivo` — Usuario sin acceso
- `suspendido` — Usuario temporalmente bloqueado

## Notas Importantes

1. **Mock Data**: Los datos actualmente son simulados. En fase 2 se conectará a un backend real.
2. **Autenticación**: El panel no tiene autenticación en fase 1. Proteger en fase 2.
3. **Validación**: Validación en cliente. Implementar en servidor en fase 2.
4. **Accesibilidad**: Todos los componentes respetan `prefers-reduced-motion`.
5. **Mobile**: Layout responsive, mobile-first.

## Próximas Fases

- **Fase 2**: Backend (Node.js/Python), autenticación, validación
- **Fase 3**: Módulos de clases, planes, reportes
- **Fase 4**: Dashboard analítico con gráficos
