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
  `next.config.ts`.

## 4. Sistema de diseño

En [`src/app/globals.css`](../src/app/globals.css) vía `@theme`:
- Colores: `verde/dorado/beige/arena` (+ escalas `verde-900/700/500/300`,
  `dorado-dark/light`).
- Fuentes con `next/font`: Cormorant → `--font-cormorant` / `font-display` /
  `font-serif`; Lato → `font-sans`.
- Utilidades: `.eyebrow`, `.rule-gold`, `.brand-gradient`, animaciones `rise`/`fade`,
  sombras `soft`/`lift`, y CSS de sheen/ripple/grano.

## 5. Componentes

En `src/components/`:
- `Logo.tsx` — isotipo SVG recreado. **PENDIENTE: sustituir por SVG oficial.**
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

**Efectos premium** en `src/components/fx/`:
- `SmoothScroll.tsx` — Lenis (inercia + intercepta anclas, offset -80 por navbar).
- `ScrollProgress.tsx` — barra dorada superior.
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
- `/login` y `/registro`: **solo UI**, validación en cliente, sin backend (muestran
  confirmación simulada). Comparten [`auth/AuthShell.tsx`](../src/components/auth/AuthShell.tsx).
  - Login **sin** "Continuar con Google" (se quitó; la auth real es fase 2 aún sin definir).
  - `AuthShell` lleva los **detalles premium del inicio**: `HeroFX` (estela dorada) en el panel
    de marca, y en **móvil** una banda de marca verde superior (profundidad radial + HeroFX +
    logo + titular serif) con `SectionWave` que funde hacia el formulario. Mobile-first.

Build y dev verificados: rutas `/`, `/login`, `/registro` → 200.

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

## 7. Panel Administrativo

En `/admin` (ruta protegida en fase 2). Incluye:

- **Dashboard** (`/admin`): Estadísticas (usuarios totales, clientes activos, instructores, pendientes), actividad reciente.
- **Gestión de usuarios** (`/admin/usuarios`): Listado, crear, editar, eliminar. Mock data en `src/lib/usuarios.ts`.
- **Estructura**: Navbar lateral (verde selvático) con menú contextual. Componentes en `src/components/admin/`.
- **Diseño**: Mantiene paleta premium, tipografía Cormorant/Lato, efectos suaves, mobile-first.

Ver [`docs/ADMIN_PANEL.md`](./ADMIN_PANEL.md) para detalles de implementación.

## 8. Fases del proyecto

- **Fase 1 (landing, jul 2026):** landing + UI de login/registro, sin backend. ✅
- **Fase 1.5 (admin, jul 2026):** panel administrativo (usuarios), mock data. ✅
- **Fase 2 (siguiente):** auth real (Supabase u otro), backend para admin, imágenes reales.
- **Fase 3:** módulos de clases, planes, reportes analíticos.

## 9. Pendientes inmediatos

- [x] Logo oficial en el hero (`public/logo-reforme.png`).
- [x] Panel administrativo fase 1 (usuarios) con mock data.
- [ ] Navbar, Footer y AuthShell **siguen usando el isotipo recreado**
      (`Logo.tsx`). Sustituirlo por el oficial (idealmente un SVG, el que hay es
      PNG) + favicon real.
- [ ] Imágenes reales del estudio.
- [ ] Conectar auth real (fase 2). El login ya no ofrece Google; decidir proveedor real.
- [ ] Backend para admin (endpoints `/api/usuarios`).
- [ ] Proteger rutas `/admin` con autenticación.
- [ ] Validar en dispositivo real el drawer móvil y las páginas de auth (capturas pendientes).
