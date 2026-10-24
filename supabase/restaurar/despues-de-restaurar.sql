-- =============================================================================
-- Lo que el volcado NO trae y hay que crear después de restaurar una copia.
-- Ver docs/RESPALDOS.md.
--
-- `supabase db dump` solo vuelca el esquema `public`; estas dos piezas viven
-- fuera de él y, sin ellas, la web parece funcionar pero:
--   · sin el cron, la agenda deja de rellenarse sola cada noche;
--   · sin las reglas del bucket, nadie puede subir ni ver comprobantes.
-- Verificado el 24 oct 2026 restaurando una copia de producción en local: era
-- exactamente lo que faltaba al comparar con producción.
--
-- Se puede ejecutar más de una vez sin duplicar nada.
-- =============================================================================

-- Tarea diaria de la agenda (03:00 en Colombia). Igual que en la migración
-- 20261010120000_agenda_automatica.
select cron.unschedule(jobid) from cron.job where jobname = 'extender-agenda';
select cron.schedule('extender-agenda', '0 8 * * *', $$select public.extender_agenda_interna()$$);

-- Reglas del bucket privado de comprobantes. Igual que en la migración
-- 20260727120100_rls.
drop policy if exists "comprobantes: solo Administración lee" on storage.objects;
create policy "comprobantes: solo Administración lee"
  on storage.objects for select
  using (bucket_id = 'comprobantes' and public.es_admin());

drop policy if exists "comprobantes: solo Administración sube" on storage.objects;
create policy "comprobantes: solo Administración sube"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes' and public.es_admin());
