import { Usuario, UsuarioCreate, UsuarioUpdate } from '@/types/usuario';

// Mock data - en Fase 2 se conectará a backend real
const usuariosMock: Usuario[] = [
  {
    id: '1',
    nombre: 'Sandra López',
    email: 'sandra@example.com',
    telefono: '+57 320 1234567',
    documento: '1234567890',
    genero: 'femenino',
    fechaNacimiento: '1988-05-15',
    rol: 'cliente',
    estado: 'activo',
    fechaRegistro: '2026-01-15',
    fechaVencimiento: '2026-08-15',
  },
  {
    id: '2',
    nombre: 'Carlos Mendez',
    email: 'carlos@example.com',
    telefono: '+57 320 7654321',
    documento: '0987654321',
    genero: 'masculino',
    fechaNacimiento: '1995-08-22',
    rol: 'cliente',
    estado: 'activo',
    fechaRegistro: '2026-02-10',
    fechaVencimiento: '2026-09-10',
  },
  {
    id: '3',
    nombre: 'María Instructora',
    email: 'maria@reforme.com',
    telefono: '+57 320 1111111',
    documento: '1111111111',
    genero: 'femenino',
    rol: 'instructor',
    estado: 'activo',
    fechaRegistro: '2025-12-01',
  },
];

// Simular gestión de usuarios (fase 2: conectar a backend real)
export async function obtenerUsuarios(): Promise<Usuario[]> {
  // TODO: Conectar a /api/usuarios cuando backend esté listo
  return Promise.resolve(usuariosMock);
}

export async function obtenerUsuario(id: string): Promise<Usuario | null> {
  // TODO: Conectar a /api/usuarios/:id
  return Promise.resolve(usuariosMock.find((u) => u.id === id) || null);
}

export async function crearUsuario(datos: UsuarioCreate): Promise<Usuario> {
  // TODO: POST /api/usuarios
  const nuevoId = String(Math.max(...usuariosMock.map((u) => Number(u.id))) + 1);
  const ahora = new Date().toISOString().split('T')[0];
  const nuevoUsuario: Usuario = {
    ...datos,
    id: nuevoId,
    estado: 'pendiente' === datos.rol ? 'inactivo' : 'activo',
    fechaRegistro: ahora,
  };
  usuariosMock.push(nuevoUsuario);
  return Promise.resolve(nuevoUsuario);
}

export async function actualizarUsuario(id: string, datos: UsuarioUpdate): Promise<Usuario> {
  // TODO: PATCH /api/usuarios/:id
  const idx = usuariosMock.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado');

  const actualizado = { ...usuariosMock[idx], ...datos };
  usuariosMock[idx] = actualizado;
  return Promise.resolve(actualizado);
}

export async function eliminarUsuario(id: string): Promise<void> {
  // TODO: DELETE /api/usuarios/:id
  const idx = usuariosMock.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado');
  usuariosMock.splice(idx, 1);
  return Promise.resolve();
}
