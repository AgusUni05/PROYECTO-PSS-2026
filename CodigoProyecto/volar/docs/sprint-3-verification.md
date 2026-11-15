# Verificación del Sprint 3

Documento operativo del cierre del Sprint 3 de VolAR. Describe el alcance, la
evidencia automatizada disponible, los comandos de verificación y las pruebas
manuales que todavía requieren intervención humana. No contiene credenciales ni
datos personales.

## Alcance

| Historia | Criterio de aceptación |
| --- | --- |
| **US-24** | Al aprobarse un pago, la confirmación de compra se envía realmente al correo del comprador con los e-tickets y la factura adjuntos en PDF. El envío es best-effort: si falla, la compra sigue confirmada y la fila queda en el outbox para reintentarse con `pnpm mail:send`. |
| **US-25** | Un cambio de horario o una cancelación con pasajes emitidos registra `FlightChange`, una `TicketContingency` por pasaje con token único y una `EmailNotification` `PENDING` por comprador, con asunto y cuerpo acordes al tipo. El email enlaza a la ruta real `/contingencia/{token}`. El outbox (`FLIGHT_CANCELLATION`, `FLIGHT_SCHEDULE_CHANGE`) se despacha automáticamente al guardar la acción administrativa y `pnpm mail:send` queda como reintento; un envío exitoso pasa a `SENT`, un fallo a `FAILED`, y una fila sin cambio de vuelo o sin `bookingId` no se envía. Si la contingencia ya fue resuelta, se marca terminal con `lastError` para no quedar `PENDING` para siempre. |
| **US-26** | El pasajero resuelve la contingencia desde el enlace con token: reprogramación sin cargo a un vuelo futuro de la misma ruta y clase (con asiento y e-ticket nuevos) o reembolso simulado por el importe del pasaje, ambos con confirmación previa. La operación es atómica e idempotente, exige que el pasaje siga `ISSUED`, resuelve todos los tokens `PENDING` del mismo ticket y libera el cupo correspondiente una sola vez. |
| **US-35** | "Mis Compras" muestra próximos vuelos e historial del usuario de la sesión, con alertas de contingencias pendientes. Un usuario nunca ve compras de otro y la vista no genera scroll horizontal en mobile. |
| **US-36** | El comprador puede descargar e-tickets y factura fiscal en PDF generados al momento. Las rutas exigen sesión, verifican titularidad, responden `409` para compras no confirmadas y cada e-ticket usa el vuelo actual del pasaje. Solo se emiten pasajes `ISSUED`; los reembolsados no aparecen en el PDF ni en los conteos. La factura no cambia. |
| **UX** | Botón de intercambio de aeropuertos con hover/foco visibles, alertas de contingencia accionables, layout responsive de Mis Compras y descargas ocultas con explicación cuando la compra no está confirmada. |

## Matriz de evidencia

### US-24 — Confirmación de compra por email

| Evidencia | Archivo |
| --- | --- |
| El pago deja la confirmación en el outbox (`PENDING`, `attempts: 0`, sin `sentAt`) dentro de la transacción. | `features/purchase/issuance.test.ts`, `features/purchase/service.test.ts` |
| Envío real con adjuntos de e-tickets y factura, actualización a `SENT`/`FAILED` y omisión de filas ajenas. | `lib/mailer/purchase.test.ts` |
| Envío inmediato best-effort después de aprobar el pago y reintento manual. | `features/purchase/actions.ts`, `lib/mailer/dispatch.test.ts` |

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

### US-42 (opcional) — Búsqueda flexible ±3 días

| Evidencia | Archivo |
| --- | --- |
| Desplazamiento de fechas `YYYY-MM-DD` en UTC, con cambio de mes, año y bisiestos. | `lib/dates.test.ts` |
| Resumen por día: 7 días de -3 a +3, cantidad de vuelos, cupos, menor tarifa sin contar clases agotadas, "menor precio" en los días más baratos (todos si empatan, ninguno si todos cuestan igual) y días fuera del rango buscable. | `features/flight-search/flexible-dates.test.ts` |
| Una sola consulta del rango, recortada a hoy y al máximo buscable, filtrando con `isOnSale` (descarta vuelos agotados o ya partidos). | `features/flight-search/queries.test.ts` |
| Grilla: etiquetas de desplazamiento y fecha, links a la búsqueda del día, días no seleccionables y aviso sin alternativas. | `features/flight-search/components/flexible-dates-grid.test.tsx` |
| `/vuelos` solo consulta y muestra la grilla cuando la fecha exacta no tiene vuelos. | `app/vuelos/page.test.tsx` |

Producción: `lib/dates.ts`, `features/flight-search/flexible-dates.ts`,
`features/flight-search/queries.ts`,
`features/flight-search/components/flexible-dates-grid.tsx`,
`app/vuelos/page.tsx`.

### US-40 (opcional) — Catálogo maestro con autocompletado

| Evidencia | Archivo |
| --- | --- |
| Búsqueda por código, nombre o ciudad, sin mayúsculas ni tildes; etiqueta de cada sugerencia; cada extremo del trayecto oculta el aeropuerto elegido en el otro. | `features/airports/airport-search.test.ts` |
| Buscador accesible (`role="combobox"`, asociado a su label), arranca completado al editar y marca el error del formulario. | `features/airports/components/airport-combobox.test.tsx` |
| Origen y destino del trayecto usan el buscador, en alta y en edición. | `features/routes/components/route-form.test.tsx` |
| Capacidad total de la aeronave (Economy + Primera), con guion si falta una capacidad. | `features/flights/components/generate-flights-form.test.tsx` |

Producción: `features/airports/airport-search.ts`,
`features/airports/components/airport-combobox.tsx`,
`features/routes/components/route-form.tsx`,
`features/flights/components/generate-flights-form-sections.tsx`,
`features/flights/components/generate-flights-form.utils.ts`.

### US-43 (opcional) — Auditoría e historial de cambios sobre vuelos

| Evidencia | Archivo |
| --- | --- |
| Diferencias entre estados (solo los campos que cambian; en la creación, todos con `from: null`), formato de cada valor y hora argentina del evento. | `features/flights/audit.test.ts` |
| Un evento `CREATED` por vuelo generado, `UPDATED` con los valores anteriores y nuevos (también sin ventas y sin evento si no cambia nada o la edición no se aplica) y `CANCELLED` con motivo, puntual y por trayecto, siempre con el usuario que hizo la acción y dentro de la misma transacción. | `features/flights/service.test.ts` |
| Historial: quién creó el vuelo, usuario, fecha y hora, evento, valores anteriores y nuevos, motivo y aviso para vuelos sin eventos. | `features/flights/components/flight-audit-trail.test.tsx` |

Inmutabilidad: la aplicación solo inserta en `flight_audit_events` y la
migración `20261109120000_flight_audit_events` agrega un trigger que rechaza
cualquier `UPDATE` o `DELETE` sobre la tabla (también desde consultas manuales).

Producción: `prisma/schema.prisma` (`FlightAuditEvent`),
`prisma/migrations/20261109120000_flight_audit_events/migration.sql`,
`features/flights/audit.ts`, `features/flights/service.ts`,
`features/flights/queries.ts`,
`features/flights/components/flight-audit-trail.tsx`,
`features/flights/components/flight-table.tsx`,
`app/admin/vuelos/[id]/historial/page.tsx`.

### US-37 (opcional) — Selección de asiento en el mapa de la cabina

Paso 1 del check-in online (seleccion_asiento.html); el paso 2 es la
confirmación de la US-38. Usa la misma numeración que la emisión de la compra
(US-23): cada clase arranca en la fila 1.

| Evidencia | Archivo |
| --- | --- |
| Asientos de cada clase según la capacidad del vuelo (4 por fila en Primera, 6 en Economy), con la última fila incompleta. | `features/seats/cabin.test.ts` |
| Mapa: solo vuelos con la ventana de check-in abierta y pasajeros sin check-in, la clase comprada habilitada, la otra bloqueada y los ocupados de todo el vuelo. | `features/seats/queries.test.ts` |
| Cambio de asientos: titularidad por sesión, compra confirmada, pasajes del vuelo, sin check-in, ventana abierta y asiento de la clase; libera y asigna en una transacción que revalida todo, permite intercambiar asientos dentro de la reserva y, si otro comprador tomó el asiento, la restricción única lo bloquea sin cambiar nada. | `features/seats/service.test.ts`, `features/seats/actions.test.ts` |
| Pantalla: pasajeros, referencias, asientos libres, propios y ocupados, aviso de la otra clase, intercambio entre pasajeros y paso 1 de 2; Mis Compras entra al check-in por los asientos y el paso 2 permite volver a cambiarlos. | `features/seats/components/seat-map.test.tsx`, `features/seats/components/seat-map.utils.test.ts`, `app/compra/checkin/asientos/page.test.tsx`, `features/checkin/components/checkin-flight-card.test.tsx`, `features/purchase/components/purchase-history.test.tsx` |

Producción: `features/seats/` (`cabin.ts`, `queries.ts`, `schema.ts`,
`service.ts`, `actions.ts`, `components/`), `app/compra/checkin/asientos/page.tsx`,
`features/checkin/components/checkin-flight-card.tsx`,
`features/checkin/components/checkin-flight-header.tsx`,
`features/purchase/components/purchase-checkin-status.tsx`. Sin migración.

### US-38 (opcional) — Check-in online y tarjeta de embarque

| Evidencia | Archivo |
| --- | --- |
| Ventana: abre 24 h antes de la salida (inclusive) y cierra a la hora de embarque, 40 min antes (exclusive); rango de salidas equivalente para filtrar en la base. | `features/checkin/window.test.ts` |
| Check-in por pasajero: titularidad por sesión, compra confirmada, pasajes de la reserva, emitidos, vuelo programado y ventana abierta; revalidación al escribir, sin dejarlo a medias; idempotente. | `features/checkin/service.test.ts` |
| Acción: sesión activa, declaración de mercancías peligrosas obligatoria, al menos un pasajero, ids válidos y refresco de pantallas. | `features/checkin/actions.test.ts` |
| Pantalla: agrupación por vuelo actual, estado de cada ventana, vuelo cancelado no disponible; tarjeta con formulario, "Check-in hecho", aviso de apertura o cierre. | `features/checkin/queries.test.ts`, `features/checkin/components/checkin-flight-card.test.tsx`, `app/compra/checkin/page.test.tsx` |
| Tarjeta de embarque en PDF: una por pasajero con check-in y pasaje emitido, hora de embarque, sin importes; descarga autorizada como e-tickets y factura. | `features/purchase/documents.test.ts`, `app/api/compras/[code]/downloads.test.ts`, `features/purchase/queries.test.ts` |
| Mis Compras: estado del check-in de cada vuelo próximo; reprogramar un pasaje (US-26) borra su check-in. | `features/purchase/history.test.ts`, `features/purchase/components/purchase-history.test.tsx`, `features/flights/contingency-resolution.test.ts` |

Migración: `20261114120000_ticket_checkin` agrega la columna opcional
`tickets.checkedInAt`. Tiene que estar aplicada (`pnpm prisma migrate deploy`)
antes de publicar el código.

Producción: `features/checkin/` (`window.ts`, `service.ts`, `queries.ts`,
`schema.ts`, `actions.ts`, `components/`), `app/compra/checkin/page.tsx`,
`app/api/compras/[code]/tarjetas-embarque/route.ts`,
`features/purchase/documents.ts`, `features/purchase/downloads.ts`,
`features/purchase/history.ts`,
`features/purchase/components/purchase-checkin-status.tsx`,
`features/flights/contingency-resolution.ts`.

### US-39 (opcional) — Cambio o cancelación a pedido del pasajero

Ambas operaciones son sobre la reserva completa y aplican la política de
penalidades por anticipación (cambio_cancelacion_pasajero.html).

| Evidencia | Archivo |
| --- | --- |
| Política de penalidades: más de 48 h retiene 20 %, entre 24 y 48 h (inclusive) 35 %, menos de 24 h 50 %; vuelo ya salido no se cancela; retención redondeada al centavo y reintegro exacto. | `features/cancellation/policy.test.ts` |
| Liquidación por pasaje con el tramo de su vuelo actual y totales; bloqueos por compra no confirmada, sin pasajes, contingencia pendiente o vuelo salido. | `features/cancellation/quote.test.ts`, `features/cancellation/queries.test.ts` |
| Cancelación: reserva cancelada, pasajes reembolsados con el asiento liberado, un `Refund` por pasaje con motivo y retención, cupo devuelto por vuelo y clase, revalidación al escribir y sin cambios si algo cambió. | `features/cancellation/service.test.ts` |
| Acción y pantalla: sesión, motivo de la lista, confirmación de que es irreversible, titularidad, derivación a la opción gratuita ante una contingencia, liquidación y formulario. | `features/cancellation/actions.test.ts`, `features/cancellation/components/cancellation.test.tsx`, `app/compra/cancelar/page.test.tsx` |
| Mis Compras: "Cambiar fecha" y "Cancelar reserva" en compras próximas sin contingencias y "Cancelada por el pasajero" con motivo, reintegro y retención en el historial. | `features/purchase/history.test.ts`, `features/purchase/components/purchase-history.test.tsx` |
| Cambio de fecha: penalidad de 15 %, 25 % o 35 % sobre lo abonado más la diferencia de tarifa (sin devolución si el vuelo nuevo es más barato), con el ejemplo del wireframe. | `features/cancellation/policy.test.ts`, `features/date-change/quote.test.ts` |
| Vuelos elegibles: misma ruta, a la venta, distintos del actual y con cupo para todos; solo los 10 más próximos. | `features/date-change/queries.test.ts` |
| Cambio: pago rechazado registrado sin cambiar la reserva; pago aprobado que toma el cupo nuevo, libera el anterior y reemite los e-tickets con vuelo, asiento, número y precio nuevos, borrando el check-in del vuelo anterior (US-38); sin cobro si algo cambió al escribir. | `features/date-change/service.test.ts` |
| Acción y pantalla del cambio: sesión, datos de tarjeta, aceptación de la política, lista de vuelos que lleva al desglose, desglose y pago. | `features/date-change/actions.test.ts`, `features/date-change/components/change.test.tsx`, `app/compra/cambiar/page.test.tsx` |

Migración: `20261114130000_refund_voluntary_cancellation` agrega las columnas
opcionales `refunds.reason` y `refunds.penaltyAmount`. Tiene que estar aplicada
(`pnpm prisma migrate deploy`) antes de publicar el código.

Producción: `features/cancellation/` (`policy.ts`, `quote.ts`, `queries.ts`,
`service.ts`, `schema.ts`, `actions.ts`, `format.ts`, `components/`),
`app/compra/cancelar/page.tsx`, `features/flights/volar-pay-gateway.ts`,
`features/date-change/` (`quote.ts`, `queries.ts`, `service.ts`, `schema.ts`,
`actions.ts`, `components/`), `app/compra/cambiar/page.tsx`,
`features/purchase/service.ts` (exporta la pasarela simulada),
`features/purchase/history.ts`, `features/purchase/components/purchase-card.tsx`,
`features/purchase/components/purchase-history.tsx`.

### US-41 (opcional) — Equipaje adicional en el check-in

Paso opcional del check-in (`/compra/checkin/equipaje`), antes de confirmarlo.
Precio fijo de $ 45.000 por valija y hasta 3 adicionales por pasajero
(`features/baggage/pricing.ts`).

| Evidencia | Archivo |
| --- | --- |
| Datos: al menos una valija, hasta 3 por pasajero, sin pasajeros repetidos y los datos de tarjeta de la compra. | `features/baggage/schema.test.ts` |
| Compra: titularidad por sesión, pasajes de la reserva, ventana abierta, pasajero sin check-in confirmado y tope contando las ya compradas; pago rechazado registrado sin cambios; pago aprobado que suma las valijas al pasaje, registra el `Payment` y agrega a la factura un ítem por pasajero (cantidad, precio unitario e importe) sumando el total; sin cobro si algo cambió al escribir (doble envío, check-in). | `features/baggage/service.test.ts` |

Migración: `20261115120000_ticket_extra_bags` agrega `tickets.extraBags`
(entero, por defecto 0). Tiene que estar aplicada (`pnpm prisma migrate
deploy`) antes de publicar el código.

Producción: `features/baggage/` (`pricing.ts`, `schema.ts`, `service.ts`,
`actions.ts`, `components/baggage-form.tsx`),
`app/compra/checkin/equipaje/page.tsx`, `features/checkin/queries.ts`,
`features/checkin/components/checkin-flight-card.tsx`,
`features/checkin/components/checkin-form.tsx`.

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
**42 archivos / 458 tests** en verde; el número puede crecer sin que esto
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
- [ ] **Confirmación de compra.** Aprobar un pago de prueba y verificar que
      llega un correo al `contactEmail` de la reserva con los e-tickets y la
      factura adjuntos. Si SMTP falla, la compra debe seguir `CONFIRMED` y la
      fila `PURCHASE_CONFIRMATION` debe quedar `PENDING`/`FAILED`; un
      `pnpm mail:send` posterior debe enviarla.
- [ ] **Despacho manual con SMTP sandbox.** Completar `SMTP_HOST`, `SMTP_PORT`,
      `SMTP_USER`, `SMTP_PASSWORD` y `MAIL_FROM` con el sandbox, ejecutar
      `$env:APP_URL="http://localhost:3000"; pnpm mail:send` y confirmar las dos
      líneas del resumen (contingencias y compras) y la recepción en el
      sandbox. Repetir el comando: las filas ya enviadas no vuelven a salir. No
      hay worker ni cron en la aplicación: el comando se ejecuta a mano.
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
- [ ] **Fechas cercanas (US-42).** En `/vuelos`, buscar un trayecto en un día
      sin frecuencia: debajo del aviso "No encontramos vuelos" aparece la grilla
      de 7 días (-3 a +3) con la tarifa más baja, vuelos y cupos de cada día, y
      "Menor precio" en el o los más baratos (ninguno si todos cuestan igual). Un clic en un día con vuelos muestra sus
      tarjetas; los días sin vuelos o anteriores a hoy no se pueden elegir. Con
      vuelos en la fecha exacta, la grilla no aparece. A 320 px la grilla queda
      en 2 columnas sin scroll horizontal.
- [ ] **Autocompletado de aeropuertos (US-40).** Como ADMIN, en
      `/admin/trayectos` tipear en Origen "eze", "cordoba" (sin tilde) o parte
      del nombre del aeropuerto: las sugerencias muestran código, nombre y
      ciudad; sin coincidencias aparece "No hay aeropuertos que coincidan". Se
      elige con el mouse o con flechas + Enter. El destino no ofrece el
      aeropuerto elegido como origen (y al revés). "Limpiar Campos" vacía ambos
      buscadores y "Editar" los abre completados. A 320 px no hay scroll
      horizontal.
- [ ] **Capacidad total (US-40).** En `/admin/vuelos`, al elegir un avión se
      precargan Economy y Primera y se muestra la capacidad total; editar una
      capacidad actualiza el total y vaciarla muestra "—".
- [ ] **Auditoría de vuelos (US-43).** Con la migración aplicada, como ADMIN
      generar vuelos en `/admin/vuelos` y abrir "Historial" de uno: aparece un
      evento "Creación" con el usuario, fecha y hora y los valores iniciales.
      Editar la tarifa y el horario: aparece una "Modificación" con solo esos
      campos, tachando el valor anterior. Guardar sin cambios no agrega eventos.
      Cancelar el vuelo: aparece la "Cancelación" con el motivo. El link
      "Historial" está también en vuelos cancelados y completados. En la base,
      un `UPDATE` o `DELETE` sobre `flight_audit_events` falla con
      "flight_audit_events es inmutable". A 320 px la tabla scrollea dentro de
      su contenedor, sin scroll horizontal de la página.
- [ ] **Selección de asiento (US-37).** Con la ventana de check-in abierta,
      "Hacer check-in" en Mis Compras abre el paso 1 con el mapa de la clase
      comprada y la otra clase bloqueada. Elegir un pasajero y tocar un asiento
      libre lo asigna; tocar el asiento de otro pasajero de la reserva los
      intercambia; los ocupados no se pueden tocar. "Confirmar asientos y
      continuar al check-in" guarda y pasa al paso 2, donde el asiento nuevo
      figura en la lista y "Cambiar asientos" vuelve al mapa. Después del
      check-in el asiento queda fijo y la tarjeta de embarque lo muestra. A
      320 px no hay scroll horizontal de la página.
- [ ] **Check-in online (US-38).** Con la migración aplicada y una cuenta
      pasajero con un pasaje emitido: más de 24 h antes de la salida, Mis
      Compras muestra "Check-in online desde el …" y la pantalla de check-in
      avisa cuándo se habilita, sin formulario. Dentro de la ventana, "Hacer
      check-in" abre la pantalla con los pasajeros marcados; sin la declaración
      de mercancías peligrosas el botón queda deshabilitado. Al confirmar, el
      vuelo muestra "Todos los pasajeros de este vuelo ya hicieron el
      check-in" (si solo lo hicieron algunos, esos figuran "Check-in hecho"),
      Mis Compras pasa a "Ver tarjetas de embarque" y se descargan las
      tarjetas de embarque en PDF (una por pasajero, con la hora de embarque y
      sin importes). Antes del check-in la descarga responde 404 y sin sesión,
      401. Después de la
      hora de embarque, "El check-in de este vuelo cerró". A 320 px no hay
      scroll horizontal.
- [ ] **Cancelación voluntaria (US-39).** Con la migración aplicada y una
      cuenta pasajero con una compra próxima confirmada: "Cancelar reserva"
      abre la liquidación con cada pasaje, su tramo y retención, el medio de
      acreditación y el neto a reembolsar. El botón queda deshabilitado hasta
      elegir el motivo y aceptar que es irreversible; el diálogo permite
      "Conservar mi reserva". Al confirmar, la compra pasa al historial como
      "Cancelada por el pasajero" con el reintegro y la retención, y el cupo y
      los asientos del vuelo quedan libres. Con una contingencia pendiente no
      se ofrece la cancelación con penalidad. A 320 px no hay scroll
      horizontal.
- [ ] **Cambio voluntario de fecha (US-39).** "Cambiar fecha" lista hasta 10
      vuelos próximos de la misma ruta. Al elegir uno, la pantalla baja sola
      hasta el desglose (en mobile queda debajo de la lista), que muestra el
      crédito por lo abonado, el costo del vuelo nuevo, la diferencia de tarifa
      (cero si es más barato), la penalidad del tramo y el adicional. El pago queda
      deshabilitado hasta aceptar la política. Con una tarjeta terminada en
      número impar el pago se rechaza y la reserva no cambia; con una en número
      par, Mis Compras muestra el vuelo nuevo con asiento y e-ticket nuevos, y
      el cupo pasa del vuelo viejo al nuevo. A 320 px no hay scroll horizontal.

- [ ] **Equipaje adicional (US-41).** Con la migración aplicada y la ventana de
      check-in abierta, "Agregar equipaje" abre la pantalla con los pasajeros
      que todavía no hicieron el check-in. El total se actualiza al sumar o
      quitar valijas (máximo 3 por pasajero) y el pago aparece solo con al menos
      una valija. Con una tarjeta terminada en número impar el pago se rechaza
      y no cambia nada; con una en número par vuelve al check-in, donde el
      pasajero muestra "+N valijas", y la factura (pantalla y PDF) suma una
      línea "Equipaje adicional en bodega" por pasajero con el total
      actualizado. A 320 px no hay scroll horizontal.
## Limitaciones conocidas

- **Asientos repetidos entre clases (bug conocido, sin corregir).** Primera y
  Economy numeran desde la fila 1 y la emisión de la compra (US-23), la
  reprogramación (US-26) y el cambio de fecha (US-39) solo miran los asientos
  ocupados de la misma clase,
  pero el asiento es único por vuelo: en un vuelo con un pasaje de Primera en
  el 1A, la próxima compra de Economy recibiría el 1A y la base la rechazaría.
  El mapa de la US-37 lo evita en la elección manual marcando como ocupados
  los asientos de todo el vuelo.
- **Sin E2E de navegador.** No hay Playwright ni otro runner de navegador. Los
  componentes se validan con `renderToString`; hover, foco, layout real y
  comportamiento de descarga del navegador son verificación manual.
- **Sin suite contra PostgreSQL real.** Toda la persistencia usa Prisma
  mockeado. Transacciones, bloqueos de fila, constraints y SQL real no están
  cubiertos por la suite automatizada.
- **SMTP simulado en tests.** `nodemailer` está mockeado; la entrega real solo
  se comprueba con el checklist manual y un sandbox.
- **Dispatchers probados a nivel unitario.** `dispatchPendingContingencyEmails`
  y `dispatchPendingPurchaseEmails` tienen cobertura de conteos y errores, pero
  no se ejecutaron contra una base real dentro de la suite.
- **Despacho automático con reintento manual.** La confirmación de compra se
  intenta enviar al aprobar el pago y el outbox de contingencias se intenta
  enviar al guardar el cambio o la cancelación. Si algo falla, `pnpm mail:send`
  procesa tanto contingencias como confirmaciones de compra pendientes. Las
  `REBOOKING_CONFIRMATION` que crea US-26 **no se envían en Sprint 3**: no
  tienen plantilla propia y no deben reutilizar la de contingencia. El dominio
  las registra en estado terminal `FAILED` con un `lastError` no secreto, para
  no dejar una fila `PENDING` invisible para siempre.
- **Sin bloqueo entre ejecuciones.** Dos instancias simultáneas de
  `pnpm mail:send` podrían tomar las mismas filas. Ejecutar una sola a la vez.
- **Auditoría desde US-43.** Los vuelos generados antes de aplicar la
  migración no tienen evento "Creación" (el historial igual muestra quién los
  creó, desde `Flight.createdBy`); sus cambios posteriores sí se registran.
  Las reprogramaciones y reembolsos de pasajeros (US-26) no se auditan: solo
  cambian la ocupación, no los datos del vuelo.
- **`seed:demo --clean` con vuelo auditado.** Si se edita o cancela el vuelo
  demo desde el panel, su historial no se puede borrar (es inmutable) y el
  `--clean` falla al eliminar ese vuelo.
- **Reembolso simulado.** No hay devolución de dinero real ni integración con
  una pasarela. El importe reembolsado es el del pasaje y queda registrado,
  pero `gatewayRefundId` incluye un sufijo con `Date.now()`; es único, no
  determinista.
- **Equipaje adicional fuera de las cancelaciones (US-41).** La cancelación
  voluntaria (US-39) y el reembolso por contingencia (US-26) liquidan solo el
  pasaje; las valijas adicionales no se reembolsan. Tampoco se pueden agregar
  después de confirmar el check-in.

## Notas operativas

- Las historias obligatorias del Sprint 3 no agregan migraciones. **US-43
  agrega `20261109120000_flight_audit_events`** (tabla, enum y trigger de
  inmutabilidad). Aplicar con `pnpm prisma migrate deploy`.
- Un fallo de SMTP deja las filas en `PENDING` (el transporte se crea antes de
  actualizar la base). Corregir la configuración y reintentar `pnpm mail:send`
  es seguro: solo se envían las pendientes.
- Un fallo de envío con el transporte ya creado marca la fila `FAILED`,
  incrementa `attempts` y guarda `lastError`. Las confirmaciones de compra
  `FAILED` se reintentan con `pnpm mail:send` hasta 5 intentos; las
  contingencias `FAILED` requieren revisión manual.
- Los PDF se generan en cada request desde la base; no hay almacenamiento ni
  limpieza de archivos.
- `pnpm seed:demo --clean` elimina solo los datos demo con IDs `SEED*`.
