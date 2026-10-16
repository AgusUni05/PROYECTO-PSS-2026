# Sistema médico — Wireframes

## 0. Research Log
- Referencia existente (retirada): `wireframes/wf_busqueda_turnos.html` cubría US-12 por separado. US-12 se redefinió dentro de US-10, así que su esquema de filtros y resultados se fusionó en `wf_agenda_paciente.html` y el archivo suelto se borró.
- Lanes no ejecutadas: no se realizó investigación de marcas ni prototipado visual porque el pedido es un esquema conceptual interno, no una interfaz final.

## 0.1 Versión 6 — alcance y asignación

El equipo implementador adoptó la regla de que **cada User Story la ejecuta un único integrante**. Con el Sprint 3 refinado el alcance comprometido queda completo: **35 User Stories y 93 puntos** repartidos en tres sprints (incluidas las reservas de bugs). Cada pantalla tiene un dueño, indicado al pie.

| Pantalla | US | Sprint | Dueño | Estado |
|---|---|---|---|---|
| `wf_registro_paciente.html` | US-01 | 1 | I1 | Bloque de obra social (entidad, plan, número de afiliado, opción «sin cobertura / particular») y rol inicial *Usuario*. |
| `wf_mis_datos.html` | US-01 | 1 | I1 | Pasó a ser «Mi cuenta»: US-05 quedó unificada en US-01. Cobertura editable y campos no editables separados. |
| `wf_inicio_sesion.html` | US-02 | 1 | I2 | Sin cambios de contenido. |
| `wf_gestion_usuarios_internos.html` | US-03 | 1 | I2 | Rol asignado en el alta y especialidad para el rol Médico. |
| `wf_carga_disponibilidad_mensual.html` | US-06 | 1 | I5 | Validación de «exactamente 2 jornadas» a «entre 2 y 7» (RN-02), con contador por semana y los dos estados de error. Sin selector de duración: son 30 minutos fijos (RN-09). |
| `wf_agenda_generada.html` | US-08 | 1 | I3 | Acotada a US-08. La prevención de solapamientos (antigua US-09 / RF-AGE-07) fue retirada por el cliente. |
| `wf_agenda_profesional.html` | US-11 | 1 | I4 | Las tres vistas (diaria, semanal, mensual) que pide RF-AGE-05. El bloqueo de franjas vive en `wf_bloqueo_franja.html` (US-30). |
| `wf_agenda_paciente.html` | US-10 | 2 | I3, I4, I2 | **Redefinida.** Absorbe la búsqueda por especialidad, profesional y rango de fechas que antes era US-12 (2 → 4 puntos, dueño único → trío). Ya no es solo lectura: el botón «Reservar» abre US-13. |
| `wf_reserva_turno.html` | US-13 | 2 | I2, I5, I4 | **Nueva, redefinida.** Absorbe el control de concurrencia que antes era US-20 (3 → 5 puntos, pareja → trío). Incluye el estado de error cuando otro paciente reserva primero. |
| `wf_reserva_terceros.html` | US-64 | 2 | I2 | **Nueva.** Paso adicional del flujo de reserva para cargar los datos y la obra social de la persona atendida. |
| `wf_cancelacion_turno.html` | US-16 | 2 | I4 | **Nueva.** Listado de turnos, confirmación previa, estado tras cancelar y el caso fuera del plazo mínimo. |
| `wf_estado_turno.html` | US-18 | 2 | I1 | **Nueva.** Vista de mostrador/consultorio para marcar cumplido o ausente, con su registro de auditoría. |
| `wf_catalogo_vacunas.html` | US-24 | 2 | I1 | **Nueva.** Alta, edición y desactivación de vacunas (denominación, laboratorio, esquema de dosis). |
| `wf_servicio_email.html` | US-21 | 2 | I1 | **Nueva.** Dejó de ser infraestructura sin pantalla: el administrador edita solo el mensaje de cada plantilla (asunto y destinatarios no editables) y define la cantidad máxima de envíos fallidos que se le admite a un mismo usuario. |
| `wf_agenda_vacunatorio.html` | US-63 | 3 | I5, I1 | **Nueva.** Agenda mensual del vacunatorio, independiente de las médicas: la enfermera carga días y franjas y el sistema publica los turnos de 30 minutos. |
| `wf_turno_vacunacion.html` | US-28 | 3 | I5, I3 | **Nueva.** Turno de vacunación desde mostrador: vacuna, horario del vacunatorio y confirmación por email; puede convivir con un turno médico a la misma hora. |
| `wf_dosis_aplicada.html` | US-29 | 3 | I4 | **Nueva.** Registro de la dosis aplicada (paciente, vacuna, dosis, fecha y hora, enfermera del usuario autenticado) y anulación con motivo. |
| `wf_carnet_vacunacion.html` | US-57 | 3 | I3 | **Nueva.** Carnet de vacunación en PDF con las aplicaciones de la sala y el aviso de esquema incompleto. |
| `wf_cobertura_medica.html` | US-32 | 3 | I1 | **Nueva.** Cobertura del paciente y listado de obras sociales administrado por el administrador; plan y número de afiliado declarativos, sin efecto en el precio. |
| `wf_costo_consulta.html` | US-33 | 3 | I5 | **Actualizada.** Precio de la consulta por obra social (particular incluido) definido por cada médico, con historial de vigencias. |
| `wf_calculo_importe.html` | US-34 | 3 | I1, I2 | **Nueva.** Desglose del importe por la obra social de la persona atendida con el precio vigente a la fecha; sin precio configurado no se cierra el cobro. |
| `wf_registro_pago.html` | US-35 | 3 | I2 | **Nueva.** Pago en efectivo (solo administrativo) o por transferencia con referencia; un único pago activo por turno cumplido. |
| `wf_comprobante.html` | US-36 | 3 | I2 | **Nueva.** Comprobante en PDF con numeración correlativa, disponible para titular, reservante y administrativo. |
| `wf_reporte_pagos.html` | US-47 | 3 | I2 | **Nueva.** Pagos por período, medio y obra social, con los anulados identificados sin sumar. |
| `wf_ficha_diagnostico.html` | US-39 | 3 | I3, I4 | **Nueva.** Entrada de la ficha sobre turno cumplido; edición solo del autor y solo el día de la consulta, con fecha y hora de última edición. |
| `wf_ficha_consolidada.html` | US-40 | 3 | I3 | **Nueva.** Fichas de todos los médicos con autor y especialidad; la propia se edita durante el día de la consulta, las demás en modo lectura. |
| `wf_historial_paciente.html` | US-41 | 3 | I4 | **Nueva.** Historial clínico de solo lectura para el paciente, con descarga en PDF. |
| `wf_auditoria_accesos.html` | US-44 | 3 | I4 | **Nueva.** Auditoría de accesos al historial —exitosos y rechazados— de solo lectura para el administrador. |
| `wf_adjuntos_estudios.html` | US-62 | 3 | I3, I2 | **Nueva.** Adjuntar imágenes o PDF a una entrada de la ficha, con tamaño máximo configurable. |
| `wf_bloqueo_franja.html` | US-30 | 3 | I5 | **Nueva.** Bloqueo de los turnos libres de una franja publicada, con los ya reservados listados aparte; reversible. |
| `wf_aviso_bloqueo.html` | US-22 | 3 | I3 | **Nueva.** Pacientes a contactar tras un bloqueo y modelo del email de aviso; no modifica reservas. |
| `wf_mostrador.html` | US-17 | 3 | I5, I4 | **Nueva.** Gestión de turnos desde mostrador (médicos y de vacunación), alta de paciente en el flujo y reprogramación como cancelar + reservar. |
| `wf_reporte_turnos.html` | US-45 | 3 | I4 | **Nueva.** Totales y desglose por especialidad y profesional con rango de fechas y gráfico; incluye exportación. |
| `wf_reporte_ausentismo.html` | US-48 | 3 | I1 | **Nueva.** Ausentismo sobre turnos reservados por profesional, especialidad, tipo y día, y pacientes con más ausencias; incluye exportación. |
| `wf_acceso_denegado.html` | — | 1 a 3 | — | Estado transversal de RNF-03, verificado dentro de cada historia según la condición 6 de la definición de terminado. |

US-21 (servicio de envío de email) ahora tiene pantalla propia (`wf_servicio_email.html`): edición del mensaje de las plantillas y configuración del límite de envíos fallidos por usuario. US-14 (confirmación por email) y US-15 (recordatorio por email) siguen sin pantalla propia: usan las plantillas que administra US-21, pero su disparo es infraestructura.

### Refinamiento del Sprint 3

Las 20 historias del Sprint 3 (US-63, US-33, US-32, US-39, US-45, US-48, US-30, US-28, US-34, US-22, US-40, US-41, US-62, US-29, US-17, US-35, US-44, US-57, US-36 y US-47) ya tienen wireframe y entran al refinement con esquema. US-49 (filtros comunes) y US-50 (exportación) se retiraron como historias propias: quedan como requerimiento especial incluido en la implementación de los reportes (RF-REP-05 y RF-REP-06).

### Fuera del alcance, sin wireframe

Solo la aplicación móvil (cubierta por RNF-08, sin pantalla propia) y la recuperación de contraseña. Los filtros comunes y la exportación de reportes no tienen pantalla propia: viven dentro de los reportes (US-45, US-47 y US-48).

### Advertencia de cronograma

El plan vigente (ProjectLibre, `AuraHealth_v7.xml`) cierra el proyecto el día 32,8 de los 26 disponibles con la capacidad asumida (2,65 h por integrante por día): faltan 6,8 días. El equipo trabaja sobre las palancas de ajuste y estos wireframes describen el alcance comprometido.

## 1. Atmosphere & Identity
Herramienta operativa, clara y confiable para una sala médica. La firma visual es un plano de trabajo con bordes visibles, bloques numerados y jerarquía explícita para que el equipo implementador pueda identificar cada decisión sin confundirla con diseño visual definitivo.

## 2. Color
| Rol | Token | Valor | Uso |
|---|---|---|---|
| Fondo | `--surface` | `#ffffff` | Página |
| Relleno | `--fill` | `#f2f4f7` | Placeholders y controles secundarios |
| Relleno fuerte | `--fill-strong` | `#e3e7ec` | Marca, avatar y estados neutros |
| Texto | `--ink` | `#1c1f24` | Títulos y contenido |
| Texto secundario | `--muted` | `#6b7280` | Ayudas y metadatos |
| Borde | `--border` | `#9aa1ab` | Contenedores |
| Borde suave | `--border-light` | `#c7ccd3` | Separadores |
| Acción | `--accent` | `#4373c9` | Acción principal y foco |
| Error | `--error` | `#a33a3a` | Validaciones conceptuales |

## 3. Typography
- Principal: `Segoe UI`, `Helvetica Neue`, Arial, sans-serif.
- Escala: títulos 24–28px, subtítulos 14–16px, cuerpo 13–14px, etiquetas 11–12px.
- La escala es deliberadamente contenida para priorizar lectura del esquema.

## 4. Spacing & Layout
- Base: 4px; separación habitual 8, 12, 16, 22 y 32px.
- Contenedor máximo: 980px.
- Breakpoint: 680px; los grids de formularios pasan a una o dos columnas.

## 5. Components
### Bloque de wireframe
- Borde de 2px, título de sección, número de referencia y contenido agrupado.
- Estados: normal, advertencia, error y vacío cuando aportan contexto.

### Campo y botón
- Etiqueta sobre el control; botones con acción primaria azul o secundaria gris.
- Estados esperados para Comisión 5: foco visible, deshabilitado, error inline y confirmación.

### Navegación superior
- Marca esquemática, enlaces de módulo y usuario actual.
- En las pantallas sin sesión se reemplaza por una cabecera simple.

## 6. Motion & Interaction
Los wireframes no implementan lógica de negocio ni animaciones. Los enlaces entre pantallas permiten recorrer el flujo. La implementación deberá agregar estados de foco, validación y confirmación respetando `prefers-reduced-motion`.

## 7. Depth & Surface
Estrategia `borders-only`: los contenedores se separan por bordes, rellenos suaves y espacio; no se usan sombras para no sugerir una decisión visual final.

## 8. Accessibility Constraints & Accepted Debt
- HTML semántico, `lang="es"`, etiquetas sobre campos, foco visible y contraste AA como objetivo.
- Deuda aceptada: controles representados como datos estáticos y enlaces de demostración; la Comisión 5 definirá persistencia, validación y permisos.
