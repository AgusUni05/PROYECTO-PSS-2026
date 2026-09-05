# Sistema médico — Wireframes Sprint 1

## 0. Research Log
- Referencia existente: `wireframes/wf_busqueda_turnos.html` → se conserva su esquema de baja fidelidad para mantener continuidad entre sprints.
- Lanes no ejecutadas: no se realizó investigación de marcas ni prototipado visual porque el pedido es un esquema conceptual interno, no una interfaz final.

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
