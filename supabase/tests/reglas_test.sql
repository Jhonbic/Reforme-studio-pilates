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
select plan(33);

-- Fixtures -------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin-test@reforme.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente-con-plan@reforme.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'cliente-sin-plan@reforme.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'cuenta-sin-nada@reforme.local');

insert into perfiles (id, nombre, rol)
  values ('00000000-0000-0000-0000-0000000000a1', 'Admin test', 'Administración');

insert into equipo (id, nombre, correo, rol) values
  ('00000000-0000-0000-0000-0000000000e1', 'Instructora test', 'instructora-test@reforme.local', 'Instructora');

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
  ('00000000-0000-0000-0000-00000000aa02', 'Mat', '2031-03-04', '09:00', 55, '00000000-0000-0000-0000-0000000000e1', 10),
  ('00000000-0000-0000-0000-00000000aa03', 'Mat',
   (localtimestamp + interval '1 hour')::date,
   (localtimestamp + interval '1 hour')::time, 30, '00000000-0000-0000-0000-0000000000e1', 10);
insert into reservas (clase_id, cliente_id)
  values ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-0000000000d1');
-- Para agotar el saldo: más Mat, dos Reformer y una Privada, en días distintos.
insert into clases (id, tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos) values
  ('00000000-0000-0000-0000-00000000aa04', 'Mat',      '2031-03-05', '09:00', 55, '00000000-0000-0000-0000-0000000000e1', 10),
  ('00000000-0000-0000-0000-00000000aa05', 'Mat',      '2031-03-06', '09:00', 55, '00000000-0000-0000-0000-0000000000e1', 10),
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

select * from finish();
rollback;
