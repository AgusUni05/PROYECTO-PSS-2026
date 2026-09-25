# Sistema médico — Wireframes

## 0. Research Log
- Referencia existente: `wireframes/wf_busqueda_turnos.html` → se conserva su esquema de baja fidelidad para mantener continuidad entre sprints.
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
| `wf_agenda_paciente.html` | US-10 | 2 | I3 | **Nueva.** Apertura automática de la agenda vista por el paciente. Solo lectura: reservar llega con US-13. |
| `wireframes/wf_busqueda_turnos.html` | US-12 | 2 | I4 | Sin el paso previo de elección de tipo de turno: el módulo de vacunas quedó fuera y US-12 bajó de 3 a 2 puntos. |
| `wf_costo_consulta.html` | US-33 | 3 | I5 | **Nueva.** Costo de la consulta definido por cada médico, con historial de vigencias. |
| `wf_acceso_denegado.html` | — | 1 a 3 | — | Estado transversal de RNF-03, verificado dentro de cada historia según la condición 6 de la definición de terminado. |

US-21 (servicio de envío de email) no tiene pantalla propia: es infraestructura.

### Pendientes de los refinements

Las historias del ciclo de reserva (US-13, US-14, US-15, US-16, US-18, US-20, US-64) y las de pagos, historial clínico y reportes (US-32, US-34, US-35, US-36, US-39, US-40, US-41, US-44, US-45, US-47) necesitan su wireframe antes de entrar al refinement de su sprint. Están comprometidas en el plan pero todavía sin esquema.

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
