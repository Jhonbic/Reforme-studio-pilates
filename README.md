# Reforme Studio Pilates

Web del centro de pilates **Reforme Studio Pilates** (Florencia, Caquetá — Colombia)
y su panel administrativo.

**Producción:** https://reforme-studio-pilates.vercel.app

> 📄 El contexto completo del proyecto — marca, decisiones de diseño, estado y
> pendientes — está en **[`docs/CONTEXTO.md`](docs/CONTEXTO.md)**. Si vas a tocar
> el código, empieza por ahí.

## Arrancar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000

Para verlo **en el móvil** desde la misma red WiFi:

```bash
npx next dev -H 0.0.0.0
```

y entra a `http://<IP-de-tu-PC>:3000` (la IP la da `ipconfig`).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | Linter |
| `npx tsc --noEmit` | Comprobación de tipos |

## Rutas

**Público**
- `/` — landing
- `/login`, `/registro` — solo UI, sin backend

**Panel administrativo** — construido, con datos de ejemplo
- `/admin` — dashboard
- `/admin/usuarios` — listado con filtros y export CSV
- `/admin/usuarios/nuevo` — alta de cliente (valida, **no guarda**)
- `/admin/usuarios/[id]` — ficha de cliente (solo lectura)
- `/admin/planes` — catálogo con crear/editar/eliminar (**no guardan**)
- `/admin/finanzas` — libro de movimientos y alta de gasto (**no guarda**)

> Lo único que funciona de verdad sin backend: la exportación a CSV, los filtros
> y búsquedas (en cliente) y el selector de periodo del dashboard. El resto de
> acciones validan y avisan de que no persisten.

> ⚠️ **`/admin` no está protegido.** No hay autenticación todavía: entra cualquiera
> que escriba la URL, y todas sus cifras son inventadas
> (`src/lib/admin/mock.ts`). No exponerlo como producto hasta cerrar la fase 2.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Lenis (smooth
scroll). Los gráficos del panel son **SVG propio, sin librería de charts**.

⚠️ Next.js 16 trae cambios de ruptura respecto a versiones anteriores: consulta
`node_modules/next/dist/docs/` antes de escribir código (ver [`AGENTS.md`](AGENTS.md)).

## Estructura

```
src/
  app/            rutas (App Router)
    admin/        panel administrativo
  components/
    admin/        panel + gráficos SVG
    auth/  fx/  icons/  ui/
  lib/admin/      tipos, datos de ejemplo, consultas y formato
docs/CONTEXTO.md  contexto del proyecto
```
