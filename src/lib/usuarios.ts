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
    fechaRegistro: '2026-07-22',
    fechaVencimiento: '2026-08-22',
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
    fechaRegistro: '2026-07-21',
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
    fechaRegistro: '2026-07-20',
  },
  {
    id: '4',
    nombre: 'Juan García',
    email: 'juan@example.com',
    telefono: '+57 320 2222222',
    documento: '2222222222',
    genero: 'masculino',
    fechaNacimiento: '1992-03-10',
    rol: 'cliente',
    estado: 'activo',
    fechaRegistro: '2026-07-19',
    fechaVencimiento: '2026-08-19',
  },
  {
    id: '5',
    nombre: 'Ana Rosero',
    email: 'ana@example.com',
    telefono: '+57 320 3333333',
    documento: '3333333333',
    genero: 'femenino',
    fechaNacimiento: '1990-11-05',
    rol: 'cliente',
    estado: 'activo',
    fechaRegistro: '2026-06-15',
    fechaVencimiento: '2026-07-15',
  },
  {
    id: '6',
    nombre: 'Pedro Silva',
    email: 'pedro@example.com',
    telefono: '+57 320 4444444',
    documento: '4444444444',
    genero: 'masculino',
    fechaNacimiento: '1985-07-18',
    rol: 'cliente',
    estado: 'activo',
    fechaRegistro: '2026-06-20',
    fechaVencimiento: '2026-07-20',
  },
  {
    id: '7',
    nombre: 'Laura Fernández',
    email: 'laura@example.com',
    telefono: '+57 320 5555555',
    documento: '5555555555',
    genero: 'femenino',
    fechaNacimiento: '1998-02-28',
    rol: 'cliente',
    estado: 'activo',
    fechaRegistro: '2026-06-10',
    fechaVencimiento: '2026-07-10',
  },
  {
    id: '8',
    nombre: 'Roberto Díaz',
    email: 'roberto@example.com',
    telefono: '+57 320 6666666',
    documento: '6666666666',
    genero: 'masculino',
    fechaNacimiento: '1993-09-14',
    rol: 'cliente',
    estado: 'activo',
    fechaRegistro: '2026-05-25',
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

export async function obtenerUltimosIngresos(cantidad: number = 3): Promise<Usuario[]> {
  // TODO: GET /api/usuarios/recientes?limit=3
  return Promise.resolve(
    usuariosMock
      .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime())
      .slice(0, cantidad)
  );
}

export async function obtenerEstadisticasPorMes(): Promise<{ mes: string; count: number }[]> {
  // TODO: GET /api/usuarios/estadisticas/mes
  const estadisticas: { [key: string]: number } = {};

  usuariosMock.forEach((usuario) => {
    const fecha = new Date(usuario.fechaRegistro);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    estadisticas[mesKey] = (estadisticas[mesKey] || 0) + 1;
  });

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return Promise.resolve(
    Object.entries(estadisticas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, count]) => ({
        mes: meses[parseInt(mes.split('-')[1]) - 1],
        count,
      }))
  );
}
