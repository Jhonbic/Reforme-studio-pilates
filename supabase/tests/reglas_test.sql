-- =============================================================================
-- Reglas de la base: lo que protege los datos aunque alguien se salte la app.
--
-- Ejecutar con:  npx supabase test db      (local, con `supabase start`)
-- Lo ejecuta también la CI en cada push (.github/workflows/ci.yml).
--
-- Todo va en UNA transacción que se deshace al final: los datos de prueba no
-- quedan en la base. Las fechas son de 2031 para no chocar con la semilla.
-- Para hacerse pasar por alguien se cambia de rol y se fija el `sub` del JWT,
-- que es lo que lee `auth.uid()`.
-- =============================================================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

-- Fixtures -------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin-test@reforme.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente-con-plan@reforme.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'cliente-sin-plan@reforme.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'cuenta-sin-nada@reforme.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'instructora-test@reforme.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'otra-instructora@reforme.local');

insert into perfiles (id, nombre, rol)
  values ('00000000-0000-0000-0000-0000000000a1', 'Admin test', 'Administración');

insert into perfiles (id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000a2', 'Instructora test', 'Instructora'),
  ('00000000-0000-0000-0000-0000000000a3', 'Otra instructora', 'Instructora');

insert into equipo (id, nombre, correo, rol, cuenta_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'Instructora test', 'instructora-test@reforme.local', 'Instructora',
   '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000e2', 'Otra instructora', 'otra-instructora@reforme.local', 'Instructora',
   '00000000-0000-0000-0000-0000000000a3');

insert into clientes (id, nombre, identificacion, cuenta_id, acepta_terminos) values
  ('00000000-0000-0000-0000-0000000000d1', 'Cliente con plan', 'TEST001', '00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000d2', 'Cliente sin plan', 'TEST002', '00000000-0000-0000-0000-0000000000c2', true);

-- Plan propio: el test no depende de la semilla (en la CI la base está vacía).
-- Fusión con 1 de Reformer y 2 de Mat: pocas, para poder agotarlas.
insert into planes (id, nombre, precio, vigencia_dias, modalidad, clases_reformer, clases_mat)
  values ('00000000-0000-0000-0000-0000000000b1', 'Plan de test', 100000, 365, 'Fusión', 1, 2);
-- Sin decir las clases: el trigger las copia del plan.
insert into membresias (cliente_id, plan_id, inicio, vencimiento, importe)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1',
          '2031-01-01', '2031-12-31', 100000);

-- En local la base trae la agenda de ejemplo: las clases de hoy y mañana se
-- anulan (dentro de esta transacción) para que la clase de prueba «dentro de
-- una hora» no choque por sala con una de la semilla. En la CI no hay nada.
update clases set cancelada = true where fecha between current_date and current_date + 1;

-- Agenda: solapes de instructora -----------------------------------------------
select lives_ok(
  $$insert into clases (id, tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos)
    values ('00000000-0000-0000-0000-00000000aa01', 'Reformer', '2031-03-03', '07:00', 50,
            '00000000-0000-0000-0000-0000000000e1', 1)$$,
  'se programa una clase');

select lives_ok(
  $$insert into clases (tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos)
    values ('Reformer', '2031-03-03', '07:50', 50, '00000000-0000-0000-0000-0000000000e1', 8)$$,
  'encadenar 07:00–07:50 y 07:50–08:40 NO es solaparse');

select throws_ok(
  $$insert into clases (tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos)
    values ('Mat', '2031-03-03', '07:30', 30, '00000000-0000-0000-0000-0000000000e1', 8)$$,
  '23P01', null,
  'una instructora no puede tener dos clases a la vez');

select lives_ok(
  $$insert into clases (tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos, cancelada)
    values ('Mat', '2031-03-03', '07:30', 30, '00000000-0000-0000-0000-0000000000e1', 8, true)$$,
  'una clase cancelada deja libre su hueco');

-- Salas: una de Reformer y una de Mat, 8 personas cada una --------------------
select throws_ok(
  $$insert into clases (tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos)
    values ('Reformer', '2031-03-03', '07:20', 50, '00000000-0000-0000-0000-0000000000e2', 8)$$,
  '23P01', null,
  'dos clases no pueden ocupar la misma sala a la vez, aunque sean de instructoras distintas');

select lives_ok(
  $$insert into clases (tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos)
    values ('Mat', '2031-03-03', '07:00', 50, '00000000-0000-0000-0000-0000000000e2', 8)$$,
  'Reformer y Mat a la misma hora sí: son salas distintas');

select throws_ok(
  $$insert into clases (tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos)
    values ('Mat', '2031-03-10', '07:00', 50, '00000000-0000-0000-0000-0000000000e2', 9)$$,
  'P0001', 'En la sala de Mat caben 8 personas: no se pueden abrir 9 cupos.',
  'los cupos no pasan del aforo de la sala');

insert into clases (id, tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos, sala)
  values ('00000000-0000-0000-0000-00000000aa10', 'Mat', '2031-03-11', '07:00', 50,
          '00000000-0000-0000-0000-0000000000e2', 8, 'Reformer');
select is(
  (select sala from clases where id = '00000000-0000-0000-0000-00000000aa10'),
  'Mat',
  'una clase de Mat va siempre en la sala de Mat, se diga lo que se diga');

select throws_ok(
  $$insert into clases (tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos, sala)
    values ('Privada', '2031-03-03', '07:10', 30, '00000000-0000-0000-0000-0000000000e1', 1, 'Mat')$$,
  '23P01', null,
  'una privada ocupa la sala que se elija: en la de Mat choca con la clase de Mat');

-- Agenda: aforo ------------------------------------------------------------------
select lives_ok(
  $$insert into reservas (clase_id, cliente_id)
    values ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d2')$$,
  'se reserva el único cupo');

select throws_ok(
  $$insert into reservas (clase_id, cliente_id)
    values ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d1')$$,
  'P0001', 'La clase está llena: no quedan cupos.',
  'nunca más reservas que cupos');

select throws_ok(
  $$delete from clases where id = '00000000-0000-0000-0000-00000000aa01'$$,
  '23503', null,
  'una clase con reservas no se borra: se cancela');

select lives_ok(
  $$update clases set cupos = 2 where id = '00000000-0000-0000-0000-00000000aa01'$$,
  'subir el aforo se puede');
-- Con 1 reserva hecha, bajar a 0 lo frena el trigger antes que el CHECK.
select throws_ok(
  $$update clases set cupos = 0 where id = '00000000-0000-0000-0000-00000000aa01'$$,
  'P0001', 'Ya hay 1 reservas: el aforo no puede bajar de ahí.',
  'el aforo no baja por debajo de las reservas ya hechas');

-- Una clase futura con cupo, y otra que empieza dentro de una hora.
insert into clases (id, tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos) values
  ('00000000-0000-0000-0000-00000000aa02', 'Mat', '2031-03-04', '09:00', 55, '00000000-0000-0000-0000-0000000000e1', 8),
  ('00000000-0000-0000-0000-00000000aa03', 'Mat',
   (localtimestamp + interval '1 hour')::date,
   (localtimestamp + interval '1 hour')::time, 30, '00000000-0000-0000-0000-0000000000e1', 8);
insert into reservas (clase_id, cliente_id)
  values ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-0000000000d1');
-- Para agotar el saldo: más Mat, dos Reformer y una Privada, en días distintos.
insert into clases (id, tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos) values
  ('00000000-0000-0000-0000-00000000aa04', 'Mat',      '2031-03-05', '09:00', 55, '00000000-0000-0000-0000-0000000000e1', 8),
  ('00000000-0000-0000-0000-00000000aa05', 'Mat',      '2031-03-06', '09:00', 55, '00000000-0000-0000-0000-0000000000e1', 8),
  ('00000000-0000-0000-0000-00000000aa06', 'Reformer', '2031-03-07', '09:00', 50, '00000000-0000-0000-0000-0000000000e1', 8),
  ('00000000-0000-0000-0000-00000000aa07', 'Reformer', '2031-03-08', '09:00', 50, '00000000-0000-0000-0000-0000000000e1', 8),
  ('00000000-0000-0000-0000-00000000aa08', 'Privada',  '2031-03-09', '09:00', 50, '00000000-0000-0000-0000-0000000000e1', 1);

select is(
  (select clases_mat from membresias where cliente_id = '00000000-0000-0000-0000-0000000000d1'),
  2, 'una membresía insertada sin clases copia las del plan');

-- Permisos: sin sesión ------------------------------------------------------------
set local role anon;
select throws_ok(
  $$select count(*) from clientes$$,
  '42501', null,
  'sin sesión (clave pública) no se leen clientes');
select throws_ok(
  $$select * from agenda_cliente('2031-01-01', '2031-12-31')$$,
  '42501', null,
  'sin sesión no se llama a la agenda de cliente');
reset role;

-- Permisos: una cuenta sin perfil ni ficha (alguien que se registró por la API) --
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select is((select count(*)::int from clientes), 0,
  'registrarse por la API no da acceso a ningún cliente');
select throws_ok(
  $$select * from saldo_clases('00000000-0000-0000-0000-0000000000d1')$$,
  '42501', null,
  'una cuenta sin perfil ni ficha no ve el saldo de nadie');
reset role;

-- Permisos: Administración ---------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select ok((select count(*) from clientes) >= 2, 'Administración ve a los clientes');
select throws_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa02')$$,
  'P0001', 'Esta cuenta no es de un cliente.',
  'una cuenta del equipo no reserva como cliente');
reset role;

-- Permisos: un cliente ---------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from clientes), 1, 'un cliente solo ve SU ficha');
select is((select count(*)::int from equipo), 0, 'un cliente no ve el equipo (correos, teléfonos)');
select throws_ok(
  $$insert into reservas (clase_id, cliente_id)
    values ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000d1')$$,
  '42501', null,
  'un cliente no escribe en reservas directamente');
select lives_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa02')$$,
  'con plan vigente ese día, reserva');
select throws_ok(
  $$select cancelar_mi_reserva('00000000-0000-0000-0000-00000000aa03')$$,
  'P0001', null,
  'no se cancela a menos de 2 horas');

-- Clases por plan: reservar descuenta, sin saldo no se reserva.
select is(
  (select usadas_mat from saldo_clases('00000000-0000-0000-0000-0000000000d1')),
  1, 'reservar descuenta una clase de su modalidad');
select lives_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa04')$$,
  'segunda clase de Mat: quedaba una');
select throws_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa05')$$,
  'P0001', 'No quedan clases de Mat en el plan para ese día.',
  'sin saldo de esa modalidad no se reserva');
select lives_ok(
  $$select cancelar_mi_reserva('00000000-0000-0000-0000-00000000aa04')$$,
  'cancelar con tiempo se puede');
select lives_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa05')$$,
  'la clase cancelada a tiempo vuelve al saldo');
select lives_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa06')$$,
  'un plan Fusión también reserva Reformer, de su otra bolsa');
select throws_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa08')$$,
  'P0001', 'Las clases privadas se reservan en recepción.',
  'las privadas no se reservan desde la web');
select throws_ok(
  $$select * from saldo_clases('00000000-0000-0000-0000-0000000000d2')$$,
  '42501', null,
  'un cliente no ve el saldo de otro');
reset role;

-- Si el ESTUDIO cancela la clase, la clase vuelve al saldo.
update clases set cancelada = true where id = '00000000-0000-0000-0000-00000000aa06';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa07')$$,
  'una clase cancelada por el estudio no gasta la clase');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select throws_ok(
  $$select reservar_mi_clase('00000000-0000-0000-0000-00000000aa02')$$,
  'P0001', null,
  'sin plan que cubra el día de la clase, no reserva');
reset role;

-- Recepción tampoco reserva sin saldo; la venta copia las clases del plan.
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$insert into reservas (clase_id, cliente_id)
    values ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000d2')$$,
  'P0001', null,
  'recepción tampoco reserva a quien no tiene plan');
select lives_ok(
  $$select registrar_membresia('00000000-0000-0000-0000-0000000000d2',
                               '00000000-0000-0000-0000-0000000000b1', 'Efectivo')$$,
  'se vende un plan');
select is(
  (select clases_reformer || '+' || clases_mat from membresias
   where cliente_id = '00000000-0000-0000-0000-0000000000d2'),
  '1+2', 'la venta copia las clases del plan a la membresía');
reset role;

-- Asistencia -----------------------------------------------------------------------
-- Una clase YA PASADA de la instructora test, con una reserva de «Cliente con plan».
-- Sin sesión simulada (carga del sistema): si no, la regla de saldo la frenaría.
set local request.jwt.claims to '{}';
insert into clases (id, tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos) values
  ('00000000-0000-0000-0000-00000000aa09', 'Mat', '2020-01-06', '09:00', 55, '00000000-0000-0000-0000-0000000000e1', 8);
insert into reservas (id, clase_id, cliente_id) values
  ('00000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-00000000aa09', '00000000-0000-0000-0000-0000000000d1');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$select marcar_asistencia('00000000-0000-0000-0000-0000000000ab', 'Asistió')$$,
  '42501', null, 'un cliente no marca su propia asistencia');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select throws_ok(
  $$select marcar_asistencia('00000000-0000-0000-0000-0000000000ab', 'Asistió')$$,
  '42501', null, 'otra instructora no marca una clase que no es suya');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$select marcar_asistencia('00000000-0000-0000-0000-0000000000ab', 'Asistió')$$,
  'la instructora de la clase marca la asistencia');
reset role;

select ok(
  (select ultima_asistencia >= '2020-01-06' from clientes where id = '00000000-0000-0000-0000-0000000000d1'),
  '«Asistió» actualiza la última asistencia del cliente');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$select marcar_asistencia(
      (select id from reservas where clase_id = '00000000-0000-0000-0000-00000000aa02'
                                 and cliente_id = '00000000-0000-0000-0000-0000000000d1'),
      'Asistió')$$,
  'P0001', 'La clase todavía no ha empezado.',
  'no se marca la asistencia de una clase que no ha empezado');
select lives_ok(
  $$select marcar_asistencia('00000000-0000-0000-0000-0000000000ab', 'No vino')$$,
  'recepción o administración corrigen una marca');
reset role;

-- Agenda automática: el horario manda ------------------------------------------
-- Se despeja lo de hoy en adelante (en local la semilla tiene agenda) y la
-- agenda se fija hasta dentro de 13 días. La franja de prueba: mañana, 07:00,
-- sala de Reformer → dentro de la ventana caen mañana y dentro de 8 días.
set local request.jwt.claims to '{}';
update horario_semanal set activa = false, instructora_id = null;
delete from reservas where clase_id in (select id from clases where fecha >= current_date);
delete from clases where fecha >= current_date;
update ajustes set agenda_generada_hasta = current_date + 13;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
update horario_semanal set activa = true, instructora_id = '00000000-0000-0000-0000-0000000000e1'
  where dia = extract(isodow from current_date + 1) and hora_inicio = '07:00' and sala = 'Reformer';
select is(
  (select count(*)::int from clases c join horario_semanal h on h.id = c.franja_id
    where h.dia = extract(isodow from current_date + 1) and h.hora_inicio = '07:00' and h.sala = 'Reformer'),
  2, 'encender una franja crea sus clases hasta donde llega la agenda');

update horario_semanal set instructora_id = '00000000-0000-0000-0000-0000000000e2'
  where dia = extract(isodow from current_date + 1) and hora_inicio = '07:00' and sala = 'Reformer';
select is(
  (select count(*)::int from clases where franja_id is not null and instructora_id = '00000000-0000-0000-0000-0000000000e2'),
  2, 'cambiar la instructora de la franja la cambia en sus próximas clases');
reset role;

-- Alguien reserva la de mañana; luego se apaga la franja.
set local request.jwt.claims to '{}';
insert into reservas (clase_id, cliente_id)
  select id, '00000000-0000-0000-0000-0000000000d2' from clases
  where franja_id is not null and fecha = current_date + 1;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
update horario_semanal set activa = false
  where dia = extract(isodow from current_date + 1) and hora_inicio = '07:00' and sala = 'Reformer';
select results_eq(
  $$select fecha from clases where franja_id is not null$$,
  $$values (current_date + 1)$$,
  'apagar la franja borra las clases que nadie reservó y deja la reservada');

update horario_semanal set activa = true
  where dia = extract(isodow from current_date + 1) and hora_inicio = '07:00' and sala = 'Reformer';
select is(
  (select count(*)::int from clases where franja_id is not null), 2,
  'volver a encenderla no duplica la que se quedó');

delete from clases where franja_id is not null and fecha = current_date + 8;
select extender_agenda();
-- Rellenar solo añade lo NUEVO (de 14 días en adelante): lo ya generado no se
-- toca, y por eso la del día 8, borrada a mano, no vuelve.
select is(
  (select count(*)::int from clases where franja_id is not null and fecha <= current_date + 13), 1,
  'una clase borrada a mano no vuelve al rellenar la agenda');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$select extender_agenda()$$,
  '42501', null,
  'un cliente no rellena la agenda');
reset role;

select * from finish();
rollback;
