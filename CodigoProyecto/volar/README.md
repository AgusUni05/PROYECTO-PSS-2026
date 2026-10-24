# VolAR

VolAR es una aplicación web de venta de pasajes aéreos: búsqueda de vuelos,
reserva de asientos, pago simulado, emisión de e-tickets, facturación y
gestión de contingencias operativas (cambios de horario y cancelaciones).
El panel administrativo permite administrar aeropuertos, aviones, trayectos,
vuelos, personal y cancelaciones.

Este repositorio corresponde al **Sprint 3**, cuyo alcance fue:

| Historia | Alcance |
| --- | --- |
| US-25 | Outbox de notificaciones por email ante cambios de horario y cancelaciones. |
| US-26 | Resolución de contingencias: reprogramación sin cargo a un vuelo elegible o reembolso simulado. |
| US-35 | "Mis Compras": próximos vuelos e historial, solo para el titular de la sesión. |
| US-36 | Descarga de e-tickets y factura fiscal en PDF, generados al momento. |
| UX | Mis Compras responsive (sin scroll horizontal a 320 px), alertas de contingencia accionables y descargas ocultas para compras no confirmadas. |

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) y **React 19**.
- **Tailwind CSS 4** + componentes estilo shadcn/ui.
- **Prisma 7** con **PostgreSQL** (`@prisma/adapter-pg`).
- **Clerk** para autenticación; el rol y el estado del usuario viven en la tabla `users`.
- **Vitest 5** con `vitest-mock-extended` para tests de unidad e integración con Prisma mockeado.
- **Nodemailer 6** para SMTP y **pdf-lib** para generar los PDF.

## Requisitos

- Node.js 20.9 o superior (recomendado: Node 22 LTS).
- pnpm 10 o superior.
- Una base PostgreSQL accesible.
- Un proyecto de Clerk (publishable key y secret key).

## Puesta en marcha

```bash
pnpm install
cp .env.example .env      # en PowerShell: Copy-Item .env.example .env
# completar .env con las claves reales de Clerk, las URLs de PostgreSQL y SMTP
pnpm prisma generate
```

Migraciones:

```bash
# Base existente (producción/CI): aplica las migraciones pendientes
pnpm prisma migrate deploy

# Desarrollo local: crea y aplica una migración nueva al cambiar el schema
pnpm prisma migrate dev
```

> Sprint 3 no agrega migraciones: el schema y las migraciones necesarias ya
> estaban en `prisma/migrations/`.

Levantar la aplicación:

```bash
pnpm dev      # http://localhost:3000
pnpm build    # build de producción
pnpm start    # servir el build
```

En el primer inicio de sesión con Clerk se crea automáticamente la fila local
en `users` con rol `PASSENGER`. Para habilitar el panel administrativo:

```bash
pnpm make-admin correo@ejemplo.com
```

El usuario debe haber iniciado sesión al menos una vez antes de promoverlo.

### Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión usada por la aplicación (pooler o directa). |
| `DIRECT_URL` | Conexión directa usada por el CLI de Prisma para migrar. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk. |
| `CLERK_SECRET_KEY` | Clave secreta de Clerk (solo servidor). |
| `APP_URL` | URL pública de la app; se usa para armar los enlaces de contingencia. Default del script: `http://localhost:3000`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Configuración SMTP requerida para enviar emails. |
| `SMTP_SECURE` | Opcional: `true`/`1` para TLS implícito (puerto 465); ausente o `false` usa STARTTLS (puerto 587). |

`.env.example` contiene la documentación de cada bloque, sin credenciales
reales. Nunca se commitea `.env`.

## Scripts

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo con recarga en caliente. |
| `pnpm build` | Build de producción de Next.js. |
| `pnpm start` | Sirve el build de producción. |
| `pnpm lint` | ESLint sobre todo el proyecto. |
| `pnpm test` | Suite completa de Vitest. |
| `pnpm test:watch` | Vitest en modo watch. |
| `pnpm make-admin <email>` | Promueve un usuario existente al rol `ADMIN`. |
| `pnpm seed:demo [--clean]` | Crea o elimina datos demo para probar el flujo de pago. |
| `pnpm mail:send` | Reintenta las notificaciones `PENDING` de contingencia y de compra. |

`make-admin`, `seed:demo` y `mail:send` dependen de `tsx`, que es una
devDependency: instalar con `pnpm install` completo, no con `pnpm install --prod`.
El envío principal es automático: la confirmación de compra sale al aprobar el
pago y las contingencias salen al guardar un cambio de horario o una
cancelación con pasajes emitidos. Ambos son best-effort; si SMTP falla, la
operación administrativa o la compra no se revierte y la fila queda en el
outbox. `mail:send` es el reintento manual (o invocado por un cron externo).

## Email y SMTP

Las notificaciones se persisten en `EmailNotification` dentro de la misma
transacción que registra el cambio de vuelo (US-25) o la emisión de la compra
(US-24). El envío es un paso posterior y separado, para que una caída de SMTP
no revierta una operación ya confirmada.

Al aprobarse un pago, la confirmación de compra se envía de inmediato (best
effort) con los e-tickets y la factura adjuntos en PDF. Al guardar un cambio de
horario o una cancelación con pasajes emitidos, el outbox de contingencias se
despacha en el mismo request de la acción administrativa. Si el envío falla o
SMTP no está configurado, la fila queda `PENDING`/`FAILED` y puede reintentarse
con `pnpm mail:send`. Si la contingencia ya fue resuelta antes del envío, la
fila se marca terminal con un `lastError` explicativo para no reintentarla
indefinidamente.

Variables obligatorias: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` y
`MAIL_FROM`. `SMTP_SECURE` es opcional (TLS implícito en el puerto 465;
STARTTLS con `false` o sin definir en el 587). Verificar la conexión:

```bash
pnpm exec tsx scripts/test-smtp.ts
```

Despachar la cola:

```powershell
$env:APP_URL="https://tu-dominio"; pnpm mail:send
```

Solo se despachan las filas `FLIGHT_CANCELLATION`, `FLIGHT_SCHEDULE_CHANGE` y
`PURCHASE_CONFIRMATION` en estado `PENDING`; otros tipos (por ejemplo
`REBOOKING_CONFIRMATION`) no se envían con este comando. Cada email de
contingencia incluye un enlace absoluto por pasaje con la forma
`/contingencia/{token}`, que es la ruta real de la pantalla pública. Las
confirmaciones de compra adjuntan los e-tickets y, si existe, la factura en
PDF. Si una notificación de contingencia ya no tiene tokens `PENDING`, se omite
en lugar de enviar un email sin acciones; si no tiene `bookingId`, también se
omite para no consultar tokens de otras reservas.

El comando imprime un resumen (`procesados`, `enviados`, `fallidos`,
`omitidos`) y no imprime cuerpos de email ni credenciales. Las filas enviadas
pasan a `SENT`; un fallo de envío las deja en `FAILED` con `lastError` y las
incrementa en `attempts`.

Las confirmaciones de reprogramación (`REBOOKING_CONFIRMATION`) **no se envían
por email en Sprint 3**: no existe una plantilla propia y no deben reutilizar la
de contingencia. Por eso se registran directamente en estado terminal `FAILED`
con un `lastError` no secreto, en lugar de quedar `PENDING` para siempre.

**Sin configuración SMTP, cada fila de contingencia o compra queda en
`PENDING`**: `createMailerTransport()` lanza antes de actualizar la base, por lo
que se puede completar la configuración y reintentar el mismo comando sin
perder notificaciones. Las confirmaciones de compra en `FAILED` se reintentan
con `mail:send` hasta 5 intentos.

Para desarrollo se recomienda un sandbox (por ejemplo Mailtrap) o un proveedor
con "app password"; no usar credenciales reales en el repositorio.

## Pago simulado (VolarPay)

No hay integración con una pasarela externa ni llamadas de red:

- Se aprueba si el **último dígito** del número de tarjeta es **par** y se
  rechaza si es impar (permite probar ambos caminos de forma determinista).
- La marca se deduce del primer dígito (`4` VISA, `5` MASTERCARD, `3` AMEX, otro
  `OTRA`).
- Solo se persisten la marca y los últimos 4 dígitos; el número completo y el
  código de seguridad se descartan.

Los reembolsos de US-26 también son simulados (`VolarPayRefundGateway`): no
hay llamada externa, se genera un `gatewayRefundId` y se registra el `Refund`.

## Comprobantes PDF

Los e-tickets y la factura se generan **en cada descarga** a partir de los datos
actuales de la base con `pdf-lib`. No se almacenan archivos PDF ni rutas en
disco. Esos mismos PDFs se generan al enviar la confirmación de compra y se
adjuntan al correo; no se persisten como archivos.

- `GET /api/compras/{codigo}/etickets`
- `GET /api/compras/{codigo}/factura`

Ambas rutas exigen sesión y verifican que la compra pertenezca al usuario
autenticado. Solo las compras `CONFIRMED` permiten descargar; el resto
responde `409`. En la UI, una compra no confirmada no muestra links de descarga
y explica el motivo.

Los e-tickets incluyen únicamente pasajes en estado `ISSUED`: un pasaje
reembolsado o cancelado no se emite como válido y tampoco suma en los conteos
de la UI. Si no queda ningún pasaje `ISSUED`, la descarga de e-tickets responde
`404` como comprobante no disponible. La factura no cambia: sigue reflejando lo
abonado.

La pantalla `/compra/comprobantes?reserva=…` también resuelve la titularidad con
la sesión (`Booking.buyerId`). Si el código no existe o pertenece a otra cuenta,
muestra el mismo estado "No encontramos esta reserva"; no es un `404` HTTP,
sino una pantalla no disponible que no revela si la reserva existe.

Tras una reprogramación (US-26), cada e-ticket usa el vuelo actual del pasaje
(`Ticket.flight`), no el vuelo original de la reserva.

## Seguridad

- La sesión de Clerk es la única fuente de identidad: nunca se aceptan IDs de
  usuario enviados por el cliente.
- Los recursos de compra se autorizan del lado del servidor por titularidad. En
  las rutas de descarga, una reserva ajena y una inexistente devuelven el mismo
  `404`; en `/compra/comprobantes` muestran el mismo estado no disponible.
- El panel `/admin` exige rol `ADMIN` activo tanto en el layout como al inicio
  de cada Server Action.
- Los enlaces de contingencia usan un token aleatorio como único secreto y se
  validan antes de cualquier cambio. Al resolver un pasaje, todos los tokens
  `PENDING` de ese mismo ticket quedan resueltos para evitar dobles reembolsos.
- No se persisten datos sensibles de tarjetas y no se commitean secretos,
  `.env` ni credenciales SMTP reales.
- Los PDF se generan desde la base, sin aceptar rutas ni bytes del cliente.

## Arquitectura

```
app/                 Rutas de Next.js (páginas, layouts y route handlers)
  admin/             Panel administrativo (protegido por rol ADMIN)
  api/compras/       Descargas autenticadas de e-tickets y factura
  compra/            Flujo de compra: reserva, pago y comprobantes
  contingencia/      Página pública de resolución por token
  cuenta/            Perfil y "Mis Compras"
  vuelos/            Búsqueda de vuelos
components/          Componentes compartidos (header, shells, navegación, UI base)
features/            Lógica de dominio por área
  flights/           Vuelos, generación, contingencias, reprogramación y reembolso
  purchase/          Reserva, pago, emisión, historial, comprobantes y PDF
  flight-search/     Búsqueda y filtros
  airplanes/, airports/, routes/, staff/   ABM del panel
lib/                 Infraestructura transversal: Prisma, auth, IDs, mailer
prisma/              Schema y migraciones
tests/               Setup compartido de Vitest (Prisma mockeado)
scripts/             Tareas operativas (make-admin, seed, SMTP, mail:send)
docs/                Documentación de verificación
```

### Tests

`tests/prisma-mock.ts` reemplaza `@/lib/prisma` por un `DeepMockProxy` de
`vitest-mock-extended` y lo resetea antes de cada test. Los tests no necesitan
una base real ni variables de entorno de producción. Los componentes se
verifican con `renderToString`, sin navegador.

## Verificación

Antes de integrar cambios:

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

El detalle de la verificación del Sprint 3, la matriz de evidencia y las
limitaciones conocidas están en
[`docs/sprint-3-verification.md`](docs/sprint-3-verification.md).
