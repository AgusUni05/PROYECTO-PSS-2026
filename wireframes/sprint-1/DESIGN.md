# Sistema médico — Wireframes

## 0. Research Log
- Referencia existente (retirada): `wireframes/wf_busqueda_turnos.html` cubría US-12 por separado. US-12 se redefinió dentro de US-10, así que su esquema de filtros y resultados se fusionó en `wf_agenda_paciente.html` y el archivo suelto se borró.
- Lanes no ejecutadas: no se realizó investigación de marcas ni prototipado visual porque el pedido es un esquema conceptual interno, no una interfaz final.

## 0.1 Versión 5 — alcance y asignación

El equipo implementador adoptó la regla de que **cada User Story la ejecuta un único integrante**. El alcance no cambió respecto de la versión anterior: siguen siendo **27 User Stories y 73 puntos** repartidos en tres sprints. Lo que cambió es que cada pantalla tiene un dueño, indicado al pie.

| Pantalla | US | Sprint | Dueño | Estado |
|---|---|---|---|---|
| `wf_registro_paciente.html` | US-01 | 1 | I1 | Bloque de obra social (entidad, plan, número de afiliado, opción «sin cobertura / particular») y rol inicial *Usuario*. |
| `wf_mis_datos.html` | US-01 | 1 | I1 | Pasó a ser «Mi cuenta»: US-05 quedó unificada en US-01. Cobertura editable y campos no editables separados. |
| `wf_inicio_sesion.html` | US-02 | 1 | I2 | Sin cambios de contenido. |
| `wf_gestion_usuarios_internos.html` | US-03 | 1 | I2 | Rol asignado en el alta y especialidad para el rol Médico. |
| `wf_carga_disponibilidad_mensual.html` | US-06 | 1 | I5 | Validación de «exactamente 2 jornadas» a «entre 2 y 7» (RN-02), con contador por semana y los dos estados de error. Sin selector de duración: son 30 minutos fijos (RN-09). |
| `wf_agenda_generada.html` | US-08 | 1 | I3 | Acotada a US-08. La prevención de solapamientos (antigua US-09 / RF-AGE-07) fue retirada por el cliente. |
| `wf_agenda_profesional.html` | US-11 | 1 | I4 | Sin el estado «bloqueado», que corresponde a US-30, fuera del alcance. Las tres vistas (diaria, semanal, mensual) que pide RF-AGE-05. |
| `wf_agenda_paciente.html` | US-10 | 2 | I3, I4, I2 | **Redefinida.** Absorbe la búsqueda por especialidad, profesional y rango de fechas que antes era US-12 (2 → 4 puntos, dueño único → trío). Ya no es solo lectura: el botón «Reservar» abre US-13. |
| `wf_reserva_turno.html` | US-13 | 2 | I2, I5, I4 | **Nueva, redefinida.** Absorbe el control de concurrencia que antes era US-20 (3 → 5 puntos, pareja → trío). Incluye el estado de error cuando otro paciente reserva primero. |
| `wf_reserva_terceros.html` | US-64 | 2 | I2 | **Nueva.** Paso adicional del flujo de reserva para cargar los datos y la obra social de la persona atendida. |
| `wf_cancelacion_turno.html` | US-16 | 2 | I4 | **Nueva.** Listado de turnos, confirmación previa, estado tras cancelar y el caso fuera del plazo mínimo. |
| `wf_estado_turno.html` | US-18 | 2 | I1 | **Nueva.** Vista de mostrador/consultorio para marcar cumplido o ausente, con su registro de auditoría. |
| `wf_catalogo_vacunas.html` | US-24 | 2 | I1 | **Nueva.** Alta, edición y desactivación de vacunas (denominación, laboratorio, esquema de dosis). |
| `wf_servicio_email.html` | US-21 | 2 | I1 | **Nueva.** Dejó de ser infraestructura sin pantalla: el administrador edita solo el mensaje de cada plantilla (asunto y destinatarios no editables) y define la cantidad máxima de envíos fallidos que se le admite a un mismo usuario. |
| `wf_costo_consulta.html` | US-33 | 3 | I5 | **Nueva.** Costo de la consulta definido por cada médico, con historial de vigencias. |
| `wf_acceso_denegado.html` | — | 1 a 3 | — | Estado transversal de RNF-03, verificado dentro de cada historia según la condición 6 de la definición de terminado. |

US-21 (servicio de envío de email) ahora tiene pantalla propia (`wf_servicio_email.html`): edición del mensaje de las plantillas y configuración del límite de envíos fallidos por usuario. US-14 (confirmación por email) y US-15 (recordatorio por email) siguen sin pantalla propia: usan las plantillas que administra US-21, pero su disparo es infraestructura.

### Pendientes de los refinements

Las historias de pagos, historial clínico y reportes (US-32, US-34, US-35, US-36, US-39, US-40, US-41, US-44, US-45, US-47) necesitan su wireframe antes de entrar al refinement del Sprint 3. Están comprometidas en el plan pero todavía sin esquema. El ciclo de reserva del Sprint 2 (US-10, US-13, US-16, US-18, US-24, US-64) ya tiene wireframe; US-12 y US-20 se retiraron como historias propias porque el catálogo las redefinió dentro de US-10 y US-13 respectivamente.

### Fuera del alcance, sin wireframe

Módulo de vacunas (RF-VAC), aplicación móvil (RF-MOV), gestión desde mostrador, bloqueo de franjas publicadas, recuperación de contraseña, filtros y exportación de reportes, trazabilidad y adjuntos del historial clínico.

### Advertencia de cronograma

Con un único implementador por historia el alcance comprometido **necesita 47,9 días de implementación y el calendario da 21**. El análisis está en la sección 7 del bosquejo de sprints. Estos wireframes describen el alcance comprometido, no el que llega a la demo del 12/11 si no se acciona alguna de las palancas propuestas.

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
