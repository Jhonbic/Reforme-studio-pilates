/**
 * El teléfono y WhatsApp del estudio, en un solo sitio.
 *
 * Cambiado el 23 oct 2026 a petición del estudio (antes 320 9078814). Lo usan
 * el navbar, el pie, la portada y el área de cliente: si cambia otra vez, se
 * cambia solo aquí.
 */

/** Dígitos crudos, como los guarda la base. */
export const TELEFONO_ESTUDIO = "3132077686";

/** Para leer: «+57 313 2077686». */
export const TELEFONO_ESTUDIO_TEXTO = "+57 313 2077686";

/** Para `href="tel:…"`. */
export const TEL_ESTUDIO = `tel:+57${TELEFONO_ESTUDIO}`;

/** El chat del estudio, sin mensaje. Con mensaje: `enlaceWhatsApp()`. */
export const WHATSAPP_ESTUDIO = `https://wa.me/57${TELEFONO_ESTUDIO}`;
