# VolAR — Rediseño visual (violeta/ink) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar el rediseño visual de `design/volar-diseno/` (tokens de color violeta/ink, tipografía Plus Jakarta Sans + JetBrains Mono, radios grandes, sidebar admin, micro-animaciones) a los componentes React ya implementados de VolAR, sin modificar lógica, rutas, validaciones ni reglas de negocio.

**Architecture:** Cambio centrado en tokens CSS (`app/globals.css`) y en los primitivos `components/ui/*` (shadcn/Base UI + CVA) para que la mayoría de las pantallas hereden el nuevo look automáticamente; encima, cada pantalla/feature recibe una pasada de restyle de markup (clases Tailwind, estructura visual) manteniendo exactamente los mismos props, handlers, server actions, schemas y condiciones que hoy.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (`@theme inline` en `globals.css`), shadcn components sobre `@base-ui/react`, `class-variance-authority`, `lucide-react`, `react-hook-form` + `zod`, Prisma, Vitest.

**Nota sobre verificación (adaptación de TDD):** esta tarea es un restyle sin cambio de comportamiento — no hay "test que falla" que escribir para un color o un radio. Cada tarea reemplaza el paso TDD por: *(a)* `npm run build` (compila y tipa) y *(b)* `npm run test` si la carpeta tocada tiene specs (`features/airports`, `features/routes` tienen `service.test.ts`/`schema.test.ts`) para confirmar que la lógica no se movió ni un bit. Si alguna vez un paso requiere tocar un archivo `.ts`/`.tsx` sin tests propios, el build + lint son la red de seguridad.

---

## File Structure

| Archivo | Responsabilidad en este rediseño |
|---|---|
| `app/globals.css` | Tokens de color/radio/fuente + animación `rise` global |
| `app/layout.tsx` | Carga de fuentes (Plus Jakarta Sans reemplaza Chakra Petch) |
| `components/ui/button.tsx` | Variant `soft` nueva (botones violeta-claro tipo "Limpiar"/"Aplicar filtros") |
| `components/ui/badge.tsx` | Variants `success`/`warning` nuevas + soporte de punto (dot) |
| `components/ui/card.tsx` | Radio mayor (20px) |
| `components/ui/input.tsx`, `native-select.tsx`, `select.tsx` | Altura mayor (44px) acorde al nuevo tamaño de campo |
| `components/ui/table.tsx` | Hover de fila más sutil, borde más claro |
| `components/site-header.tsx` | Header público re-estilado (logo, pill "Iniciar sesión") |
| `app/admin/layout.tsx`, `components/admin-nav.tsx` | Sidebar fija 252px en vez de nav superior |
| `app/page.tsx` | Hero ink con arco animado detrás del buscador |
| `features/flight-search/components/flight-search-form.tsx` | Buscador segmentado (campos sin bordes propios, swap circular) |
| `features/flight-search/components/flight-result-card.tsx` | Card de vuelo con track punteado + avión animado |
| `app/vuelos/page.tsx` | Breadcrumb y empty-state re-estilados |
| `app/compra/page.tsx` | Layout 2 columnas (selección + detalle de precio) y estados de error |
| `features/airports/components/{airport-form,airport-filters,airport-table}.tsx`, `app/admin/aeropuertos/page.tsx` | ABM Aeropuertos |
| `features/airplanes/components/{airplane-form,airplane-filters,airplane-table}.tsx`, `app/admin/aviones/page.tsx` | ABM Aviones |
| `features/routes/components/{route-form,route-filters,route-table}.tsx`, `app/admin/trayectos/page.tsx` | ABM Trayectos |
| `features/flights/components/{generate-flights-form,flight-filters,flight-table,edit-flight-dialog}.tsx`, `app/admin/vuelos/page.tsx` | Generación/cronograma de vuelos |
| `app/forbidden.tsx` | Error 403 |

---

### Task 1: Tokens globales de diseño ✅ DONE (spec ✅, quality: 2 issues fixed — `destructive-foreground` mapeado, `primary-hover` eliminado por no usarse)

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Reemplazar la paleta en `:root`**

Reemplazar el bloque `:root{...}` actual (líneas 51-90) por:

```css
:root{
  --background: #F5F5F9;
  --foreground: #16133D;
  --card: #FFFFFF;
  --card-foreground: #16133D;
  --popover: #FFFFFF;
  --popover-foreground: #16133D;
  --primary: #5530E0;
  --primary-foreground: #FFFFFF;
  --primary-hover: #4320C7;
  --secondary: #F1EDFF;
  --secondary-foreground: #4320C7;
  --muted: #F5F5F9;
  --muted-foreground: #5F5C78;
  --accent: #F1EDFF;
  --accent-foreground: #4320C7;
  --destructive: #B42318;
  --destructive-foreground: #FFFFFF;
  --destructive-muted: #FDEEEC;
  --success: #0D7048;
  --success-muted: #E7F5EE;
  --warning: #B93C0C;
  --warning-muted: #FFF0E8;
  --border: #E7E6EF;
  --input: #E7E6EF;
  --ring: #5530E0;

  /* Identidad VolAR ("ink"): header público y sidebar admin. */
  --tower: #16133D;
  --tower-foreground: #FFFFFF;
  --tower-muted: #C9C3F2;
  --tower-border: rgba(255,255,255,.08);
  --tower-accent: #A996FF;

  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.75rem;
  --sidebar: #16133D;
  --sidebar-foreground: #FFFFFF;
  --sidebar-primary: #5530E0;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: rgba(255,255,255,.08);
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: rgba(255,255,255,.08);
  --sidebar-ring: #5530E0;
}
```

No tocar el bloque `.dark{...}` (líneas 92-124): el proyecto no tiene toggle de tema oscuro expuesto al usuario; se deja como está para no introducir un cambio fuera de alcance.

- [ ] **Step 2: Registrar los tokens nuevos en `@theme inline`**

En el bloque `@theme inline{...}` (líneas 7-49), agregar después de `--color-card: var(--card);`:

```css
  --color-success: var(--success);
  --color-success-muted: var(--success-muted);
  --color-warning: var(--warning);
  --color-warning-muted: var(--warning-muted);
  --color-destructive-muted: var(--destructive-muted);
```

Esto habilita clases Tailwind `bg-success-muted`, `text-success`, `bg-warning-muted`, `text-warning`, `bg-destructive-muted` en todo el proyecto.

- [ ] **Step 3: Animación `rise` global**

Agregar al final del archivo, antes de `@layer base`:

```css
@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
.animate-rise { animation: rise .65s cubic-bezier(.2,.7,.2,1) both; }
.animate-rise-d1 { animation-delay: .08s; }
.animate-rise-d2 { animation-delay: .16s; }
.animate-rise-d3 { animation-delay: .24s; }
.animate-rise-d4 { animation-delay: .32s; }

@media (prefers-reduced-motion: reduce) {
  .animate-rise, .animate-rise-d1, .animate-rise-d2, .animate-rise-d3, .animate-rise-d4 {
    animation: none;
  }
}
```

- [ ] **Step 4: Verificar**

Run: `npm run build`
Expected: compila sin errores (es solo CSS, no debería romper nada de TypeScript).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "style: nuevos tokens de diseño (violeta/ink) en globals.css"
```

---

### Task 2: Tipografía (Plus Jakarta Sans) ✅ DONE (build OK, grep limpio)

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Reemplazar `Chakra_Petch` por `Plus_Jakarta_Sans`**

En `app/layout.tsx`, cambiar:

```ts
import { Chakra_Petch, JetBrains_Mono, Public_Sans } from "next/font/google";
```
por:
```ts
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
```

Reemplazar el bloque:
```ts
const publicSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
```
por:
```ts
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
```

`--font-heading` deja de tener una fuente propia: el look "heading" sale de peso 800 + tracking negativo con la misma Plus Jakarta Sans, así que en `globals.css` (`@theme inline`) el mapeo `--font-heading: var(--font-heading)` pasa a `--font-heading: var(--font-sans)`.

- [ ] **Step 2: Actualizar `className` del `<html>`**

```ts
className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
```

(se quita `chakraPetch.variable`, ya no existe esa variable).

- [ ] **Step 3: Actualizar `globals.css`**

En `@theme inline`, cambiar:
```css
--font-heading: var(--font-heading);
```
por:
```css
--font-heading: var(--font-sans);
```

- [ ] **Step 4: Verificar**

Run: `npm run build`
Expected: build OK, sin referencias rotas a `chakraPetch`.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "style: tipografia Plus Jakarta Sans en reemplazo de Chakra Petch"
```

---

### Task 3: Primitivo `Button` — variant `soft` ✅ DONE

**Files:**
- Modify: `components/ui/button.tsx`

- [ ] **Step 1: Agregar variant `soft`**

En `buttonVariants` (`components/ui/button.tsx:9-20`), agregar dentro de `variants.variant`, después de `secondary`:

```ts
        soft: "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--primary)_12%)]",
```

Esto cubre los botones "Limpiar campos" / "Aplicar filtros" / "Restablecer formulario" del rediseño (violeta-50 con texto violeta oscuro).

- [ ] **Step 2: Verificar**

Run: `npm run build`
Expected: OK — `VariantProps<typeof buttonVariants>` sigue siendo válido, solo se agregó una clave al union.

- [ ] **Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat(ui): variant soft en Button para acciones secundarias"
```

---

### Task 4: Primitivo `Badge` — variants `success`/`warning` + dot ✅ DONE

**Files:**
- Modify: `components/ui/badge.tsx`

- [ ] **Step 1: Agregar variants**

En `badgeVariants` (`components/ui/badge.tsx:9-21`), agregar dentro de `variants.variant`, después de `destructive`:

```ts
        success: "bg-success-muted text-success",
        warning: "bg-warning-muted text-warning",
```

- [ ] **Step 2: Agregar soporte de punto (`dot`)**

Cambiar la firma de `Badge` para aceptar un prop `dot?: boolean` que antepone un `<span>` circular del color actual (usa `currentColor`, así hereda el color del variant):

```tsx
function Badge({
  className,
  variant = "default",
  dot = false,
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
    children: (
      <>
        {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
        {children}
      </>
    ),
  })
}
```

(Si `useRender` no acepta `children` fuera de `props` de esta forma en la versión instalada de `@base-ui/react`, la alternativa equivalente es envolver manualmente: leer primero cómo `useRender` resuelve `children` en otro componente del mismo paquete — por ejemplo `components/ui/checkbox.tsx` usa `CheckboxPrimitive.Indicator` como hijo directo sin `useRender`, así que si hace falta, usar el patrón más simple: dejar `Badge` como está y anteponer el dot manualmente en cada call-site con `<Badge variant="success"><span aria-hidden className="mr-1 inline-block size-1.5 rounded-full bg-current" />Activo</Badge>` sin tocar el primitivo. Elegir la opción que compile sin warnings de tipos.)

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add components/ui/badge.tsx
git commit -m "feat(ui): variants success/warning y dot opcional en Badge"
```

---

### Task 5: Primitivo `Card` — radio mayor ✅ DONE

**Files:**
- Modify: `components/ui/card.tsx`

- [ ] **Step 1: Cambiar `rounded-xl` por `rounded-2xl`**

En `components/ui/card.tsx:14`, cambiar `rounded-xl` → `rounded-2xl` (y en `CardHeader` línea 27 `rounded-t-xl` → `rounded-t-2xl`, en `CardFooter` línea 86 `rounded-b-xl` → `rounded-b-2xl`, y en las imágenes línea 14 `rounded-t-xl`/`rounded-b-xl` → `rounded-t-2xl`/`rounded-b-2xl`).

Con `--radius: 0.75rem` (Task 1), `--radius-2xl: calc(var(--radius) * 1.8)` ≈ 1.35rem ≈ 21.6px, muy cerca del `border-radius: 20px` del diseño.

- [ ] **Step 2: Sombra solo en hover**

Agregar a la clase de `Card` (línea 14): `transition-shadow duration-300 hover:shadow-[0_18px_40px_-28px_rgba(22,19,61,0.4)]` — en reposo el borde de 1px (`ring-1 ring-foreground/10`, ya existente) es suficiente, como pide el README ("sombras solo en hover").

- [ ] **Step 3: Verificar**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add components/ui/card.tsx
git commit -m "style(ui): radio 20px y sombra en hover en Card"
```

---

### Task 6: Primitivos de campo — altura 44px ✅ DONE

**Files:**
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/native-select.tsx`
- Modify: `components/ui/select.tsx`

- [ ] **Step 1: `Input`**

En `components/ui/input.tsx:11`, cambiar `h-8` → `h-11` y `px-2.5` → `px-3.5`.

- [ ] **Step 2: `NativeSelect`**

En `components/ui/native-select.tsx:14`, cambiar `h-8` → `h-11` y `px-2.5` → `px-3.5`.

- [ ] **Step 3: `SelectTrigger`**

En `components/ui/select.tsx:43`, cambiar `data-[size=default]:h-8` → `data-[size=default]:h-11` y `pl-2.5` → `pl-3.5`.

- [ ] **Step 4: Verificar**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add components/ui/input.tsx components/ui/native-select.tsx components/ui/select.tsx
git commit -m "style(ui): altura 44px en Input/NativeSelect/SelectTrigger"
```

---

### Task 7: Primitivo `Table` — hover de fila ✅ DONE

**Files:**
- Modify: `components/ui/table.tsx`

- [ ] **Step 1: Suavizar el hover**

En `components/ui/table.tsx:59`, cambiar `hover:bg-muted/50` → `hover:bg-[#FAF9FD]` (coincide con el `tbody tr:hover{background:#FAF9FD}` del diseño; el token `muted` ahora vale `#F5F5F9`, muy parecido pero el diseño pide ese tono exacto para filas).

- [ ] **Step 2: Verificar**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add components/ui/table.tsx
git commit -m "style(ui): hover de fila de tabla acorde al rediseno"
```

---

### Task 8: Header público ✅ DONE

**Files:**
- Modify: `components/site-header.tsx`

- [ ] **Step 1: Re-estilar manteniendo la misma lógica de sesión**

El componente sigue siendo `async function SiteHeader()`, sigue llamando a `getCurrentUser()` e `isAdmin(user)`, sigue teniendo las mismas tres ramas (`!user`, `user`, `user && isAdmin(user)`). Solo cambia el markup:

```tsx
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser, isAdmin } from "@/lib/auth";

// Cabecera del sitio público (US-28/US-29): no exige sesión. La sesión es un
// control chico en la esquina — estilo despegar.com.ar, la cuenta se pide
// recién al iniciar una compra.
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="bg-tower text-tower-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-8 py-5">
        <Link href="/" className="group/logo flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
          <span className="grid size-[34px] place-items-center rounded-[10px] bg-primary transition-transform duration-500 group-hover/logo:-rotate-[14deg]">
            <PlaneIcon className="size-[18px]" />
          </span>
          VolAR
        </Link>

        {!user && (
          <Link
            href="/sign-in"
            className="inline-flex h-[42px] items-center gap-2 rounded-full border border-white/28 px-[18px] text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
          >
            Iniciar sesión
          </Link>
        )}
        {user && (
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-tower-muted sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <Link href="/cuenta" className="font-semibold text-white underline-offset-2 hover:text-tower-accent hover:underline">
              Mi cuenta
            </Link>
            {isAdmin(user) && (
              <Link href="/admin" className="font-semibold text-white underline-offset-2 hover:text-tower-accent hover:underline">
                Panel de administración
              </Link>
            )}
            <UserButton />
          </div>
        )}
      </div>
    </header>
  );
}

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}
```

`bg-tower`/`text-tower-foreground`/`text-tower-muted`/`text-tower-accent` requieren mapear esos nombres en `@theme inline` (si no están ya como utilidades Tailwind). Verificar en `app/globals.css` si existe `--color-tower`, etc.; si no existe, agregar en el mismo bloque de Task 1, Step 2:

```css
  --color-tower: var(--tower);
  --color-tower-foreground: var(--tower-foreground);
  --color-tower-muted: var(--tower-muted);
  --color-tower-accent: var(--tower-accent);
```

(si esto no se agregó en Task 1, agregarlo ahora como parte de este mismo commit).

- [ ] **Step 2: Verificar**

Run: `npm run build`
Expected: OK. Visualmente, levantar `npm run dev` y confirmar en `/` que el header se ve ink con el pill "Iniciar sesión" (sin sesión).

- [ ] **Step 3: Commit**

```bash
git add components/site-header.tsx app/globals.css
git commit -m "style: header publico re-estilado (logo + pill de sesion)"
```

---

### Task 9: Sidebar de administración ✅ DONE

**Files:**
- Modify: `components/admin-nav.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: `admin-nav.tsx` — agrupar en dos secciones, estilo sidebar**

`ADMIN_NAV_ITEMS` se mantiene igual (misma data, mismos `href`/`label`/`us`). Se agrega una agrupación puramente visual (no cambia el array exportado, que puede seguir siendo usado por otros lugares si existieran):

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/aeropuertos", label: "Aeropuertos", us: "US-01" },
  { href: "/admin/aviones", label: "Aviones", us: "US-02" },
  { href: "/admin/trayectos", label: "Trayectos", us: "US-03" },
  { href: "/admin/vuelos", label: "Vuelos", us: "US-04/07/09/11" },
] as const;

const GROUPS = [
  { label: "Catálogo maestro", items: ADMIN_NAV_ITEMS.slice(0, 3) },
  { label: "Operaciones", items: ADMIN_NAV_ITEMS.slice(3) },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-7">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-bold tracking-[0.14em] text-tower-muted uppercase">
            {group.label}
          </p>
          <nav className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-[46px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-white/10 text-white before:absolute before:top-3 before:bottom-3 before:left-[-16px] before:w-[3px] before:rounded-r-[3px] before:bg-tower-accent"
                      : "text-tower-muted hover:bg-white/6 hover:text-white",
                  )}
                >
                  {item.label}
                  <span className="ml-auto font-mono text-[10px] text-tower-muted">{item.us}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `app/admin/layout.tsx` — grid sidebar + contenido**

```tsx
import { UserButton } from "@clerk/nextjs";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

// US-30: solo ADMIN entra al panel (requireAdmin redirige o corta con 403).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="grid min-h-full flex-1 grid-cols-[252px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-7 bg-tower p-5 text-tower-foreground">
        <div className="flex items-center gap-2.5 px-2">
          <span className="grid size-[34px] place-items-center rounded-[10px] bg-primary">
            <PlaneIcon className="size-[18px]" />
          </span>
          <span className="text-[19px] leading-tight font-extrabold tracking-tight">
            VolAR
            <small className="block font-mono text-[10px] font-medium tracking-[0.16em] text-tower-muted uppercase">
              Administración
            </small>
          </span>
        </div>

        <AdminNav />

        <div className="mt-auto flex items-center gap-2.5 rounded-2xl bg-white/5 p-3 text-sm font-semibold">
          <span className="grid size-9 flex-none place-items-center rounded-full bg-tower-accent text-xs font-extrabold text-tower">
            {user.firstName?.[0]}
            {user.lastName?.[0]}
          </span>
          <span className="min-w-0">
            <span className="block truncate">
              {user.firstName} {user.lastName}
            </span>
            <small className="block text-xs font-medium text-tower-muted">Administrador</small>
          </span>
          <UserButton />
        </div>
      </aside>

      <main className="min-w-0 px-10 py-7 pb-14">{children}</main>
    </div>
  );
}

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}
```

`requireAdmin()` sigue siendo la única fuente de verdad del control de acceso — no se toca `lib/auth`.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Visual: `npm run dev`, entrar como admin a `/admin/aeropuertos`, confirmar sidebar fija con los 4 links agrupados y el item activo marcado.

- [ ] **Step 4: Commit**

```bash
git add components/admin-nav.tsx app/admin/layout.tsx
git commit -m "style: sidebar fija en el panel de administracion"
```

---

### Task 10: Hero del inicio ✅ DONE

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Envolver el buscador en el hero ink con arco animado**

Mantener exactamente la misma data (`listActiveAirports()`) y el mismo `<FlightSearchForm airports={airports} />`. Cambiar solo el wrapper:

```tsx
import { SiteHeader } from "@/components/site-header";
import { FlightSearchForm } from "@/features/flight-search/components/flight-search-form";
import { listActiveAirports } from "@/features/airports/queries";

// Sitio público (US-28/US-29): no exige sesión para nada. La acción principal
// es buscar vuelos (US-13); la cuenta se pide recién al iniciar una compra.
export default async function Home() {
  const airports = await listActiveAirports();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <section className="relative overflow-hidden bg-tower pb-[132px] text-white">
        <div className="mx-auto max-w-5xl px-8">
          <SiteHeader />
          <div className="relative mt-8 max-w-[620px]">
            <HeroArc />
            <div className="relative flex flex-col gap-4">
              <span className="animate-rise font-mono text-xs tracking-[0.22em] text-tower-accent uppercase">
                Sistema de gestión de vuelos
              </span>
              <h1 className="animate-rise-d1 animate-rise text-[60px] leading-[1.02] font-extrabold tracking-[-0.04em]">
                ¿A dónde querés viajar?
              </h1>
              <p className="animate-rise animate-rise-d2 text-[17px] text-tower-muted">
                Volá por Argentina con VolAR.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-[84px] w-full max-w-5xl flex-1 px-8">
        <div className="animate-rise animate-rise-d3">
          <FlightSearchForm airports={airports} />
        </div>
      </main>
    </div>
  );
}

function HeroArc() {
  return (
    <svg
      className="pointer-events-none absolute -right-5 top-[60px] h-[320px] w-[560px]"
      viewBox="0 0 560 320"
      aria-hidden="true"
    >
      <path
        d="M30 290 C 170 40, 400 30, 520 170"
        fill="none"
        stroke="rgba(255,255,255,.4)"
        strokeWidth="2"
        strokeDasharray="4 10"
        strokeLinecap="round"
        className="motion-safe:animate-[dash_2.6s_linear_infinite]"
        style={{ strokeDashoffset: 0 }}
      />
      <circle cx="30" cy="290" r="6" fill="#A996FF" />
      <circle cx="520" cy="170" r="6" fill="#fff" />
      <text x="46" y="296" fill="#C9C3F2" fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2">
        AEP
      </text>
      <text x="470" y="200" fill="#C9C3F2" fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2">
        BRC
      </text>
    </svg>
  );
}
```

El `FlightSearchForm` (Task 11) ya trae su propio contenedor blanco redondeado — este wrapper solo le da el `-mt-[84px]` para que se superponga al borde del hero.

Agregar a `app/globals.css` (si no está) el keyframe `dash` usado arriba, junto a `rise` (Task 1, Step 3):

```css
@keyframes dash { to { stroke-dashoffset: -56; } }
```

- [ ] **Step 2: Verificar**

Run: `npm run build`
Visual: `npm run dev`, abrir `/`, confirmar hero ink + arco + buscador superpuesto.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "style: hero ink con arco animado en la pantalla de inicio"
```

---

### Task 11: Buscador segmentado ✅ DONE

**Files:**
- Modify: `features/flight-search/components/flight-search-form.tsx`

- [ ] **Step 1: Re-estilar manteniendo `react-hook-form` + `zod` intactos**

No cambia: `useForm`, `zodResolver(flightSearchSchema)`, `onSubmit`, `swapAirports`, `todayIso`, el `form.register(...)`, ni los mensajes de error. Cambia el JSX de layout:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeftRight, ArrowRight, MapPin, CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { flightSearchSchema, type FlightSearchValues } from "../schema";

type AirportOption = { id: string; code: string; name: string; city: string };

type Props = {
  airports: AirportOption[];
  defaultValues?: Partial<FlightSearchValues>;
};

const EMPTY_VALUES: FlightSearchValues = { origen: "", destino: "", fecha: "" };

// US-13: buscador de vuelos por origen, destino y fecha (busqueda_pasajero.html).
// Valida con el mismo schema que la página de resultados y navega a /vuelos.
export function FlightSearchForm({ airports, defaultValues }: Props) {
  const router = useRouter();
  const form = useForm<FlightSearchValues>({
    resolver: zodResolver(flightSearchSchema),
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  });
  const { errors } = form.formState;

  const todayIso = new Date().toISOString().slice(0, 10);

  function onSubmit(values: FlightSearchValues) {
    router.push(`/vuelos?${new URLSearchParams(values).toString()}`);
  }

  function swapAirports() {
    const { origen, destino } = form.getValues();
    form.setValue("origen", destino);
    form.setValue("destino", origen);
    if (form.formState.isSubmitted) void form.trigger(["origen", "destino"]);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_210px_auto] gap-0 rounded-[22px] bg-card p-2.5 shadow-[0_30px_70px_-30px_rgba(22,19,61,0.45),0_2px_6px_rgba(22,19,61,0.06)]">
        <div className="group flex flex-col justify-center gap-1 rounded-2xl px-5 py-3 transition-colors hover:bg-muted focus-within:bg-secondary">
          <Label htmlFor="origen" className="gap-1.5 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
            <MapPin className="size-3.5 text-primary" />
            Origen <span className="text-primary">*</span>
          </Label>
          <NativeSelect
            id="origen"
            aria-invalid={!!errors.origen}
            className="h-auto cursor-pointer border-0 bg-transparent p-0 text-base font-bold"
            {...form.register("origen")}
          >
            <option value="">Seleccionar origen</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.city} - {a.name} ({a.code})
              </option>
            ))}
          </NativeSelect>
          {errors.origen && <p className="text-xs text-destructive">{errors.origen.message}</p>}
        </div>

        <div className="group relative flex flex-col justify-center gap-1 rounded-2xl py-3 pr-5 pl-[34px] transition-colors before:absolute before:top-4 before:bottom-4 before:left-0 before:w-px before:bg-border hover:bg-muted focus-within:bg-secondary">
          <button
            type="button"
            onClick={swapAirports}
            aria-label="Invertir origen y destino"
            className="absolute top-1/2 left-[-19px] z-10 grid size-[38px] -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-primary transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1/2 hover:rotate-180 hover:border-primary hover:shadow-[0_8px_20px_-8px_rgba(85,48,224,0.6)]"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <Label htmlFor="destino" className="gap-1.5 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
            <MapPin className="size-3.5 text-primary" />
            Destino <span className="text-primary">*</span>
          </Label>
          <NativeSelect
            id="destino"
            aria-invalid={!!errors.destino}
            className="h-auto cursor-pointer border-0 bg-transparent p-0 text-base font-bold"
            {...form.register("destino")}
          >
            <option value="">Seleccionar destino</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.city} - {a.name} ({a.code})
              </option>
            ))}
          </NativeSelect>
          {errors.destino && <p className="text-xs text-destructive">{errors.destino.message}</p>}
        </div>

        <div className="group relative flex flex-col justify-center gap-1 rounded-2xl px-5 py-3 transition-colors before:absolute before:top-4 before:bottom-4 before:left-0 before:w-px before:bg-border hover:bg-muted focus-within:bg-secondary">
          <Label htmlFor="fecha" className="gap-1.5 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
            <CalendarDays className="size-3.5 text-primary" />
            Salida <span className="text-primary">*</span>
          </Label>
          <Input
            id="fecha"
            type="date"
            min={todayIso}
            aria-invalid={!!errors.fecha}
            className="h-auto border-0 bg-transparent p-0 text-base font-bold"
            {...form.register("fecha")}
          />
          {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
        </div>

        <Button type="submit" className="ml-1.5 h-auto min-h-16 rounded-2xl px-[30px] text-base">
          <Search className="size-[18px]" />
          Buscar vuelos
        </Button>
      </div>

      <div className="flex items-center justify-between px-2 pt-[18px] text-[13px] text-muted-foreground">
        <span>
          <span className="text-primary">*</span> Campos obligatorios
        </span>
        <Button type="button" variant="link" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => form.reset(EMPTY_VALUES)}>
          <ArrowLeftRight className="size-3.5" />
          Limpiar búsqueda
        </Button>
      </div>
    </form>
  );
}
```

Nota: se cambió el botón "Limpiar búsqueda" a `variant="link"` para igualar el `.link-btn` del diseño (texto gris, sin fondo); si al verlo en pantalla el ícono no es el ideal (el diseño usa un ícono de "reload"), es un detalle menor que se puede ajustar sin afectar el plan.

- [ ] **Step 2: Verificar**

Run: `npm run build`
Visual: `npm run dev`, probar en `/`:
1. Elegir origen/destino, click en el botón circular → confirmar que se invierten (igual que antes).
2. Dejar un campo vacío y submitear → confirmar que sigue mostrando el mismo mensaje de `zod`.
3. Click "Buscar vuelos" con datos válidos → confirmar que navega a `/vuelos?origen=...&destino=...&fecha=...` igual que antes.

- [ ] **Step 3: Commit**

```bash
git add features/flight-search/components/flight-search-form.tsx
git commit -m "style: buscador segmentado (sin bordes internos, swap circular)"
```

---

### Task 12: Card de resultado de vuelo ✅ DONE

**Files:**
- Modify: `features/flight-search/components/flight-result-card.tsx`

- [ ] **Step 1: Re-estilar manteniendo `buildClassOptions` y los links a `/compra` intactos**

```tsx
import Link from "next/link";
import { ArrowRight, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDuration } from "@/features/routes/time";
import { formatCurrency, formatTime } from "@/features/flights/format";
import { buildClassOptions, type ClassOption } from "../class-options";
import type { FlightSearchResult } from "../queries";

// US-14: tarjeta de un resultado de búsqueda (busqueda_pasajero.html): horarios,
// tarifa y cupo por clase, y acceso directo a la compra de cada clase.
export function FlightResultCard({ flight }: { flight: FlightSearchResult }) {
  const departure = formatTime(flight.departureAt);
  const arrival = formatTime(flight.arrivalAt);
  const nextDay =
    flight.arrivalAt.toISOString().slice(0, 10) !== flight.departureAt.toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_248px_248px] overflow-hidden rounded-2xl border border-border bg-card transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#D9D6EA] hover:shadow-[0_22px_44px_-26px_rgba(22,19,61,0.4)]">
      <div className="flex flex-col justify-center gap-5 px-7 py-6">
        <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">{flight.code}</span>
          {flight.airplaneModel}
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[22px]">
          <div>
            <div className="text-[32px] leading-none font-extrabold tracking-[-0.035em]">{departure}</div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              {flight.origin.code} · {flight.origin.city}
            </div>
          </div>
          <div className="group/track relative h-[22px]">
            <span className="absolute inset-x-1 top-1/2 border-t-2 border-dotted border-[#CFCBE3]" />
            <span className="relative z-[1] size-2.5 rounded-full border-2 border-primary bg-card" />
            <Plane
              className="absolute top-1/2 left-[12%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-card text-primary transition-[left] duration-[1200ms] ease-out group-hover/track:left-[86%]"
              size={16}
            />
            <span className="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-primary" />
            <div className="absolute inset-x-0 top-full mt-1.5 text-center text-xs font-semibold text-muted-foreground">
              {formatDuration(departure, arrival)} · Directo
            </div>
          </div>
          <div className="text-right">
            <div className="text-[32px] leading-none font-extrabold tracking-[-0.035em]">
              {arrival}
              {nextDay && <sup className="ml-0.5 text-xs text-muted-foreground">+1 día</sup>}
            </div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              {flight.destination.code} · {flight.destination.city}
            </div>
          </div>
        </div>
      </div>

      {buildClassOptions(flight).map((option) => (
        <ClassBox key={option.seatClass} flightId={flight.id} option={option} />
      ))}
    </div>
  );
}

function ClassBox({ flightId, option }: { flightId: string; option: ClassOption }) {
  const soldOut = option.status === "sold-out";

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 border-l border-border px-[22px] py-[22px] transition-colors",
        soldOut ? "bg-[#FAFAFC]" : "hover:bg-[#FBFAFE]",
      )}
    >
      <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
        {option.label}
      </span>
      <span className={cn("mt-1.5 text-[28px] font-extrabold tracking-[-0.03em]", soldOut && "text-[#75728D] line-through decoration-2")}>
        <small className="mr-0.5 text-[15px] font-bold">$</small>
        {formatCurrency(option.fare).replace(/^\D+/, "")}
      </span>
      <span className="text-xs text-muted-foreground">por pasajero</span>

      <span className="my-3.5 flex min-h-6 items-center gap-1.5 text-[12.5px] text-muted-foreground">
        {soldOut && (
          <span className="inline-flex items-center rounded-full bg-destructive-muted px-2.5 py-1 text-xs font-bold text-destructive">
            Agotado
          </span>
        )}
        {option.status === "last-seats" && (
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-warning-muted px-2.5 py-1 text-xs font-bold text-warning before:size-1.5 before:animate-pulse before:rounded-full before:bg-current">
            Últimos {option.available} cupos
          </span>
        )}
        {option.status === "available" && (
          <>
            <strong className="text-foreground">{option.available}</strong> cupos disponibles
          </>
        )}
      </span>

      {soldOut ? (
        <Button variant="secondary" className="mt-auto w-full" disabled>
          No disponible
        </Button>
      ) : (
        <Link
          href={`/compra?${new URLSearchParams({ vuelo: flightId, clase: option.seatClass })}`}
          className={cn(
            buttonVariants({ variant: option.seatClass === "ECONOMY" ? "default" : "outline" }),
            "mt-auto w-full",
          )}
        >
          Seleccionar
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
```

Nota: `formatCurrency` ya devuelve `"$ 68.000"` (formateador `es-AR`); como el markup separa el `$` en un `<small>`, se usa `.replace(/^\D+/, "")` solo para no duplicar el símbolo — no cambia el valor numérico ni `formatCurrency` en sí.

- [ ] **Step 2: Verificar**

Run: `npm run build`
Visual: `npm run dev`, buscar un vuelo con resultados, confirmar:
1. Tarjeta con track punteado, avión se desliza en hover.
2. Clase agotada: precio tachado, botón deshabilitado, mismo texto "No disponible".
3. Link "Seleccionar" sigue yendo a `/compra?vuelo=...&clase=...` con los mismos query params.

- [ ] **Step 3: Commit**

```bash
git add features/flight-search/components/flight-result-card.tsx
git commit -m "style: card de resultado de vuelo con track animado"
```

---

### Task 13: Página de resultados — breadcrumb y empty state ✅ DONE (+ fix: `id="buscador"` que se había perdido, restaurado)

**Files:**
- Modify: `app/vuelos/page.tsx`

- [ ] **Step 1: Re-estilar sin tocar `searchParams`, `flightSearchSchema.safeParse` ni `searchFlights`**

Cambia solo el JSX de `VuelosPage` y `SearchResults` (mismas firmas, mismas props, misma lógica de `parsed`/`flights`):

```tsx
// dentro de VuelosPage, reemplazar el <main>:
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-7 px-8 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Inicio</Link>
          <span aria-hidden>/</span>
          <b className="font-semibold text-foreground">Búsqueda y selección de vuelos</b>
        </nav>

        <FlightSearchForm
          key={`${formDefaults.origen}-${formDefaults.destino}-${formDefaults.fecha}`}
          airports={airports}
          defaultValues={formDefaults}
        />

        {parsed && !parsed.success && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos buscar con esos datos</AlertTitle>
            <AlertDescription>
              {parsed.error.issues.map((issue) => issue.message).join(". ")}. Corregí la búsqueda y
              volvé a intentar.
            </AlertDescription>
          </Alert>
        )}

        {parsed?.success && flights && (
          <SearchResults search={parsed.data} flights={flights} airports={airports} />
        )}
      </main>
```

Se quita el `<Card>`/`<CardHeader>`/`<CardTitle>` que envolvía al buscador (el nuevo `FlightSearchForm` de Task 11 ya trae su propio contenedor blanco redondeado con sombra).

En `SearchResults`, reemplazar el `<section>`:

```tsx
  return (
    <section className="space-y-5" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
            {label(origin)} → {label(destination)}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <strong className="text-foreground">{formatLongDate(parseDateString(search.fecha))}</strong> ·{" "}
            <strong className="text-foreground">
              {flights.length} {flights.length === 1 ? "vuelo encontrado" : "vuelos encontrados"}
            </strong>
          </p>
        </div>
      </div>

      {flights.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
          <p className="text-lg font-bold">No encontramos vuelos disponibles para la fecha seleccionada</p>
          <p className="max-w-md text-sm text-muted-foreground">
            No hay vuelos a la venta para este trayecto en esa fecha, o ya no quedan asientos
            disponibles. Probá con otra fecha u otro origen / destino.
          </p>
          <Link href="#buscador" className={buttonVariants({ variant: "outline" })}>
            Cambiar búsqueda
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {flights.map((f) => (
            <li key={f.id}>
              <FlightResultCard flight={f} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
```

Quitar el import de `Card`/`CardContent`/`CardHeader`/`CardTitle` si quedan sin uso tras este cambio (orphan import, se elimina porque lo dejó sin usar este mismo cambio).

- [ ] **Step 2: Verificar**

Run: `npm run build`
Run: `npm run test` (no hay specs en `features/flight-search`, pero confirma que el resto del monorepo sigue verde)
Visual: probar una búsqueda con resultados y otra sin resultados.

- [ ] **Step 3: Commit**

```bash
git add app/vuelos/page.tsx
git commit -m "style: breadcrumb y empty state de resultados de busqueda"
```

---

### Task 14: Compra — layout de dos columnas ✅ DONE

**Files:**
- Modify: `app/compra/page.tsx`

- [ ] **Step 1: Re-estilar manteniendo toda la lógica de `CompraPage` intacta**

No se toca: `purchaseSelectionSchema.safeParse`, `getCurrentUser`/`redirect` a `/sign-in`, `getFlightOnSale`, `buildClassOptions`, ni las tres condiciones de `Unavailable` (selección inválida / vuelo no disponible / clase agotada). Cambia el JSX de `PurchaseShell` y del bloque de éxito:

```tsx
function PurchaseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-8 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Inicio</Link>
          <span aria-hidden>/</span>
          <Link href="/vuelos" className="hover:text-foreground">Búsqueda de vuelos</Link>
          <span aria-hidden>/</span>
          <b className="font-semibold text-foreground">Iniciar compra</b>
        </nav>

        <div className="flex items-center justify-between gap-6">
          <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">Iniciar compra</h1>
          <ol className="flex list-none items-center gap-2.5 p-0 text-[13px] font-bold text-muted-foreground">
            <Step n={1} label="Selección" active />
            <StepLine />
            <Step n={2} label="Pasajeros" />
            <StepLine />
            <Step n={3} label="Pago" />
          </ol>
        </div>

        {children}
      </main>
    </div>
  );
}

function Step({ n, label, active = false }: { n: number; label: string; active?: boolean }) {
  return (
    <li className={cn("flex items-center gap-2", active && "text-foreground")}>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full border-[1.5px] border-[#D6D4E2] bg-card text-xs",
          active && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_var(--secondary)]",
        )}
      >
        {n}
      </span>
      {label}
    </li>
  );
}

function StepLine() {
  return <span aria-hidden className="h-0.5 w-9 rounded-full bg-[#DCDAE8]" />;
}
```

(agregar `import { cn } from "@/lib/utils";` si no está ya importado en el archivo).

Reemplazar el bloque de éxito (el `<Card>` con "Tu selección") por un layout de dos columnas — card principal (ruta + datos) y aside de precio:

```tsx
  return (
    <PurchaseShell>
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Tu selección</CardTitle>
            <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">{flight.code}</span>
          </CardHeader>

          <div className="mx-6 mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 rounded-2xl bg-muted px-6 py-5">
            <div>
              <div className="text-[30px] leading-none font-extrabold tracking-[-0.035em]">
                {formatTime(flight.departureAt)}
              </div>
              <div className="mt-1.5 text-[13px] text-muted-foreground">
                {flight.origin.code} · {flight.origin.city}
              </div>
            </div>
            <div className="relative h-[22px]">
              <span className="absolute inset-x-1 top-1/2 border-t-2 border-dotted border-[#C9C5DE]" />
              <span className="relative z-[1] size-2.5 rounded-full border-2 border-primary bg-muted" />
              <span className="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-primary" />
            </div>
            <div className="text-right">
              <div className="text-[30px] leading-none font-extrabold tracking-[-0.035em]">
                {formatTime(flight.arrivalAt)}
              </div>
              <div className="mt-1.5 text-[13px] text-muted-foreground">
                {flight.destination.code} · {flight.destination.city}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 pt-5 pb-6">
            <SummaryItem label="Trayecto">
              {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} (
              {flight.destination.code})
            </SummaryItem>
            <SummaryItem label="Fecha">{formatLongDate(flight.date)}</SummaryItem>
            <SummaryItem label="Aeronave">{flight.airplaneModel}</SummaryItem>
            <SummaryItem label="Clase">{option.label}</SummaryItem>
          </dl>
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-base font-extrabold">Detalle del precio</h2>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Clase</span>
            <b className="text-foreground">{option.label}</b>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Cupos disponibles</span>
            <b className="text-foreground">{option.available}</b>
          </div>
          <div className="flex items-end justify-between border-t border-dashed border-border pt-4">
            <span className="text-[13px] font-semibold text-muted-foreground">Tarifa por pasajero</span>
            <strong className="text-[28px] font-extrabold tracking-[-0.03em]">{formatCurrency(option.fare)}</strong>
          </div>

          <Alert>
            <AlertTitle>Próximo paso</AlertTitle>
            <AlertDescription>
              La elección de la cantidad de pasajes, la carga de datos de los pasajeros y el pago se
              habilitan en la próxima etapa del sistema.
            </AlertDescription>
          </Alert>

          <Link href={resultsHref(flight)} className={buttonVariants({ variant: "outline" })}>
            Cambiar selección
          </Link>
        </Card>
      </div>
    </PurchaseShell>
  );
```

`Unavailable` se re-estila de forma mínima (mantiene `Alert variant="destructive"`, mismo `title`/`description`/`backHref`):

```tsx
function Unavailable({
  title,
  description,
  backHref = "/vuelos",
}: {
  title: string;
  description: string;
  backHref?: string;
}) {
  return (
    <Alert variant="destructive" className="rounded-2xl p-5">
      <AlertTitle className="text-[15px]">{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <Link href={backHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Volver a buscar
        </Link>
      </AlertDescription>
    </Alert>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npm run build`
Visual: probar los tres estados reales (seleccionar una clase disponible, pegar un `vuelo` inexistente en la URL, pegar una `clase` agotada) y confirmar que el texto y las condiciones que los disparan no cambiaron.

- [ ] **Step 3: Commit**

```bash
git add app/compra/page.tsx
git commit -m "style: compra en dos columnas con stepper decorativo"
```

---

### Task 15: Admin — Aeropuertos ✅ DONE (tests features/airports en verde)

**Files:**
- Read + Modify: `features/airports/components/airport-form.tsx`
- Read + Modify: `features/airports/components/airport-filters.tsx`
- Read + Modify: `features/airports/components/airport-table.tsx`
- Read + Modify: `app/admin/aeropuertos/page.tsx`

- [ ] **Step 1: Leer los cuatro archivos actuales**

Antes de tocar nada, leer el contenido real de los 4 archivos de esta tarea (no asumir estructura — usar `Read`). El research previo de esta conversación ya confirmó sus campos/columnas reales:
- Form: Código (uppercase, maxLength 4), Nombre Oficial, Ciudad/Localidad; badge "Modo: Edición"/"Modo: Nuevo Registro"; botones Guardar/Limpiar/Cancelar.
- Filtros: Buscar (texto), Estado Operativo (select Activos/Inactivos/Todos); Aplicar Filtros + Restablecer.
- Tabla: Código, Nombre del Aeropuerto, Ciudad, Trayectos Asociados, Estado, Acciones (Editar + Dar de baja, con tooltip "Bloqueado: posee vuelos futuros programados" cuando corresponde).

- [ ] **Step 2: Aplicar las siguientes "recetas" de clases sin tocar props/handlers/validaciones**

**Callout de regla de negocio** (reemplaza el `<Alert>` genérico de la página, mismo texto de `app/admin/aeropuertos/page.tsx`):

```tsx
<div className="flex items-start gap-3.5 rounded-2xl bg-secondary p-4 text-[#2E1A8F]">
  <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-card text-primary">
    <InfoIcon className="size-[18px]" />
  </span>
  <div>
    <b className="block text-[13.5px]">Regla integrada · US-01</b>
    <p className="m-0 text-[13.5px] leading-[1.55] text-[#3D3470]">
      El código IATA/ICAO es único y obligatorio. No se puede dar de baja un aeropuerto con vuelos
      futuros programados.
    </p>
  </div>
</div>
```

(`InfoIcon` = `Info` de `lucide-react`; el texto se copia literal del `AlertDescription` que ya existe en `app/admin/aeropuertos/page.tsx` — no inventar texto nuevo).

**Badge de modo en el header de la card de formulario** — donde hoy haya `<Badge>Modo: Nuevo Registro</Badge>` / `<Badge>Modo: Edición</Badge>`, cambiar a:

```tsx
<Badge variant={isEditing ? "default" : "secondary"}>{isEditing ? "Edición" : "Nuevo registro"}</Badge>
```

(usar la variable real que el componente ya usa para distinguir alta/edición — no renombrar esa variable, solo el badge).

**Estado Activo/Inactivo en la tabla** — donde hoy haya `<Badge variant="default">Activo</Badge>` / `<Badge variant="secondary">Inactivo</Badge>`, mantener el texto pero usar los variants nuevos de Task 4:

```tsx
<Badge variant="success" dot>Activo</Badge>
```
```tsx
<Badge variant="secondary" dot>Inactivo</Badge>
```

**Acción bloqueada con motivo** — donde hoy se deshabilita el botón "Dar de baja" y se muestra el motivo (vía `title`/tooltip o texto), mostrar explícitamente debajo de las acciones:

```tsx
<span className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
  <LockIcon className="size-3.5" aria-hidden />
  Bloqueado: posee vuelos futuros programados
</span>
```

(`LockIcon` = `Lock` de `lucide-react`; usar el mismo texto que ya devuelve la condición de bloqueo real del componente — no inventar la condición, solo mostrarla de forma visible en vez de solo en un `title`).

**Código en la tabla** (columna "Código"):

```tsx
<span className="rounded-lg bg-muted px-2 py-1 font-mono text-[12.5px] font-medium">{airport.code}</span>
```

**Botones del form**: "Guardar Aeropuerto" → `<Button>` (variant por defecto, ya violeta); "Limpiar Campos" → `<Button variant="soft">`; "Cancelar" → `<Button variant="ghost">`.

**Botones de filtros**: "Aplicar Filtros" → `<Button variant="soft" type="submit">`; "Restablecer" → `<Button variant="link">` o `<Link>` normal, según cómo esté implementado hoy (si es un link a la misma ruta sin query params, mantenerlo como `<Link>`, solo cambiar clases).

- [ ] **Step 3: Verificar**

Run: `npm run build`
Run: `npm run test -- features/airports` (hay `service.test.ts`/`schema.test.ts` en esta carpeta — deben seguir en verde, confirma que no se tocó lógica)
Visual: `npm run dev`, entrar a `/admin/aeropuertos`, probar alta, edición, filtro y el caso de un aeropuerto con vuelos futuros (botón "Dar de baja" bloqueado).

- [ ] **Step 4: Commit**

```bash
git add features/airports/components app/admin/aeropuertos/page.tsx
git commit -m "style: ABM de aeropuertos con el nuevo lenguaje visual"
```

---

### Task 16: Admin — Aviones ✅ DONE (tests features/airplanes en verde; sin badge de estado/lock inline — no existen en el componente real, criterio correcto del agente)

**Files:**
- Read + Modify: `features/airplanes/components/airplane-form.tsx`
- Read + Modify: `features/airplanes/components/airplane-filters.tsx`
- Read + Modify: `features/airplanes/components/airplane-table.tsx`
- Read + Modify: `app/admin/aviones/page.tsx`

- [ ] **Step 1: Leer los cuatro archivos actuales** (misma razón que Task 15, Step 1).

Campos reales ya confirmados: Identificador/Matrícula (uppercase), Modelo, Asientos Economy / Asientos Primera (números), campo de solo lectura "Capacidad Total Estimada" (auto-calculado, **no tocar el cálculo**); tabla con columnas Identificador, Modelo, Eco, 1ra, Capacidad Total, Vuelos Asignados, Acciones (Editar Capacidad / Dar de baja bloqueado con motivo "posee N vuelo(s) futuro(s) asignado(s)").

- [ ] **Step 2: Aplicar las mismas recetas de Task 15**

Mismo callout de regla (texto real: *"El identificador de matrícula es único. Un avión con vuelos futuros asignados no puede darse de baja."* — tomar el texto literal que ya esté en `app/admin/aviones/page.tsx`), mismo patrón de badge de modo, mismo patrón de estado con `Badge variant="success"/"secondary" dot`, mismo patrón de bloqueo con `LockIcon` + motivo (acá el motivo es dinámico: "posee N vuelo(s) futuro(s) asignado(s)" — mantener la interpolación existente, solo cambiar el contenedor visual).

Campo "Capacidad Total Estimada" (solo lectura): agregar `className="bg-muted text-muted-foreground"` al `Input` existente, sin tocar el `value`/cálculo.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Visual: `npm run dev`, `/admin/aviones`, alta de avión y confirmar que "Capacidad Total Estimada" se sigue recalculando igual.

- [ ] **Step 4: Commit**

```bash
git add features/airplanes/components app/admin/aviones/page.tsx
git commit -m "style: ABM de aviones con el nuevo lenguaje visual"
```

---

### Task 17: Admin — Trayectos ✅ DONE (tests features/routes en verde)

**Files:**
- Read + Modify: `features/routes/components/route-form.tsx`
- Read + Modify: `features/routes/components/route-filters.tsx`
- Read + Modify: `features/routes/components/route-table.tsx`
- Read + Modify: `app/admin/trayectos/page.tsx`

- [ ] **Step 1: Leer los cuatro archivos actuales.**

Campos reales: Aeropuerto de Origen / Destino (`Select` de shadcn, no `NativeSelect` — es formulario controlado), "Días de Operación Semanal" (grupo de `Checkbox`), Horario de Partida/Llegada (`input type="time"`) con helper de duración estimada en vivo; tabla con ID Trayecto, Origen & Destino, Días de Operación, Horario Salida, Horario Llegada (+ badge "+1 día" si corresponde), Estado, Acciones (bloqueadas con motivo "tiene pasajes vendidos" / "existen pasajes vendidos en vuelos de este trayecto").

- [ ] **Step 2: Días de operación — pills en vez de checkboxes planos**

El `Controller` de `react-hook-form` que maneja el array de días **no cambia su lógica** (mismo `field.value`/`field.onChange`). Solo cambia cómo se renderiza cada día dentro del `map`:

```tsx
<label
  key={day.value}
  className={cn(
    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
    isChecked && "border-primary bg-primary font-semibold text-primary-foreground",
  )}
>
  <Checkbox
    className="sr-only"
    checked={isChecked}
    onCheckedChange={(checked) => {
      /* la MISMA función que ya existe para togglear el día en el array */
    }}
  />
  {day.label}
</label>
```

(envolver el grupo completo en un contenedor `rounded-2xl border border-border p-2.5 flex flex-wrap gap-1.5`, que reemplaza al contenedor actual de checkboxes). La función `onCheckedChange` debe ser exactamente la que ya existe en el componente — leer el archivo primero y pegarla sin modificar su cuerpo.

**Select de origen/destino (shadcn `Select`, controlado)**: solo cambia `className` del `SelectTrigger` a `className="w-full"` (ya hereda la altura 44px de Task 6); el resto (`Controller`, `onValueChange`, opciones) no se toca.

**Helper de duración**: mantener el cálculo existente, solo envolver en:

```tsx
<span className="text-[11.5px] text-muted-foreground">{duracionTexto}</span>
```

**Badge de días en la tabla** (p.ej. "Lun-Vie"): `<Badge variant="secondary">{diasTexto}</Badge>` (mismo texto formateado que ya calcula el componente).

**Badge "+1 día"**: `<Badge variant="secondary" className="ml-1.5">+1 día</Badge>` junto al horario de llegada, condicionado a la misma bandera que ya existe (`llegaOtroDia` o como se llame en el código real).

**Bloqueo con pasajes vendidos**: mismo patrón `LockIcon` + texto de Task 15/16, con el texto real ("Bloqueado: tiene pasajes vendidos" en Editar / "Bloqueado: existen pasajes vendidos en vuelos de este trayecto" en Dar de baja) y la misma condición booleana existente (`hasSoldTickets` o como se llame).

- [ ] **Step 3: Verificar**

Run: `npm run build`
Run: `npm run test -- features/routes` (tiene `service.test.ts`)
Visual: `npm run dev`, `/admin/trayectos`, tildar/destildar días y confirmar que el formulario sigue enviando el mismo array; probar un trayecto con pasajes vendidos (edición bloqueada).

- [ ] **Step 4: Commit**

```bash
git add features/routes/components app/admin/trayectos/page.tsx
git commit -m "style: ABM de trayectos con dias de operacion como pills"
```

---

### Task 18: Admin — Vuelos (1/3): formulario de generación ✅ DONE

**Files:**
- Read + Modify: `features/flights/components/generate-flights-form.tsx`

- [ ] **Step 1: Leer el archivo actual.**

Confirmado: 3 `fieldset` con leyenda "Trayecto y Período de Disponibilidad (US-07)" / "Aeronave y Capacidad por Clase (US-09)" / "Tarifas por Clase (US-11)"; autocompletado de capacidad al elegir avión; hint dinámico "Se van a generar N vuelo(s)..." o "Ninguna fecha coincide...".

- [ ] **Step 2: Convertir los 3 `fieldset` en pasos numerados**

Sin tocar el `react-hook-form` ni el cálculo del hint dinámico, envolver cada sección en:

```tsx
<div className="grid grid-cols-[40px_minmax(0,1fr)] gap-[18px] border-t border-border py-[22px] first:border-t-0 first:pt-1">
  <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-extrabold text-[#4320C7]">
    1
  </span>
  <div>
    <div className="mb-4 flex items-baseline gap-2.5">
      <h3 className="text-[15px] font-extrabold">Trayecto y período de disponibilidad</h3>
      <span className="font-mono text-[11px] text-muted-foreground">US-07</span>
    </div>
    {/* campos existentes de esta sección, sin cambios de lógica */}
  </div>
</div>
```

(repetir con `2`/"Aeronave y capacidad por clase"/`US-09` y `3`/"Tarifas por clase"/`US-11`, cada uno con el contenido de campos que el componente ya tiene).

**Hint dinámico de fechas**: cuando el mensaje sea positivo (va a generar N vuelos), envolver en:

```tsx
<span className="mt-3 flex items-center gap-2 rounded-xl bg-success-muted px-3.5 py-2.5 text-[12.5px] font-semibold text-success">
  <CheckCircle2 className="size-4" />
  {mensaje}
</span>
```

cuando sea el caso "ninguna fecha coincide" (o cualquier mensaje neutro/de advertencia), dejarlo como texto simple `className="mt-3 text-[11.5px] text-muted-foreground"` (no inventar un estado de error que el componente no tenga hoy).

**Botones finales**: "Restablecer Formulario" → `<Button variant="ghost">`; "Generar y Publicar Vuelos Reales" → `<Button>` (default), ambos dentro de un contenedor `className="flex justify-end gap-2 border-t border-border pt-5"`.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Visual: `npm run dev`, `/admin/vuelos`, elegir trayecto + rango de fechas y confirmar que el hint sigue calculando el mismo número; elegir avión y confirmar que las capacidades se siguen autocompletando.

- [ ] **Step 4: Commit**

```bash
git add features/flights/components/generate-flights-form.tsx
git commit -m "style: formulario de generacion de vuelos como pasos numerados"
```

---

### Task 19: Admin — Vuelos (2/3): filtros y tabla con barras de ocupación ✅ DONE

**Files:**
- Read + Modify: `features/flights/components/flight-filters.tsx`
- Read + Modify: `features/flights/components/flight-table.tsx`

- [ ] **Step 1: Leer ambos archivos actuales.**

Confirmado (`flight-table.tsx`): columnas ID Vuelo, Fecha, Horarios, Ruta, Avión, Cupos Economy, Cupos Primera, Tarifas (`Eco: formatCurrency(f.economyFare)` / `1ra: formatCurrency(f.firstClassFare)`), Estado, Acciones ("Editar Vuelo" solo si `SCHEDULED` y fecha futura). Celda de cupos: `"Disp: N / capacity"` + `"(N vendidos)"`, badge "Agotado" cuando `available === 0 && capacity > 0`.

- [ ] **Step 2: Filtros — grid de 4 columnas**

Envolver los 4 campos existentes (Fecha de Vuelo, Origen, Destino, Estado del Vuelo) en `className="grid grid-cols-4 gap-3"`, sin tocar sus `name`/`defaultValue` (filtros viajan por querystring GET). Botones: "Buscar Vuelos Reales" → `<Button variant="soft" type="submit">`; "Limpiar Filtros" → mismo link existente, clases de `Button variant="ghost"`.

- [ ] **Step 3: Tabla — celda de ocupación con barra animada**

Donde hoy se arma el texto `"Disp: N / capacity"`, agregar debajo una barra, calculando el **mismo** porcentaje que ya usa la condición de "agotado" (no agregar un cálculo nuevo, reutilizar `available`/`capacity` que el componente ya tiene):

```tsx
<div className="flex min-w-[110px] flex-col gap-1.5">
  <span className="text-[13px]">
    <strong>{available}</strong> / {capacity}
    <small className="ml-1 text-muted-foreground">· {capacity - available} vend.</small>
  </span>
  <span className="h-[5px] overflow-hidden rounded-full bg-[#EEEDF4]">
    <span
      className={cn(
        "block h-full origin-left rounded-full bg-primary motion-safe:animate-[grow_1.1s_cubic-bezier(.2,.7,.2,1)_.3s_both]",
        available === 0 && capacity > 0 && "bg-destructive",
      )}
      style={{ width: `${capacity > 0 ? ((capacity - available) / capacity) * 100 : 0}%` }}
    />
  </span>
</div>
```

Agregar el keyframe `grow` en `app/globals.css` (Task 1, Step 3):

```css
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

El badge "Agotado" existente se mantiene con `variant="destructive"` tal cual, solo se agrega arriba/al lado de la barra en vez de reemplazarla.

**Estado del vuelo**: `Badge variant="success" dot` para "Programado", `Badge variant="secondary" dot` para "Cancelado" (mismo texto que ya calcula el componente).

**Fila de vuelo pasado**: si el componente ya distingue vuelos pasados (no editable), aplicar `className="text-muted-foreground"` a la fila completa en vez de a celdas sueltas.

- [ ] **Step 4: Verificar**

Run: `npm run build`
Run: `npm run test -- features/flights` (si hay specs en esa carpeta)
Visual: `npm run dev`, `/admin/vuelos`, confirmar que las barras reflejan la misma ocupación que el texto, y que "Editar Vuelo" solo aparece donde ya aparecía antes.

- [ ] **Step 5: Commit**

```bash
git add features/flights/components/flight-filters.tsx features/flights/components/flight-table.tsx app/globals.css
git commit -m "style: filtros y barras de ocupacion en el cronograma de vuelos"
```

---

### Task 20: Admin — Vuelos (3/3): modal de edición ✅ DONE

**Files:**
- Read + Modify: `features/flights/components/edit-flight-dialog.tsx`

- [ ] **Step 1: Leer el archivo actual.**

Confirmado: `DialogTitle` = `"Editar Vuelo {flight.code}"`, descripción con fecha+ruta, grid 2x2 (Capacidad Economy + helper mín/máx, Tarifa Economy, Capacidad Primera + helper mín/máx, Tarifa Primera), nota al pie sobre tarifas futuras, botones Cerrar/Descartar y Guardar Cambios, toast `"Vuelo ${flight.code} actualizado"` al guardar.

- [ ] **Step 2: Re-estilar sin tocar validación de mín/máx ni el submit**

El `DialogContent` ya viene con `rounded-xl` (Task 5 lo sube a `rounded-2xl` a nivel primitivo, no hace falta tocarlo acá). Agregar un ícono de header (usa el mismo patrón que el callout de reglas):

```tsx
<DialogHeader className="flex-row items-start gap-3.5 space-y-0">
  <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-secondary text-primary">
    <PencilIcon className="size-5" />
  </span>
  <div>
    <DialogTitle>Editar Vuelo {flight.code}</DialogTitle>
    <DialogDescription>
      {/* MISMA interpolación de fecha+ruta que ya existe */}
    </DialogDescription>
  </div>
</DialogHeader>
```

Grid de campos: `className="grid grid-cols-2 gap-4"` en el contenedor existente (ya trae los 4 `Input type="number"` con sus `min`/`max` reales — no tocar esos atributos).

Nota al pie (mismo texto: *"Una tarifa nueva aplica a compras futuras; ventas ya confirmadas conservan el precio pagado."*):

```tsx
<p className="col-span-2 flex items-start gap-2.5 rounded-xl bg-muted p-3.5 text-[13px] leading-[1.55] text-muted-foreground">
  <InfoIcon className="mt-0.5 size-4 flex-none text-primary" />
  Una tarifa nueva aplica a compras futuras; ventas ya confirmadas conservan el precio pagado.
</p>
```

Footer: "Cerrar"/"Descartar" → `<Button variant="outline">` dentro de `DialogClose`; "Guardar Cambios de Vuelo" → `<Button>` (default), ambos con el mismo `onClick`/`type="submit"` que ya tienen.

- [ ] **Step 3: Verificar**

Run: `npm run build`
Visual: `npm run dev`, `/admin/vuelos`, abrir "Editar Vuelo" sobre un vuelo con pasajes vendidos, confirmar que los mínimos siguen respetando lo vendido y que el toast sigue apareciendo igual al guardar.

- [ ] **Step 4: Commit**

```bash
git add features/flights/components/edit-flight-dialog.tsx
git commit -m "style: modal de edicion de vuelo con header iconografico"
```

---

### Task 21: Forbidden (403) ✅ DONE

## Verificación final integrada (post-paralelización)

- `npm run build`: compila, tipa y genera las 13 rutas sin errores.
- `npm run test`: 146/146 tests en verde (18 archivos).
- Nada commiteado — todo queda en el working tree para que el usuario revise y commitee.

**Files:**
- Modify: `app/forbidden.tsx`

- [ ] **Step 1: Re-estilar manteniendo el mismo texto y el mismo `Link href="/"`**

```tsx
import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// US-30: pantalla mostrada cuando forbidden() corta un acceso no autorizado por rol.
export default function Forbidden() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-3.5 overflow-hidden py-24 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 grid place-items-center text-[300px] font-extrabold tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_#E2DFF0] select-none"
      >
        403
      </span>
      <span className="relative grid size-16 place-items-center rounded-[20px] bg-tower text-white shadow-[0_18px_40px_-16px_rgba(22,19,61,0.6)] motion-safe:animate-[bob_3.4s_ease-in-out_infinite]">
        <Lock className="size-[26px]" />
      </span>
      <p className="relative font-mono text-xs tracking-[0.28em] text-destructive uppercase">
        Error 403
      </p>
      <h1 className="relative max-w-[460px] text-[28px] font-extrabold tracking-[-0.03em]">
        No tenés permiso para acceder a esta página
      </h1>
      <p className="relative max-w-md text-[15px] leading-[1.6] text-muted-foreground">
        Esta sección está restringida a administradores. Si creés que es un error, contactá a
        un administrador del sistema.
      </p>
      <Link href="/" className={buttonVariants({ className: "relative mt-2.5" })}>
        Volver al inicio
      </Link>
    </div>
  );
}
```

Agregar el keyframe `bob` a `app/globals.css` (Task 1, Step 3):

```css
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
```

- [ ] **Step 2: Verificar**

Run: `npm run build`
Visual: forzar un 403 (entrar a `/admin/*` con un usuario no-admin) y confirmar que el texto y el botón "Volver al inicio" siguen funcionando igual.

- [ ] **Step 3: Commit**

```bash
git add app/forbidden.tsx app/globals.css
git commit -m "style: pantalla 403 con candado animado"
```

---

## Fuera de alcance (confirmado con el usuario)

`sign-in`/`sign-up`/`/cuenta` son widgets de Clerk sin `appearance` configurado en `ClerkProvider` (verificado en `app/layout.tsx`) — no están en `design/volar-diseno/` y no se tocan en este plan.

## Self-Review

**Cobertura del spec:** las 11 pantallas de `design/volar-diseno/pantallas/` están cubiertas (Main→Task 10-11, Resultados→Task 12-13, ResultadosVacio→Task 13, Compra/CompraError→Task 14, AdminAeropuertos→Task 15, AdminAviones→Task 16, AdminTrayectos→Task 17, AdminVuelos→Task 18-19, AdminVuelosEditar→Task 20, Forbidden→Task 21), más tokens/fuentes/primitivos compartidos (Task 1-9).

**Placeholders:** las tareas 15-20 (ABM + vuelos) no tienen el archivo actual leído en este plan, así que en vez de un diff línea-a-línea se dan recetas de clases completas y textos literales reales (confirmados por investigación previa de esta conversación) con instrucción explícita de leer el archivo antes de editar — esto es trabajo de investigación legítimo, no un placeholder de "implementar después".

**Consistencia de tipos/nombres:** `Badge` variants (`success`/`warning`) y `Button` variant (`soft`) definidos en Task 3-4 se referencian de forma idéntica en Task 15-20. Tokens `--color-tower*`, `--color-success*`, `--color-warning*`, `--color-destructive-muted` definidos en Task 1 y referenciados como clases Tailwind (`bg-tower`, `text-success`, etc.) en todas las tareas posteriores.
