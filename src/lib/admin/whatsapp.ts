import { diaLargo, diasEntre } from "./horario";

/**
 * Enlaces de WhatsApp con el mensaje ya escrito, para las listas de trabajo del
 * dashboard (estructura de JainSportBox: «Recordar» y «Felicitar»).
 *
 * El mensaje sale escrito pero NO se envía solo: se abre WhatsApp con el
 * texto y quien atiende lo revisa y pulsa enviar. Así no hace falta ninguna
 * API de pago ni un número verificado, y nadie recibe un mensaje que nadie
 * leyó antes.
 */

/**
 * `null` si el teléfono no es un móvil colombiano completo.
 *
 * ⚠️ Se pregunta por el ENLACE y no por si hay teléfono: un número a medias
 * daría un botón que lleva a un error de WhatsApp («este número no está en
 * WhatsApp»), que es peor que no tener botón.
 */
export function enlaceWhatsApp(telefono: string | null, texto: string): string | null {
  if (!telefono || !/^3\d{9}$/.test(telefono)) return null;
  return `https://wa.me/57${telefono}?text=${encodeURIComponent(texto)}`;
}

/** «Laura» de «Laura Gutiérrez Rojas»: un mensaje con el nombre completo suena
 *  a banco, no a estudio. */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** «hoy», «mañana» o «el viernes, 9 de octubre». */
export function cuandoVence(vencimiento: string, hoy: string): string {
  const d = diasEntre(hoy, vencimiento);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  return `el ${diaLargo(vencimiento)}`;
}

export function mensajeRecordatorio(
  nombre: string,
  plan: string,
  vencimiento: string,
  hoy: string,
): string {
  const delPlan = plan ? `tu plan ${plan}` : "tu plan";
  return (
    `Hola, ${primerNombre(nombre)}. Te escribimos de Reforme Studio Pilates: ` +
    `${delPlan} vence ${cuandoVence(vencimiento, hoy)}. ` +
    `¿Quieres que te lo renovemos para que no pierdas tus clases?`
  );
}

export function mensajeCumpleanos(nombre: string): string {
  return (
    `¡Feliz cumpleaños, ${primerNombre(nombre)}! ` +
    `Todo el equipo de Reforme Studio Pilates te desea un año lleno de ` +
    `movimiento con propósito.`
  );
}

/** Recordar lo que falta por pagar de un plan, sin sonar a cobro de banco. */
export function mensajePendiente(nombre: string, plan: string, pendiente: string): string {
  return (
    `Hola, ${primerNombre(nombre)}. Te escribimos de Reforme Studio Pilates: ` +
    `de tu plan ${plan} quedan pendientes ${pendiente}. ` +
    `Cuando quieras, lo puedes pagar en recepción o por Nequi o Daviplata. ¡Gracias!`
  );
}
