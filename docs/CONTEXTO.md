# Reforme Studio Pilates — Contexto del proyecto

> Documento de contexto versionado. Objetivo: que cualquier persona (o agente) que
> abra el repo entienda qué es el proyecto, la marca y en qué estado está,
> **sin depender de memoria externa**.

## 1. Qué es

Web para el centro de pilates **Reforme Studio Pilates**, en **Florencia, Caquetá
(Colombia)**. El encargo es construirles la web.

**Requisito clave (no negociable):** la web debe **destacar por su UX y UI**,
transmitiendo un servicio y sensaciones **premium**, acordes a un estudio de pilates
de alta gama. Cada decisión de diseño e interacción debe reforzar esa percepción.

El estudio se trata como **YA ABIERTO**. La web es el punto de entrada donde los
usuarios encuentran el estudio y **reservan clases**. (Se eliminó el contador de
cuenta atrás a la apertura y toda referencia a "próxima apertura".)

CTA principal: **"Reservar mi clase"** → `/registro`.

## 2. Marca

**Paleta de color (HEX):**

| Uso | Color | HEX | RGB |
|-----|-------|-----|-----|
| Principal / marca | Verde selvático | `#284435` | 40, 68, 53 |
| Acento | Dorado / arena | `#BE9B69` | 190, 155, 105 |
| Secundario | Beige claro | `#E8E1D9` | 232, 225, 217 |
| Fondo | Blanco cálido | `#F7F6F3` | 247, 246, 243 |

> La página de tipografía de marca cita un dorado `#C69C6C` para textos, pero el
> acento principal es `#BE9B69`. La paleta evoca **equilibrio, fluidez y movimiento**.

**Tipografía:**
- Títulos: **Cormorant** (serif elegante, atemporal; regular + italic).
- Cuerpo: **Lato** (sans-serif).

**Identidad:**
- Logo/isotipo: figura estilizada tipo persona + ola/montaña. Conceptos:
  "Movimiento" y "Propósito". Versiones sobre verde, beige, dorado; icono blanco
  solo sobre fondo oscuro.
- Slogan: **"Movimiento con Propósito"**.
- Pilares: Personalizado · Alta Calidad · Bienestar Integral.

**Contacto / ubicación:**
- Dirección: Carrera 1 #27-50, Multiplaza Chaira, Florencia.
- Teléfono/WhatsApp: +57 320 9078814.
- Redes (handle `reformestudiopilates`): Instagram, Facebook, TikTok, WhatsApp.
- Web de referencia actual: https://reformestudiopilates.com/

## 3. Stack

- **Next.js 16 (App Router)** + **React 19** + **Tailwind CSS v4**.
- TypeScript, estructura con `src/`.
- ⚠️ Esta versión de Next tiene breaking changes respecto al conocimiento previo:
  consultar `node_modules/next/dist/docs/` antes de escribir código (ver `AGENTS.md`).
- Dependencia añadida para efectos: **lenis** (smooth scroll).
- `package.json` name = `reforme-studio-pilates` (carpeta con espacios/mayúsculas).
  Hay otro `package-lock.json` en el home del usuario → fijado `turbopack.root` en
  `next.config.ts` (con `path.resolve(__dirname)`, ruta relativa: funciona igual
  en el Linux de Vercel).

### Despliegue

- Repo: `github.com/Jhonbic/Reforme-studio-pilates`, rama **`main`**.
- Hospedaje: **Vercel** (plan Hobby). Push a `main` → redespliegue automático.
- ⚠️ **Usar siempre la URL de producción:** https://reforme-studio-pilates.vercel.app
  Las otras dos (`…-git-main-…` y la del hash) están tras la *Deployment
  Protection* de Vercel y **piden iniciar sesión** — en el móvil no hay sesión, así
  que parecen rotas. Se desactivaría en Settings → Deployment Protection.
- El sitio es 100 % estático (todas las rutas salen `○ Static` en el build), por eso
  no hace falta un contenedor tipo Railway.
- Para ver en el móvil sin desplegar: `npx next dev -H 0.0.0.0` y abrir
  `http://<IP-del-PC>:3000`.

## 4. Sistema de diseño

En [`src/app/globals.css`](../src/app/globals.css) vía `@theme`:
- Colores: `verde/dorado/beige/arena` (+ escalas `verde-900/700/500/300`,
  `dorado-dark/light`).
- Fuentes con `next/font`: Cormorant → `--font-cormorant` / `font-display` /
  `font-serif`; Lato → `font-sans`.
- Utilidades: `.eyebrow`, `.rule-gold`, `.brand-gradient`, animaciones `rise`/`fade`,
  `.logo-float` (flotación del logo del hero), sombras `soft`/`lift`, y CSS de
  sheen/ripple/grano.
- **Colores de datos** (solo panel admin): `--color-chart-1..4` y
  `--color-estado-ok/aviso/grave`. **No son los de marca** y no se mezclan con
  ellos — el porqué está en §6, Panel administrativo.

## 5. Componentes

En `src/components/`:
- `Logo.tsx` — isotipo SVG **recreado a mano**, no el oficial. Lo usan Navbar,
  Footer y AuthShell. El logo oficial (`public/logo-reforme.png`) solo está en el
  hero → los dos conviven y **se nota la diferencia de trazo**. Pendiente unificar.
- `Navbar.tsx` — transparente sobre el hero → sólido al hacer scroll. **Menú móvil = drawer
  del 82% que entra desde la derecha** (elegido por el usuario), con scrim oscurecido, ✕ de
  cierre explícita, fondo arena claro, enlaces Cormorant y pie con redes + teléfono. Cierra
  con ✕, scrim, `Escape` o al pasar a escritorio.
  ⚠️ **Gotcha resuelto:** el scrim y el drawer van como **hermanos del `<header>`** (fragmento
  `<>…</>`), NO dentro de él. El header usa `backdrop-blur` al scrollear, y un `backdrop-filter`
  convierte al ancestro en bloque contenedor de sus hijos `fixed` → si están dentro, el drawer
  se encoge/rompe al abrir con la página scrolleada. Mantener fuera.
- `Footer.tsx` — 2 columnas (marca + Visítanos) con las redes reales en círculos de
  56px. Se eliminó la columna "Explora": duplicaba la navegación del navbar.
- `Reveal.tsx` — scroll reveal con prop `direction`.
- `Parallax.tsx`.
- `SectionWave.tsx` — ondas orgánicas entre secciones (usa `fill-*`).
- `ui/Button.tsx` — sheen + ripple (componente cliente).
- `auth/AuthShell.tsx`, `auth/TextField.tsx`.
- `icons/PilarIcons.tsx` — iconos line-art de los 3 pilares (persona · calendario ·
  corazón), mismos conceptos que la web anterior, trazo alineado con el isotipo.

**Panel administrativo** en `src/components/admin/` — ver §6:
- **Sistema de tarjetas:** `Card.tsx` (tonos `claro` / `oscuro` / `acento`,
  densidad `normal` / `compacta`), `CardHeader.tsx` (emite `<h2>`) y
  `TablaDeDatos.tsx` (el `<details>` con los datos en tabla). Antes ese puñado de
  clases estaba copiado a mano en cinco sitios. `ChartCard.tsx` se monta sobre
  ellos y **conserva su API pública**; re-exporta el tipo `TablaDatos`, que se
  mudó a `TablaDeDatos.tsx`.
- `secciones.tsx` — las 4 secciones del panel con sus iconos, en un solo sitio.
  Sin `"use client"` (SVG puro), así lo consumen igual `AdminNav` (cliente) y
  `AdminTopbar`.
- `AdminNav.tsx` (cliente, estado activo por `usePathname`), `AdminTopbar.tsx`
  (cliente, titula la página desde la ruta), `StatTile.tsx`,
  `TarjetaIngresos.tsx` (la tarjeta héroe), `SeccionPendiente.tsx`.
- `admin/charts/`: `LineChart.tsx`, `GroupedBars.tsx`, `Donut.tsx` (clientes) y
  `HBars.tsx` (servidor: sin interacción, los valores ya van escritos).
  ⚠️ **Gotcha resuelto:** `LineChart` y `GroupedBars` dibujan en **píxeles
  reales** (miden el contenedor con `ResizeObserver`, alto fijo por tramo de
  ancho, fuente de 11px). Con el `viewBox` fijo + `w-full` que tenían antes, el
  SVG se estiraba con el contenedor: en una tarjeta a ancho completo el factor
  era ×3.9 → el alto se iba a ~740px y las etiquetas salían a 31px. **No volver
  a `w-full` sobre un lienzo de tamaño fijo.**

**Efectos premium** en `src/components/fx/`:
- `SmoothScroll.tsx` — Lenis (inercia + intercepta anclas, offset -80 por navbar).
- `HeroFX.tsx` — canvas único: motas doradas + burbujas que siguen el cursor +
  ondas "goteo" al clic.
- `Magnetic.tsx` — botones que se imantan al cursor (solo `pointer:fine`).
- Grano/textura global vía `.grain-overlay` (SVG feTurbulence) en el layout.

> **Todos los efectos respetan `prefers-reduced-motion`.** Mantener este principio
> en cualquier interacción nueva: lo premium nunca debe sacrificar accesibilidad.

## 6. Páginas

- Landing [`src/app/page.tsx`](../src/app/page.tsx): hero + El estudio +
  Experiencia (3 pilares) + CTA membresía + Ubicación (mapa embed).
  - **Hero:** logo oficial + eyebrow + titular + párrafo + 2 CTAs, y nada más. Se
    quitaron los highlights (Grupos reducidos · Reformer premium · Acompañamiento
    personalizado) porque **repetían los 3 pilares** de más abajo y saturaban el
    móvil. No reintroducir texto aquí sin quitar otro.
  - **Logo en el hero:** `public/logo-reforme.png` (el oficial, descargado de
    reformestudiopilates.com y recortado a su caja opaca → 554×328). El PNG viene
    con el trazo en verde sobre fondo transparente, así que se pinta en blanco con
    `filter: brightness(0) invert(1)` — igual que hace su web.
    ⚠️ **Gotcha:** ese filtro va **inline**, no con utilidades Tailwind: `filter` es
    una sola propiedad CSS y `brightness-0 invert` no se combinaba con el
    `drop-shadow-[...]` arbitrario → el logo salía verde sobre verde, invisible.
    Móvil: centrado encabezando el
    hero. Escritorio (`lg`): columna derecha, texto a la izquierda. Flota suave con
    `.logo-float`.
  - Se eliminaron del hero los isotipos de marca de agua (`Parallax` + `Isotype`):
    con el logo real en primer plano sobraban.
  - **3 pilares:** icono en círculo dorado (ver `icons/PilarIcons.tsx`), sin
    numeración.
- `/login` y `/registro`: **solo UI**, sin backend (muestran confirmación
  simulada). Comparten [`auth/AuthShell.tsx`](../src/components/auth/AuthShell.tsx).
  - **`/registro` valida en cliente** (nombre, email, contraseña ≥8, confirmación,
    términos). **`/login` no valida nada**: solo mira el correo para repartir por
    rol (ver Panel administrativo).
  - Login **sin** "Continuar con Google" (se quitó; la auth real es fase 2 aún sin definir).
  - `AuthShell` lleva los **detalles premium del inicio**: `HeroFX` (estela dorada) en el panel
    de marca, y en **móvil** una banda de marca verde superior (profundidad radial + HeroFX +
    logo + titular serif) con `SectionWave` que funde hacia el formulario. Mobile-first.

### Panel administrativo (`/admin`)

Fase 3 arrancada. **Solo UI con datos de ejemplo**, sin backend.

- Secciones: **Dashboard** (construido), **Usuarios**, **Planes**, **Finanzas**
  (marcadores con lo previsto en cada una, para que la navegación no dé 404).
- `app/admin/layout.tsx` — armazón propio: barra lateral verde en escritorio,
  cabecera fija + pastillas con scroll horizontal en móvil. **No usa el Navbar ni
  el Footer públicos**: son dos productos distintos, y aquí los efectos
  (grano, parallax, smooth scroll) estorbarían.
  - La lateral es `lg:sticky lg:top-0 lg:h-[100svh]`. ⚠️ El **alto explícito no
    es opcional**: como hijo flex, el `stretch` por defecto la haría tan alta como
    toda la página y `sticky` no tendría recorrido por el que pegarse — se quedaba
    quieta y desaparecía al bajar.
  - La columna de contenido lleva **`min-w-0`**. ⚠️ Tampoco es cosmético: un hijo
    flex tiene `min-width: auto` y no se encoge por debajo de su contenido, así
    que una rejilla ancha la desbordaría y el `ResizeObserver` de los gráficos
    mediría un ancho inflado → volvería el bug del estiramiento.
  - `AdminTopbar` titula cada página **desde la ruta**, leyendo el mismo listado
    (`components/admin/secciones.tsx`) que pinta la navegación: así el menú y el
    título no se pueden desincronizar. Por eso `SeccionPendiente` ya no lleva
    `titulo` — salían dos encabezados iguales, uno encima de otro.
- **Acceso por rol desde el `/login` existente** (decisión del usuario, frente a
  un `/admin/login` aparte). Provisional: el rol se deduce del dominio del correo
  (`@reforme.com`) porque no hay auth. ⚠️ **El panel NO está protegido** hasta que
  haya autenticación real.

**Capa de datos — `src/lib/admin/`:**
- `types.ts` — tipos de dominio (importes en COP enteros, sin centavos).
- `mock.ts` — datos de ejemplo. **El único archivo a sustituir** cuando haya BD.
- `queries.ts` — la UI llama SIEMPRE aquí, nunca a `mock.ts`. Al conectar la BD
  estas funciones pasan a `async` y las pantallas no se tocan.
- `format.ts` — moneda COP con locale fijo `es-CO` (si se dejara al navegador, el
  HTML del servidor y el del cliente no coincidirían → error de hidratación).

**Gráficos — SVG propio, sin dependencias** (`components/admin/charts/`):
`LineChart` (cruceta + tooltip), `GroupedBars`, `Donut`, `HBars`.
- ⚠️ **Gotcha:** los gráficos son componentes de cliente y las páginas de
  servidor. React **no deja pasar funciones** por esa frontera → no se les pasa un
  formateador, sino el **nombre** del formato (`FormatoValor`) y lo resuelven
  dentro. Mismo motivo por el que `Donut` no acumula ángulos en una variable
  externa (mutar durante el render lo marca el lint de React).
- Cada gráfico va dentro de `ChartCard`, que incluye **tabla de datos** en un
  `<details>`. No es opcional: ver la nota de contraste abajo.

**Organización del dashboard — rejilla bento.** Se reorganizó a partir de una
referencia que trajo el usuario, adaptando **solo la organización**: jerarquía por
tamaño y contraste en vez de por títulos de sección. Se usan **únicamente los
módulos que ya existían** — nada de buscador, campana, avatar, feed de actividad ni
agenda: no hay datos para eso y no se inventan.
- Rejilla única `grid-cols-1 md:grid-cols-6 xl:grid-cols-12`. ⚠️ **12 columnas
  solo en `xl`, saltándose `lg` a propósito:** en `lg` ya está la lateral de 256px
  y al contenido le quedan ~700px — el tramo más estrecho de todo el escritorio.
  Doce columnas ahí darían tarjetas de 55px, así que `lg` hereda el reparto de `md`.
- Se **fusionaron** la stat tile "Ingresos del mes" y la tarjeta "Ingresos por mes":
  contaban el mismo dato dos veces con el mismo peso. Ahora son `TarjetaIngresos`,
  la tarjeta héroe oscura.
- **Dos tarjetas oscuras** (héroe y tasa de renovación) parten el bloque de blancas.
  Es lo que da ritmo; con todo blanco, todo pesa igual.
- **Fuera los cuatro `<h2>` de sección** y el `<header>` de la página (~380px de
  scroll). El `<h1>` visible lo pone la topbar; en `page.tsx` queda uno `sr-only`
  para no dejar huérfano el árbol de encabezados, y `CardHeader` emite `<h2>`.
- Ancho a `max-w-[1440px]` (antes `max-w-6xl`). Solo es seguro **porque** los
  gráficos ya no se estiran.
- **No usar `grid-flow-dense`:** reordena visualmente sin reordenar el DOM y rompe
  el orden de tabulación.

**⚠️ Paleta de gráficos ≠ paleta de marca.** El verde `#284435` y el dorado
`#BE9B69` **fallan** como colores de datos (validado con el verificador de
accesibilidad): son tan apagados que se leen como gris y no se distinguen entre sí
en daltonismo. Los colores de datos viven en `globals.css` como
`--color-chart-1..4` (`#31875C`, `#C68F28`, `#C24A24`, `#8B4A8F`) y pasan las seis
comprobaciones sobre fondo arena. Restricciones que arrastran:
- **máximo 4 series** por gráfico (una 5ª se agrupa en "Otros", no se inventa color);
- el dorado queda en 2.64:1 → **siempre etiqueta visible + tabla de datos**;
- se asignan **en orden fijo**, nunca cíclico;
- `--color-estado-*` (ok/aviso/grave) están **reservados** y no se usan como serie.

**Matiz para las tarjetas oscuras.** Todo lo anterior se midió sobre **fondo arena**
y como colores para **distinguir series entre sí**. Sobre `verde-900` y con **una
sola serie** no se cumple ninguna de las dos cosas: no hay pares que separar, así
que el color no codifica categoría — solo tiene que verse. Ahí sí vale el dorado de
marca: `dorado-light` da **7.79:1** sobre verde-900, frente a los **3.21:1** del
`chart-1`, que además es verde sobre verde. La tabla de datos se sigue exigiendo.
Implementado en la constante `PALETA` de `charts/LineChart.tsx` (prop `tono`), que
**solo cambia colores, nunca la geometría**. Los estados tienen su par claro para
fondo oscuro: `--color-estado-ok-claro` / `--color-estado-grave-claro`.

Build y lint verificados: `/`, `/login`, `/registro`, `/admin`, `/admin/usuarios`,
`/admin/planes`, `/admin/finanzas` — las 7 siguen saliendo `○ Static`.

## Mobile-first (dispositivo principal de los usuarios)

El móvil es el dispositivo principal → cada cambio se valida primero en móvil.
Convenciones ya aplicadas: alturas de hero con `min-h-[100svh]` (no `100vh`, evita el salto
por la barra del navegador); objetivos táctiles ≥ 44px; CTAs a ancho completo en móvil;
todos los efectos respetan `prefers-reduced-motion`.

**Todo el contenido va CENTRADO en móvil** y pasa a alineación izquierda solo cuando la
sección abre a varias columnas (patrón `text-center <bp>:text-left`, con
`mx-auto <bp>:mx-0` en los bloques con `max-w-*` y `items-center <bp>:items-start` en los
flex). Breakpoint por sección: hero `sm`, tarjetas de pilares y footer `md`, resto `lg`.
Excepción deliberada: las **etiquetas y campos de formulario siguen alineados a la
izquierda** (legibilidad); solo se centra su encabezado.

## 7. Fases del proyecto

- **Fase 1 (hecha, jul 2026):** landing + UI de login/registro, sin backend.
- **Fase 2 (pendiente):** auth real (p. ej. Supabase), imágenes reales del estudio.
- **Fase 3 (en curso):** panel administrativo. Dashboard hecho con datos de
  ejemplo; faltan Usuarios, Planes y Finanzas.

> Ojo al orden: la fase 3 **se adelantó a la 2**. Se está maquetando el panel
> antes de que exista backend ni autenticación, a propósito, para decidir el
> diseño con algo delante. Consecuencia directa: **`/admin` está abierto a
> cualquiera** y todos sus datos son inventados.

**Bloques del dashboard descartados a propósito:** se valoró incluir **ocupación
de clases** (mapa de calor día × hora, no-shows, ocupación por instructora) y se
dejó fuera de esta primera versión. Es el siguiente en valor cuando se quiera
pasar de "¿cómo vamos de plata?" a "¿qué horarios abrimos o cerramos?".

## 8. Pendientes inmediatos

**Bloqueantes / de riesgo**
- [ ] **Proteger `/admin`.** Hoy entra cualquiera escribiendo la URL, y el reparto
      por rol del login (dominio `@reforme.com`) **no es seguridad**, es un
      marcador. No desplegar el panel de cara al público hasta resolverlo.
- [ ] Conectar auth real (fase 2). El login ya no ofrece Google; decidir proveedor.

**Panel administrativo**
- [ ] **Mirar la rejilla bento renderizada** a 375 / 768 / 1280 / 1920. Compila y
      pasa lint, pero la reorganización **no se ha validado a ojo**. Qué mirar:
      que no haya scroll horizontal a 1920 (prueba del `min-w-0`), que las alturas
      de los gráficos sigan siendo 200/240/280 al redimensionar (que no vuelva el
      estiramiento), la legibilidad del `<details>` en las tarjetas oscuras, y que
      a 375px la columna única cuente la historia en orden.
- [ ] Construir Usuarios, Planes y Finanzas (hoy son marcadores).
- [ ] Sustituir `src/lib/admin/mock.ts` por datos reales cuando haya BD.

**Marca e imagen**
- [x] Logo oficial en el hero (`public/logo-reforme.png`).
- [ ] Unificar el logo: Navbar, Footer y AuthShell siguen con el isotipo recreado
      (`Logo.tsx`), visiblemente distinto del oficial. Conseguir un **SVG** oficial
      (el que hay es PNG) + favicon real.
- [ ] Imágenes reales del estudio.

**Validación**
- [ ] Validar en dispositivo real el drawer móvil y las páginas de auth (capturas pendientes).
