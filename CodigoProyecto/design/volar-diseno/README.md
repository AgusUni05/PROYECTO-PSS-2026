# VolAR — Rediseño visual (handoff para Claude Code)

Este paquete trae el rediseño de las pantallas ya implementadas de VolAR.
Cada archivo de `pantallas/` es HTML estático autocontenido (abrilo en el navegador para verlo).
**Es una referencia visual: no hay que copiar el HTML tal cual, sino aplicar el estilo a los componentes existentes del proyecto, sin cambiar la lógica, las rutas ni las reglas de negocio.**

## Pantallas

| Archivo | Pantalla |
|---|---|
| `Main.html` | Inicio con buscador (origen, destino, fecha) |
| `Resultados.html` | Resultados de búsqueda con tarifas por clase |
| `ResultadosVacio.html` | Resultados sin vuelos (estado vacío) |
| `Compra.html` | Iniciar compra (resumen + detalle del precio) |
| `CompraError.html` | Vuelo no disponible para la venta |
| `AdminAeropuertos.html` | Admin — ABM de aeropuertos (US-01) |
| `AdminAviones.html` | Admin — ABM de aviones (US-02) |
| `AdminTrayectos.html` | Admin — ABM de trayectos (US-03) |
| `AdminVuelos.html` | Admin — generación y cronograma de vuelos (US-04/07/09/11) |
| `AdminVuelosEditar.html` | Admin — modal de edición de vuelo |
| `Forbidden.html` | Error 403 |

## Tokens de diseño

| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#16133D` | Header/hero oscuro, sidebar admin, texto principal |
| `--violet` | `#5530E0` | Primario (botones, foco, acentos) |
| `--violet-d` | `#4320C7` | Primario hover |
| `--violet-50` | `#F1EDFF` | Fondos suaves, ring de foco, callouts de reglas |
| `--lav` / `--lav-2` | `#C9C3F2` / `#A996FF` | Texto secundario e íconos sobre fondo oscuro |
| `--bg` | `#F5F5F9` | Fondo de página |
| `--line` | `#E7E6EF` | Bordes |
| `--muted` | `#5F5C78` | Texto secundario |
| verde | `#0D7048` / `#E7F5EE` | Estado Activo |
| rojo | `#B42318` / `#FDEEEC` | Agotado / errores |
| coral | `#B93C0C` / `#FFF0E8` | "Últimos cupos" |

- **Tipografía:** Plus Jakarta Sans (400–800) para todo; JetBrains Mono 500 para códigos (IATA, matrículas, IDs de vuelo).
- **Radios:** cards de 20px, inputs y botones de 12px, chips y pills de 999px.
- **Sombras:** solo en hover, con un tinte violeta/ink suave; en reposo las cards llevan borde de 1px.
- **Íconos:** de trazo, estilo Lucide (plane, map-pin, calendar, search, arrow-left-right, lock, info, route).

## Patrones clave

- **Buscador segmentado:** un contenedor blanco redondeado con campos separados por divisores. El botón circular de "invertir" va sobre el divisor entre Origen y Destino y gira 180° en hover. Botón Buscar grande a la derecha.
- **Hero del inicio:** franja `--ink` con un arco de vuelo punteado animado. El buscador se superpone al borde inferior del hero (margin-top negativo).
- **Card de vuelo:** info y ruta a la izquierda (horarios grandes, línea punteada con un avión que la recorre en hover). Dos columnas de tarifa (Economy / Primera) con precio, cupos y botón. Para "Agotado": columna atenuada, precio tachado y botón deshabilitado.
- **Admin:** layout con sidebar `--ink` fijo de 252px. Las reglas de negocio van en un callout `--violet-50` con ícono. Las tablas tienen hover de fila, estados como pills con punto y acciones deshabilitadas con candado + motivo.

## Animaciones

- Entrada escalonada (`rise`: fade + translateY de 14px, 0.65s, delays de 60–80ms).
- Botones: `translateY(-1px)` + sombra en hover; `scale(.97)` en active.
- Inputs: borde violeta + ring de 4px `--violet-50` en focus.
- Barras de ocupación con `scaleX` de 0 a 1 al cargar; modal con fade del scrim + pop del diálogo.
- Todas respetan `prefers-reduced-motion`.
