export type RolUsuario = 'admin' | 'instructor' | 'cliente' | 'pendiente';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  documento?: string;
  genero?: 'masculino' | 'femenino' | 'otro';
  fechaNacimiento?: string;
  rol: RolUsuario;
  estado: 'activo' | 'inactivo' | 'suspendido';
  fechaRegistro: string;
  fechaVencimiento?: string;
  foto?: string;
  notas?: string;
}

export interface UsuarioCreate {
  nombre: string;
  email: string;
  telefono: string;
  documento?: string;
  genero?: 'masculino' | 'femenino' | 'otro';
  fechaNacimiento?: string;
  rol: RolUsuario;
}

export interface UsuarioUpdate extends Partial<UsuarioCreate> {
  id: string;
  estado?: 'activo' | 'inactivo' | 'suspendido';
}
