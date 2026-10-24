# Verificación del Sprint 3

Documento operativo del cierre del Sprint 3 de VolAR. Describe el alcance, la
evidencia automatizada disponible, los comandos de verificación y las pruebas
manuales que todavía requieren intervención humana. No contiene credenciales ni
datos personales.

## Alcance

| Historia | Criterio de aceptación |
| --- | --- |
| **US-25** | Un cambio de horario o una cancelación con pasajes emitidos registra `FlightChange`, una `TicketContingency` por pasaje con token único y una `EmailNotification` `PENDING` por comprador, con asunto y cuerpo acordes al tipo. El email enlaza a la ruta real `/contingencia/{token}`. Las notificaciones de contingencia (`FLIGHT_CANCELLATION`, `FLIGHT_SCHEDULE_CHANGE`) se despachan **manualmente** con `pnpm mail:send`; un envío exitoso pasa a `SENT`, un fallo a `FAILED`, y una fila sin cambio de vuelo, sin tokens `PENDING` o sin `bookingId` no se envía. |
| **US-26** | El pasajero resuelve la contingencia desde el enlace con token: reprogramación sin cargo a un vuelo futuro de la misma ruta y clase (con asiento y e-ticket nuevos) o reembolso simulado por el importe del pasaje, ambos con confirmación previa. La operación es atómica e idempotente, exige que el pasaje siga `ISSUED`, resuelve todos los tokens `PENDING` del mismo ticket y libera el cupo correspondiente una sola vez. |
| **US-35** | "Mis Compras" muestra próximos vuelos e historial del usuario de la sesión, con alertas de contingencias pendientes. Un usuario nunca ve compras de otro y la vista no genera scroll horizontal en mobile. |
| **US-36** | El comprador puede descargar e-tickets y factura fiscal en PDF generados al momento. Las rutas exigen sesión, verifican titularidad, responden `409` para compras no confirmadas y cada e-ticket usa el vuelo actual del pasaje. Solo se emiten pasajes `ISSUED`; los reembolsados no aparecen en el PDF ni en los conteos. La factura no cambia. |
| **UX** | Botón de intercambio de aeropuertos con hover/foco visibles, alertas de contingencia accionables, layout responsive de Mis Compras y descargas ocultas con explicación cuando la compra no está confirmada. |

## Matriz de evidencia

### US-25 — Notificaciones de contingencia

| Evidencia | Archivo |
| --- | --- |
| Construcción del outbox: deduplicación por compra, un token por pasaje, asunto/cuerpo por tipo. | `features/flights/contingency.test.ts` |
| Alta transaccional de `FlightChange`, contingencias y emails `PENDING` al reprogramar o cancelar vuelos. | `features/flights/service.test.ts` |
| Contenido del email, enlaces `/contingencia/{token}` (segmento de ruta, sin `?token=`), filtro de tokens `PENDING`, `bookingId` obligatorio, actualización `SENT`/`FAILED`, retorno del resultado y `SKIPPED` para tipos no soportados. | `lib/mailer/send.test.ts` |
| Despacho de la cola: allowlist de tipos, orden, conteos, fila sin cambio de vuelo y error que no aborta el lote. | `lib/mailer/dispatch.test.ts` |
| Configuración del transporte SMTP y errores por variables faltantes. | `lib/mailer/index.test.ts` |

Producción: `features/flights/contingency.ts`, `features/flights/service.ts`,
`lib/mailer/send.ts`, `lib/mailer/dispatch.ts`, `lib/mailer/index.ts`,
`lib/mailer/templates.ts`, `scripts/send-pending-emails.ts`.

### US-26 — Reprogramación y reembolso

| Evidencia | Archivo |
| --- | --- |
| Reembolso idempotente, importe, liberación de cupo una sola vez, guardia de ticket `ISSUED`, resolución de tokens sibling y reprogramación con validación de ruta/clase/cupo y orden de locks. | `features/flights/contingency-resolution.test.ts` |
| Búsqueda por token y alternativas elegibles (misma ruta, futuras, con cupo). | `features/flights/contingency-queries.test.ts` |
| Traducción de resultados a mensajes de las Server Actions. | `features/flights/contingency-actions.test.ts` |
| Pantalla de resolución: estados, reembolso, selección de vuelo, DNI/Pasaporte y confirmación previa a acciones irreversibles. | `features/flights/components/contingency-resolution.test.tsx` |
| Página pública por token y precarga de alternativas solo si está pendiente. | `app/contingencia/[token]/page.test.tsx` |

Producción: `features/flights/contingency-resolution.ts`,
`features/flights/contingency-queries.ts`, `features/flights/contingency-actions.ts`,
`features/flights/volar-pay-gateway.ts`,
`features/flights/components/contingency-resolution.tsx`,
`app/contingencia/[token]/page.tsx`.

### US-35 — Mis Compras

| Evidencia | Archivo |
| --- | --- |
| Consulta acotada al usuario de la sesión, separación próximas/pasadas y DTO sin datos sensibles. | `features/purchase/history.test.ts` |
| Render de tarjetas, filas, alertas por contingencia y descargas ocultas para compras no confirmadas. | `features/purchase/components/purchase-history.test.tsx` |
| Acceso a `/cuenta`: rol pasajero, perfil, 403 para cuentas inactivas y datos del usuario autenticado. | `app/cuenta/[[...cuenta]]/page.test.tsx` |

Producción: `features/purchase/history.ts`,
`features/purchase/components/purchase-history.tsx`,
`features/purchase/components/purchase-card.tsx`,
`features/purchase/components/purchase-summary.tsx`,
`app/cuenta/[[...cuenta]]/page.tsx`.

### US-36 — Comprobantes PDF

| Evidencia | Archivo |
| --- | --- |
| Builders de e-tickets y factura, paginación, uso del vuelo de cada pasaje y exclusión de pasajes no `ISSUED`. | `features/purchase/documents.test.ts` |
| Autorización por sesión, titularidad, `409` para no confirmadas y respuestas de error. | `app/api/compras/[code]/downloads.test.ts` |
| Links internos, cantidad de pasajes, factura disponible y guardia `canDownload`. | `features/purchase/components/purchase-download-actions.test.tsx` |
| DTO de comprobantes con vuelo por pasaje, estado del pasaje y factura. | `features/purchase/queries.test.ts` |
| Página de comprobantes: comprador de la sesión, estado no disponible para reserva ajena, solo e-tickets `ISSUED` y metadatos. | `app/compra/comprobantes/page.test.tsx` |

Producción: `features/purchase/documents.ts`, `features/purchase/downloads.ts`,
`features/purchase/queries.ts`,
`app/api/compras/[code]/etickets/route.ts`,
`app/api/compras/[code]/factura/route.ts`,
`features/purchase/components/purchase-download-actions.tsx`,
`app/compra/comprobantes/page.tsx`.

### UX y regresiones

| Evidencia | Archivo |
| --- | --- |
| Tarjetas y filas sin botones, links de descarga internos y mensajes de estado. | `features/purchase/components/purchase-history.test.tsx`, `features/purchase/components/purchase-download-actions.test.tsx` |
| Intercambio de aeropuertos y estados hover/foco del buscador. | **Solo verificación manual** (componente cliente sin test automatizado). |

Producción: `features/flight-search/components/flight-search-form.tsx`,
`features/flight-search/components/flight-result-card.tsx`,
`features/purchase/components/purchase-card.tsx`,
`features/purchase/components/purchase-download-actions.tsx`.

## Comandos de verificación

Ejecutar desde `CodigoProyecto/volar`:

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

Resultado esperado: suite de Vitest completamente verde, ESLint sin errores ni
warnings, TypeScript sin errores, build de Next.js exitoso y `git diff --check`
sin salida. Al cierre de la revisión final del Sprint 3 la suite reportó
**40 archivos / 439 tests** en verde; el número puede crecer sin que esto
invalide el documento.

Los tests corren con `tests/prisma-mock.ts`, que sustituye Prisma por un
`DeepMockProxy`. No requieren PostgreSQL, Clerk ni SMTP reales.

## Checklist manual de E2E

Requiere una base migrada, variables de Clerk y (para los pasos de email) un
SMTP sandbox. Marcar cada punto antes de dar por cerrado el sprint.

- [ ] **Buscador (swap / hover / focus).** En `/vuelos`, el botón de intercambio
      cambia origen y destino y mantiene el formulario coherente. Con mouse, los
      campos y el botón muestran hover; con teclado, el foco es visible
      (`Tab`) y el botón se activa con `Enter`/`Space`.
- [ ] **Cancelación con email pendiente.** Como ADMIN, cancelar un vuelo con
      pasajes emitidos. Verificar en la base: un `FlightChange` `CANCELLATION`,
      una `TicketContingency` por pasaje y una `EmailNotification` `PENDING` por
      comprador. La compra afectada muestra la alerta en Mis Compras.
- [ ] **Despacho manual con SMTP sandbox.** Completar `SMTP_HOST`, `SMTP_PORT`,
      `SMTP_USER`, `SMTP_PASSWORD` y `MAIL_FROM` con el sandbox, ejecutar
      `$env:APP_URL="http://localhost:3000"; pnpm mail:send` y confirmar el
      resumen y la recepción en el sandbox. Repetir el comando: las filas ya
      enviadas no vuelven a salir. No hay worker ni cron en la aplicación: el
      comando se ejecuta a mano.
- [ ] **Enlace de contingencia.** Abrir el enlace recibido
      (`/contingencia/{token}`), que debe ser un segmento de ruta y no un
      `?token=`. El token da acceso sin sesión; un token inválido muestra el
      estado "no encontrado".
- [ ] **Reembolso.** Pulsar "Solicitar reembolso" y comprobar que **primero**
      aparece el diálogo de confirmación (el primer clic no reembolsa). Recién
      al confirmar, verificar el importe del pasaje, el estado `REFUNDED` del
      ticket, el `Refund` registrado y la liberación del cupo. Con dos tokens
      del mismo ticket, el segundo debe informar que ya fue resuelto y no debe
      crear otro `Refund`. Repetir la operación: se informa que ya fue resuelta.
- [ ] **Reprogramación.** Elegir un vuelo alternativo de la misma ruta y clase,
      confirmar el diálogo y verificar el nuevo asiento, el `Ticket.flightId`
      actualizado, la contingencia en `REBOOK` y el e-ticket nuevo al descargar.
      Un pasaje ya reembolsado no debe poder reprogramarse.
- [ ] **Historial solo del titular.** Con dos usuarios, cada uno ve únicamente
      sus compras en `/cuenta`. Forzar la URL de comprobantes de una reserva
      ajena muestra el estado "No encontramos esta reserva", igual que un
      código inexistente (la pantalla no revela si la reserva existe).
- [ ] **Ambos PDF.** Descargar e-tickets y factura desde Mis Compras y desde
      `/compra/comprobantes`. Los archivos abren, tienen los datos vigentes y
      no hay PDFs almacenados en el servidor.
- [ ] **Compra no confirmada.** Una reserva `PENDING_PAYMENT` o `CANCELLED` no
      muestra links de descarga y explica que la compra no está confirmada.
- [ ] **Mobile.** Revisar Mis Compras, comprobantes y contingencia a 320 px de
      ancho: sin scroll horizontal, textos sin solaparse y targets táctiles
      cómodos.

## Limitaciones conocidas

- **Sin E2E de navegador.** No hay Playwright ni otro runner de navegador. Los
  componentes se validan con `renderToString`; hover, foco, layout real y
  comportamiento de descarga del navegador son verificación manual.
- **Sin suite contra PostgreSQL real.** Toda la persistencia usa Prisma
  mockeado. Transacciones, bloqueos de fila, constraints y SQL real no están
  cubiertos por la suite automatizada.
- **SMTP simulado en tests.** `nodemailer` está mockeado; la entrega real solo
  se comprueba con el checklist manual y un sandbox.
- **Dispatcher probado a nivel unitario.** `dispatchPendingContingencyEmails`
  tiene cobertura de conteos y errores, pero no se ejecutó contra una base real
  dentro de la suite.
- **Despacho manual y acotado a contingencias.** `pnpm mail:send` se ejecuta a
  mano (o desde un cron externo) y consulta únicamente filas `PENDING` de tipo
  `FLIGHT_CANCELLATION` o `FLIGHT_SCHEDULE_CHANGE`. Las
  `REBOOKING_CONFIRMATION` que crea US-26 **no se envían en Sprint 3**: no
  tienen plantilla propia y no deben reutilizar la de contingencia. El dominio
  las registra en estado terminal `FAILED` con un `lastError` no secreto, para
  no dejar una fila `PENDING` invisible para siempre.
- **Sin bloqueo entre ejecuciones.** Dos instancias simultáneas de
  `pnpm mail:send` podrían tomar las mismas filas. Ejecutar una sola a la vez.
- **Reembolso simulado.** No hay devolución de dinero real ni integración con
  una pasarela. El importe reembolsado es el del pasaje y queda registrado,
  pero `gatewayRefundId` incluye un sufijo con `Date.now()`; es único, no
  determinista.

## Notas operativas

- El schema y las migraciones necesarias ya existían; **Sprint 3 no agrega
  migraciones**. Aplicar con `pnpm prisma migrate deploy`.
- Un fallo de SMTP deja las filas en `PENDING` (el transporte se crea antes de
  actualizar la base). Corregir la configuración y reintentar `pnpm mail:send`
  es seguro: solo se envían las pendientes.
- Un fallo de envío con el transporte ya creado marca la fila `FAILED`,
  incrementa `attempts` y guarda `lastError`; esas filas no se reintentan
  automáticamente y requieren revisión.
- Los PDF se generan en cada request desde la base; no hay almacenamiento ni
  limpieza de archivos.
- `pnpm seed:demo --clean` elimina solo los datos demo con IDs `SEED*`.
