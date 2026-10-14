# 1. Requerimientos Funcionales (RF-01 a RF-14)

## RF-01: Gestión de vuelos
- **Descripción:** El sistema debe permitir al administrador crear, modificar y cancelar vuelos, indicando los días de la semana en que operan, el horario de partida y de llegada, y los aeropuertos de origen y destino.
- **User Stories Asociadas:**
  - **US-01 - ABML de Aeropuertos:** Como administrador, quiero dar de alta, modificar, dar de baja y listar aeropuertos (código, nombre y ciudad), para poder elegirlos como origen y destino al definir trayectos.
  - **US-02 - ABML de Aviones:** Como administrador, quiero dar de alta, modificar, dar de baja y listar aviones (identificador, modelo y cantidad de asientos Economy y Primera Clase), para asignarlos a los vuelos y conocer su capacidad por clase.
  - **US-03 - ABML de Trayectos:** Como administrador, quiero crear, modificar, dar de baja y listar trayectos indicando origen, destino, días de la semana en que opera, horario de partida y horario de llegada, para definir la programación semanal de cada servicio.
  - **US-04 - Generación de Vuelos con Fechas Reales:** Como administrador, quiero que, a partir de un trayecto y su período de disponibilidad, el sistema genere los vuelos con fechas reales, para tener cada vuelo identificado con una fecha concreta, su avión, su cupo y sus ventas.
  - **US-05 - Modificación de Vuelo en Fecha Puntual:** Como administrador, quiero modificar el horario o el avión de un vuelo de una fecha determinada, para resolver cambios operativos sin alterar el resto de las fechas del trayecto.
  - **US-06 - Cancelación de Vuelos:** Como administrador, quiero cancelar un vuelo de una fecha determinada o todos los vuelos de un trayecto, para dejar de ofrecerlos y avisar a los pasajeros afectados.

## RF-02: Definición del período de disponibilidad de venta
- **Descripción:** El sistema debe permitir definir, para cada vuelo, una fecha de inicio y una fecha de fin que delimiten el período del año en que estará disponible para la venta.
- **User Stories Asociadas:**
  - **US-07 - Definición del Período de Disponibilidad:** Como administrador, quiero definir una fecha de inicio y una fecha de fin de venta para cada trayecto/vuelo, para publicar la oferta de temporada con anticipación sin habilitar ventas fuera de ella.
  - **US-08 - Ocultamiento de Vuelos Fuera de Período:** Como pasajero, quiero ver solo vuelos que estén dentro de su período de venta, para no intentar comprar vuelos no habilitados.

## RF-03: Configuración de capacidad por clase
- **Descripción:** El sistema debe permitir al administrador definir la capacidad del avión asignado a cada vuelo, discriminando la cantidad de asientos de clase Economy y de Primera Clase.
- **User Stories Asociadas:**
  - **US-09 - Definición de Capacidad por Clase:** Como administrador, quiero definir la cantidad de asientos de Economy y de Primera Clase de cada vuelo (tomando por defecto los del avión asignado), para limitar la venta a la capacidad real.
  - **US-10 - Bloqueo de Venta por Cupo Agotado:** Como pasajero, quiero que el sistema no permita comprar en una clase sin cupo, para no pagar por un pasaje que no existe.

## RF-04: Gestión de tarifas por clase
- **Descripción:** El sistema debe permitir definir y modificar el precio del pasaje de cada vuelo, diferenciado por clase.
- **User Stories Asociadas:**
  - **US-11 - Definición de Tarifa por Clase:** Como administrador, quiero definir el precio del pasaje de cada vuelo diferenciado por clase (Economy y Primera), para poder calcular el importe de las compras.
  - **US-12 - Modificación de Tarifas:** Como administrador, quiero modificar la tarifa de un vuelo, para ajustar la oferta comercial.

## RF-05: Búsqueda de vuelos
- **Descripción:** El sistema debe permitir al pasajero buscar vuelos indicando origen y destino, y mostrar las opciones disponibles según fecha y horario.
- **User Stories Asociadas:**
  - **US-13 - Búsqueda de Vuelos por Origen, Destino y Fecha:** Como pasajero, quiero buscar vuelos indicando origen, destino y fecha, para encontrar opciones para viajar.
  - **US-14 - Visualización del Detalle de Opciones de Vuelo:** Como pasajero, quiero ver de cada resultado el horario de partida y llegada, la tarifa y el cupo disponible por clase, para elegir la opción que más me conviene.

## RF-06: Compra de pasajes
- **Descripción:** El sistema debe permitir comprar hasta 9 pasajes en una única transacción, seleccionando una clase (Economy o Primera) para toda la compra, y calcular el importe total según tarifa y cantidad.
- **User Stories Asociadas:**
  - **US-15 - Selección de Cantidad de Pasajes y Clase:** Como pasajero, quiero elegir de 1 a 9 pasajes de una misma clase en una sola compra, para comprar para todo mi grupo sin repetir la búsqueda.
  - **US-16 - Cálculo del Importe Total de la Compra:** Como pasajero, quiero ver el importe total antes de pagar, para saber cuánto voy a gastar.
  - **US-17 - Validación de Cupo al Confirmar Compra:** Como pasajero, quiero que el sistema verifique el cupo al confirmar la compra, para no quedar con una compra imposible de cumplir.

## RF-07: Registro de datos de los pasajeros
- **Descripción:** El sistema debe solicitar y almacenar los datos identificatorios de cada pasajero incluido en la compra, asociándolos al pasaje electrónico correspondiente.
- **User Stories Asociadas:**
  - **US-18 - Carga de Datos de Pasajeros:** Como pasajero comprador, quiero ingresar los datos identificatorios de cada persona que viaja, para que cada pasaje electrónico salga a nombre de quien corresponde.
  - **US-19 - Validación de Datos Formulario de Pasajeros:** Como pasajero comprador, quiero recibir avisos cuando un dato tiene formato inválido, para corregirlo antes de pagar.

## RF-08: Gestión de pagos
- **Descripción:** El sistema debe permitir ingresar la información de pago, procesarla contra una pasarela y registrar la transacción con su resultado, importe y fecha.
- **User Stories Asociadas:**
  - **US-20 - Ingreso de Información de Pago:** Como pasajero comprador, quiero ingresar los datos de pago, para confirmar mi compra.
  - **US-21 - Procesamiento de Pago contra Pasarela:** Como pasajero comprador, quiero que mi pago sea procesado y saber si fue aceptado o rechazado, para conocer el estado de mi compra.
  - **US-22 - Registro Transaccional de Pagos:** Como administrador, quiero que cada intento de pago quede registrado con su resultado, importe y fecha, para tener trazabilidad de lo vendido.

## RF-09: Emisión y envío de pasajes y factura
- **Descripción:** Ante una compra confirmada, el sistema debe generar los pasajes electrónicos y la factura correspondiente y enviarlos automáticamente por correo electrónico al comprador.
- **User Stories Asociadas:**
  - **US-23 - Generación de Pasajes Electrónicos y Factura:** Como pasajero comprador, quiero que al confirmarse el pago se generen mis pasajes electrónicos y la factura, para contar con los comprobantes de la compra.
  - **US-24 - Envío de Comprobantes por Correo Electrónico:** Como pasajero comprador, quiero recibir por email los pasajes y la factura, para tenerlos sin gestiones adicionales.

## RF-10: Notificación de cambios y cancelaciones
- **Descripción:** Ante un cambio de horario o la cancelación de un vuelo, el sistema debe notificar por email a todos los pasajeros con pasajes vendidos para ese vuelo y ofrecerles optar entre la reprogramación y el reembolso.
- **User Stories Asociadas:**
  - **US-25 - Notificación de Cambios de Horario o Cancelación:** Como pasajero con un pasaje vendido, quiero recibir un email cuando mi vuelo cambia de horario o se cancela, para enterarme antes de llegar al aeropuerto.
  - **US-26 - Elección entre Reprogramación y Reembolso:** Como pasajero afectado, quiero elegir entre reprogramar mi pasaje o pedir el reembolso, para resolver el cambio de la forma que me convenga.

## RF-11: Reportes de ocupación
- **Descripción:** El sistema debe permitir al administrador consultar reportes de ocupación por vuelo, por clase y por fecha, mostrando asientos vendidos, disponibles y porcentaje de ocupación.
- **User Stories Asociadas:**
  - **US-27 - Consulta de Reportes de Ocupación:** Como administrador, quiero consultar la ocupación por vuelo, por clase y por fecha, con asientos vendidos, disponibles y porcentaje de ocupación, para decidir sobre frecuencias, tarifas y capacidad.

## RF-12: Gestión de usuarios, roles y permisos
- **Descripción:** El sistema debe permitir el registro y la autenticación de usuarios, y habilitar funcionalidades diferenciadas según el rol: administrador, empleado de mostrador o pasajero.
- **User Stories Asociadas:**
  - **US-28 - Registro de Pasajeros:** Como pasajero, quiero registrarme en el sistema, para comprar y consultar mis pasajes.
  - **US-29 - Autenticación e Inicio/Cierre de Sesión:** Como usuario del sistema, quiero iniciar y cerrar sesión, para acceder a las funciones que me corresponden.
  - **US-30 - Control de Acceso Diferenciado por Rol:** Como usuario del sistema, quiero ver solo las funciones de mi rol (administrador, empleado de mostrador o pasajero), para operar con mi interfaz específica.
  - **US-31 - Gestión de Cuentas de Personal:** Como administrador, quiero crear y administrar cuentas de empleados de mostrador y de otros administradores, para habilitar al personal a operar el sistema.

## RF-13: Venta y gestión asistida desde mostrador
- **Descripción:** El sistema debe permitir al empleado de mostrador buscar vuelos, registrar una venta presencial a nombre de un pasajero y consultar las reservas existentes para asistirlo.
- **User Stories Asociadas:**
  - **US-32 - Búsqueda de Vuelos desde Mostrador:** Como empleado de mostrador, quiero buscar vuelos por origen, destino y fecha, para asistir a un pasajero en persona.
  - **US-33 - Registro de Venta Presencial en Mostrador:** Como empleado de mostrador, quiero registrar una venta a nombre de un pasajero, para atender a quienes no usan el canal digital.
  - **US-34 - Consulta de Reservas Existentes en Mostrador:** Como empleado de mostrador, quiero consultar las reservas de un pasajero, para asistirlo en su consulta.

## RF-14: Consulta de compras y descarga de pasajes
- **Descripción:** El sistema debe permitir al pasajero consultar sus compras y descargar los pasajes electrónicos y la factura desde su cuenta, tanto en la interfaz web como en el acceso móvil.
- **User Stories Asociadas:**
  - **US-35 - Consulta Histórica de Compras:** Como pasajero, quiero ver el listado de mis compras desde mi cuenta, para no depender del correo recibido.
  - **US-36 - Descarga de Pasajes y Factura desde la Cuenta:** Como pasajero, quiero descargar mis pasajes electrónicos y la factura, para tenerlos disponibles cuando los necesite.

---

# 2. Requerimientos Funcionales Opcionales (RFO-01 a RFO-07)

## RFO-01: Selección de asiento en el mapa de cabina
- **Descripción:** El sistema debe permitir al pasajero elegir un asiento determinado sobre un mapa de la cabina al completar la compra, respetando la clase adquirida y bloqueando el asiento elegido para el resto de los compradores.
- **User Stories Asociadas:**
  - **US-37 - Selección de Asiento en Mapa de Cabina (Opcional):** Como pasajero, quiero elegir mi asiento en un mapa de la cabina, para decidir dónde me siento.

## RFO-02: Check-in online y tarjeta de embarque
- **Descripción:** El sistema debe habilitar el check-in dentro de una ventana previa al vuelo y emitir la tarjeta de embarque descargable para cada pasajero.
- **User Stories Asociadas:**
  - **US-38 - Check-in Online y Tarjeta de Embarque (Opcional):** Como pasajero, quiero hacer el check-in online y descargar mi tarjeta de embarque, para evitar la fila en el aeropuerto.

## RFO-03: Cambio o cancelación del pasaje a pedido del pasajero
- **Descripción:** El sistema debe permitir al pasajero solicitar desde su cuenta el cambio de fecha o la cancelación de un pasaje comprado, aplicando la política comercial vigente y liberando el cupo correspondiente.
- **User Stories Asociadas:**
  - **US-39 - Cambio o Cancelación a Pedido del Pasajero (Opcional):** Como pasajero, quiero solicitar el cambio de fecha o la cancelación de mi pasaje, para resolverlo si no puedo viajar.

## RFO-04: Catálogo de aeropuertos y de flota
- **Descripción:** El sistema debe permitir administrar aeropuertos (código, nombre y ciudad) y aviones con su configuración de asientos por clase, de modo que al crear un vuelo se seleccionen de una lista en lugar de escribirlos a mano.
- **User Stories Asociadas:**
  - **US-40 - Catálogo Maestro de Aeropuertos y Flota (Opcional):** Como administrador, quiero administrar aeropuertos y aviones desde un catálogo, para no ingresarlos a mano al definir trayectos y vuelos.

## RFO-05: Gestión de equipaje con cargo
- **Descripción:** El sistema debe permitir agregar equipaje despachado adicional durante la compra, con su precio asociado, e impactarlo en el importe total y en el detalle de la factura.
- **User Stories Asociadas:**
  - **US-41 - Gestión de Equipaje con Cargo (Opcional):** Como pasajero, quiero agregar equipaje despachado adicional al comprar, para viajar con lo que necesito.

## RFO-06: Búsqueda flexible por fechas cercanas
- **Descripción:** El sistema debe ofrecer, junto con la búsqueda por fecha exacta, las opciones disponibles en los días previos y posteriores con su precio, para que el pasajero pueda comparar antes de comprar.
- **User Stories Asociadas:**
  - **US-42 - Búsqueda Flexible por Fechas Cercanas (Opcional):** Como pasajero, quiero ver opciones y precios de los días previos y posteriores a mi fecha, para comparar antes de comprar.

## RFO-07: Historial de cambios sobre los vuelos
- **Descripción:** El sistema debe registrar qué usuario creó, modificó o canceló cada vuelo, con fecha y detalle de lo modificado, y permitir al administrador consultar ese historial.
- **User Stories Asociadas:**
  - **US-43 - Auditoría e Historial de Cambios sobre Vuelos (Opcional):** Como administrador, quiero consultar quién creó, modificó o canceló cada vuelo, con fecha y detalle, para explicar un cambio ante un reclamo.

---

# Detalle de User Stories

## US-01 - ABML de Aeropuertos
- **Trazabilidad:** RF-01, RFO-04
- **Narrativa:** Como administrador, quiero dar de alta, modificar, dar de baja y listar aeropuertos (código, nombre y ciudad), para poder elegirlos como origen y destino al definir trayectos.
- **Criterios de Aceptación:**
  - El código (IATA/ICAO), el nombre del aeropuerto y la ciudad son obligatorios; el código es único en el sistema.
  - No se puede dar de baja un aeropuerto que esté asociado a trayectos con vuelos futuros programados; el sistema notifica el bloqueo.
  - El listado permite filtrar y buscar por código, nombre o ciudad.

## US-02 - ABML de Aviones
- **Trazabilidad:** RF-01, RF-03
- **Narrativa:** Como administrador, quiero dar de alta, modificar, dar de baja y listar aviones (identificador, modelo y cantidad de asientos Economy y Primera Clase), para asignarlos a los vuelos y conocer su capacidad por clase.
- **Criterios de Aceptación:**
  - El identificador del avión es obligatorio y único; las cantidades de asientos son enteros no negativos y al menos una clase debe tener asientos.
  - No se puede dar de baja un avión que tenga vuelos futuros asignados.
  - Al modificar la capacidad de un avión, el sistema valida que los vuelos ya vendidos no queden con más pasajes emitidos que los asientos disponibles.

## US-03 - ABML de Trayectos
- **Trazabilidad:** RF-01
- **Narrativa:** Como administrador, quiero crear, modificar, dar de baja y listar trayectos indicando origen, destino, días de la semana en que opera, horario de partida y horario de llegada, para definir la programación semanal de cada servicio.
- **Criterios de Aceptación:**
  - Origen y destino se eligen entre aeropuertos existentes y deben ser distintos.
  - Se debe seleccionar al menos un día de la semana de operación; ambos horarios son obligatorios.
  - Si el horario de llegada es anterior al de partida, el sistema lo interpreta y muestra como llegada del día siguiente.
  - Modificar un trayecto solo afecta a los vuelos futuros no vendidos; no se puede dar de baja un trayecto con pasajes vendidos sin antes cancelarlo. (NO se pueda modificar)

## US-04 - Generación de Vuelos con Fechas Reales
- **Trazabilidad:** RF-01, RF-02
- **Narrativa:** Como administrador, quiero que, a partir de un trayecto y su período de disponibilidad, el sistema genere los vuelos con fechas reales, para tener cada vuelo identificado con una fecha concreta, su avión, su cupo y sus ventas.
- **Criterios de Aceptación:**
  - Se genera un vuelo por cada fecha del calendario dentro del período cuyo día coincida con la frecuencia del trayecto.
  - Cada vuelo guarda: trayecto asociado, fecha real, horarios, avión asignado, cupo por clase y estado (Programado / Cancelado).
  - Es obligatorio asignar un avión; el sistema impide asignar el mismo avión a dos vuelos con horarios superpuestos.
  - El listado permite filtrar por fecha, origen, destino y estado.

## US-05 - Modificación de Vuelo en Fecha Puntual
- **Trazabilidad:** RF-01
- **Narrativa:** Como administrador, quiero modificar el horario o el avión de un vuelo de una fecha determinada, para resolver cambios operativos sin alterar el resto de las fechas del trayecto.
- **Criterios de Aceptación:**
  - El cambio operativo afecta exclusivamente a la fecha real seleccionada.
  - Si el vuelo tiene pasajes vendidos y cambia el horario, el sistema dispara el flujo de notificación de contingencia (RF-10).
  - No se permite asignar un avión cuya capacidad por clase sea menor a las ventas ya realizadas.

## US-06 - Cancelación de Vuelos
- **Trazabilidad:** RF-01, RF-10
- **Narrativa:** Como administrador, quiero cancelar un vuelo de una fecha determinada o todos los vuelos de un trayecto, para dejar de ofrecerlos y avisar a los pasajeros afectados.
- **Criterios de Aceptación:**
  - El sistema requiere confirmación explícita antes de efectuar la cancelación.
  - El vuelo cancelado cambia su estado a Cancelado (no se elimina físicamente) y deja de aparecer en las búsquedas.
  - Si existen pasajes vendidos, se dispara automáticamente la notificación de contingencia por email a los compradores.

## US-07 - Definición del Período de Disponibilidad
- **Trazabilidad:** RF-02
- **Narrativa:** Como administrador, quiero definir una fecha de inicio y una fecha de fin de venta para cada trayecto/vuelo, para publicar la oferta de temporada con anticipación sin habilitar ventas fuera de ella.
- **Criterios de Aceptación:**
  - Fecha de inicio y fecha de fin son obligatorias; la fecha de fin no puede ser anterior a la de inicio.
  - El período define el rango sobre el cual se generan los vuelos con fechas reales.

## US-08 - Ocultamiento de Vuelos Fuera de Período
- **Trazabilidad:** RF-02, RF-05
- **Narrativa:** Como pasajero, quiero ver solo vuelos que estén dentro de su período de venta, para no intentar comprar vuelos no habilitados.
- **Criterios de Aceptación:**
  - Las búsquedas en fechas dentro del período muestran el vuelo; las búsquedas fuera de rango no lo devuelven.
  - Cualquier intento directo de reservar un vuelo fuera de período es rechazado con un mensaje de validación.

## US-09 - Definición de Capacidad por Clase
- **Trazabilidad:** RF-03
- **Narrativa:** Como administrador, quiero definir la cantidad de asientos de Economy y de Primera Clase de cada vuelo (tomando por defecto los del avión asignado), para limitar la venta a la capacidad real.
- **Criterios de Aceptación:**
  - Ambas cantidades deben ser enteros no negativos.
  - La capacidad de una clase no puede ser menor a los pasajes ya vendidos en esa categoría.
  - El cupo disponible se calcula dinámicamente como Capacidad - Pasajes Vendidos.

## US-10 - Bloqueo de Venta por Cupo Agotado
- **Trazabilidad:** RF-03, RF-06
- **Narrativa:** Como pasajero, quiero que el sistema no me permita comprar en una clase sin cupo, para no pagar por un pasaje que no existe.
- **Criterios de Aceptación:**
  - Al agotarse el cupo de una clase, se deshabilita la compra en esa clase pero se permite en la otra si dispone de asientos.
  - Si la cantidad solicitada supera los asientos libres, el sistema informa el remanente disponible.

## US-11 - Definición de Tarifa por Clase
- **Trazabilidad:** RF-04
- **Narrativa:** Como administrador, quiero definir el precio del pasaje de cada vuelo diferenciado por clase (Economy y Primera), para poder calcular el importe de las compras.
- **Criterios de Aceptación:**
  - Cada vuelo requiere tarifas mayores a cero para ambas clases.
  - No se permite publicar a la venta ningún vuelo sin tarifas definidas.

## US-12 - Modificación de Tarifas
- **Trazabilidad:** RF-04
- **Narrativa:** Como administrador, quiero modificar la tarifa de un vuelo, para ajustar la oferta comercial.
- **Criterios de Aceptación:**
  - Las nuevas compras aplican la tarifa modificada vigente.
  - Las ventas confirmadas previamente conservan el valor pagado originalmente.

## US-13 - Búsqueda de Vuelos por Origen, Destino y Fecha
- **Trazabilidad:** RF-05, RNF-01, RNF-06 *Estimado con 3 Puntos
- **Narrativa:** Como pasajero, quiero buscar vuelos indicando origen, destino y fecha, para encontrar opciones para viajar.
- **Criterios de Aceptación:**
  - Origen y destino se seleccionan de listas desplegables y deben ser distintos.
  - Solo se listan vuelos en estado Programado, dentro de su período de venta y con cupo en al menos una clase.
  - Los resultados se ordenan cronológicamente por hora de salida; si no hay vuelos, se notifica con un mensaje claro.

## US-14 - Visualización del Detalle de Opciones de Vuelo
- **Trazabilidad:** RF-05
- **Narrativa:** Como pasajero, quiero ver de cada resultado el horario de partida y llegada, la tarifa y el cupo disponible por clase, para elegir la opción que más me conviene.
- **Criterios de Aceptación:**
  - Cada tarjeta de resultado muestra horarios, precio Economy/Primera y disponibilidad por clase.
  - Las clases sin cupo se marcan como "Agotadas / No disponible".
  - Permite iniciar directamente el flujo de compra.

## US-15 - Selección de Cantidad de Pasajes y Clase
- **Trazabilidad:** RF-06
- **Narrativa:** Como pasajero, quiero elegir de 1 a 9 pasajes de una misma clase en una sola compra, para comprar para todo mi grupo sin repetir la búsqueda.
- **Criterios de Aceptación:**
  - La cantidad mínima es 1 y la máxima 9 pasajes por transacción.
  - La clase elegida (Economy o Primera) se aplica de igual forma a todos los pasajes del grupo.

## US-16 - Cálculo del Importe Total de la Compra
- **Trazabilidad:** RF-06
- **Narrativa:** Como pasajero, quiero ver el importe total antes de pagar, para saber cuánto voy a gastar.
- **Criterios de Aceptación:**
  - Importe Total = Tarifa Vigente de Clase x Cantidad de Pasajes.
  - El total se recalcula dinámicamente si se modifica la cantidad o la clase seleccionada.

## US-17 - Validación de Cupo al Confirmar la reserva
- **Trazabilidad:** RF-06, RF-03
- **Narrativa:** Como pasajero, quiero que el sistema verifique el cupo al confirmar la compra, para no realizar una compra imposible de cumplir.
- **Criterios de Aceptación:**
  - El cupo se verifica de forma atómica al procesar la confirmación.
  - Si el cupo no alcanza en el momento de pagar, el sistema bloquea la transacción y sugiere ajustar la cantidad.
  - Se actualizan los datos de ocupación del vuelo con un tiempo limitado de 10 min.

## US-18 - Carga de Datos de Pasajeros
- **Trazabilidad:** RF-07
- **Narrativa:** Como pasajero comprador, quiero ingresar los datos identificatorios de cada persona que viaja, para que cada pasaje electrónico salga a nombre de quien corresponda.
- **Criterios de Aceptación:**
  - Se despliega un formulario individual por cada pasaje incluido en la compra.
  - Campos obligatorios: Nombre, Apellido y Número de Documento (DNI/Pasaporte).
  - Cada pasaje queda vinculado al pasajero ingresado.

## US-19 - Validación de Datos Formulario de Pasajeros
- **Trazabilidad:** RF-07
- **Narrativa:** Como pasajero comprador, quiero recibir avisos cuando un dato tiene formato inválido, para corregirlo antes de pagar.
- **Criterios de Aceptación:**
  - No se permite avanzar al pago si faltan campos obligatorios o hay formatos erróneos.
  - El sistema resalta el campo exacto y el pasajero específico a corregir.

## US-20 - Ingreso de Información de Pago
- **Trazabilidad:** RF-08 | RNF-08
- **Narrativa:** Como pasajero comprador, quiero ingresar los datos de pago, para confirmar mi compra.
- **Criterios de Aceptación:**
  - Muestra el resumen completo del importe a abonar antes de la confirmación.
  - Los datos sensibles de tarjeta no se persisten en base de datos (cumplimiento RNF-08).

## US-21 - Procesamiento de Pago contra Pasarela
- **Trazabilidad:** RF-08
- **Narrativa:** Como pasajero comprador, quiero que mi pago sea procesado y saber si fue aceptado o rechazado, para conocer el estado de mi compra.
- **Criterios de Aceptación:**
  - Pago Aprobado: la compra se confirma, se descuentan los cupos y se disparan los comprobantes (RF-09).
  - Pago Rechazado: la compra no se procesa, se libera el cupo reservado y se informa el motivo.

## US-22 - Registro Transaccional de Pagos
- **Trazabilidad:** RF-08
- **Narrativa:** Como administrador, quiero que cada intento de pago quede registrado con su resultado, importe y fecha, para tener trazabilidad de lo vendido.
- **Criterios de Aceptación:**
  - Se persisten todas las transacciones (aprobadas y rechazadas) con timestamp, monto e id de transacción.
  - La información alimenta el módulo de reportes de ocupación (RF-11).

## US-23 - Generación de Pasajes Electrónicos y Factura
- **Trazabilidad:** RF-09
- **Narrativa:** Como pasajero comprador, quiero que al confirmarse el pago se generen mis pasajes electrónicos y la factura, para contar con los comprobantes de la compra.
- **Criterios de Aceptación:**
  - Se emite un e-ticket por pasajero con datos del vuelo, asiento/clase y titular.
  - Se genera la factura de venta reflejando el desglose y monto total pagado.

## US-24 - Envío de Comprobantes por Correo Electrónico
- **Trazabilidad:** RF-09 | RNF-02
- **Narrativa:** Como pasajero comprador, quiero recibir por email los pasajes y la factura, para tenerlos sin gestiones adicionales.
- **Criterios de Aceptación:**
  - Envío automático post-pago dentro de los 2 minutos (RNF-02).
  - El envío se ejecuta enviando los archivos adjuntos al correo del comprador.

## US-25 - Notificación de Cambios de Horario o Cancelación
- **Trazabilidad:** RF-10
- **Narrativa:** Como pasajero con un pasaje vendido, quiero recibir un email cuando mi vuelo cambia de horario o se cancela, para enterarme antes de llegar al aeropuerto.
- **Criterios de Aceptación:**
  - Notificación enviada a todos los compradores afectados por la modificación del vuelo.
  - El correo detalla el cambio y proporciona el acceso para seleccionar el curso de acción.

## US-26 - Elección entre Reprogramación y Reembolso
- **Trazabilidad:** RF-10
- **Narrativa:** Como pasajero afectado, quiero elegir entre reprogramar mi pasaje o pedir el reembolso, para resolver el cambio de la forma que me convenga.
- **Criterios de Aceptación:**
  - Opción Reembolso: se cancela el pasaje, se restituye el importe y se libera el cupo.
  - Opción Reprogramación: el pasaje se reasigna a un nuevo vuelo disponible de la misma ruta.

## US-27 - Consulta de Reportes de Ocupación
- **Trazabilidad:** RF-11
- **Narrativa:** Como administrador, quiero consultar la ocupación por vuelo, por clase y por fecha, con asientos vendidos, disponibles y porcentaje de ocupación, para decidir sobre frecuencias, tarifas y capacidad.
- **Criterios de Aceptación:**
  - Permite aplicar filtros por vuelo, clase y rango de fechas.
  - Muestra total de asientos vendidos, disponibles y porcentaje de ocupación global y por clase.

## US-28 - Registro de Pasajeros
- **Trazabilidad:** RF-12, RNF-08
- **Narrativa:** Como pasajero, quiero registrarme en el sistema, para comprar y consultar mis pasajes.
- **Criterios de Aceptación:**
  - Formulario de alta con email único y contraseña.
  - Almacenamiento seguro de credenciales mediante hashing (RNF-08).

## US-29 - Autenticación e Inicio/Cierre de Sesión
- **Trazabilidad:** RF-12 | RNF-07
- **Narrativa:** Como usuario del sistema, quiero iniciar y cerrar sesión, para acceder a las funciones que me corresponden.
- **Criterios de Aceptación:**
  - Validación de credenciales; rechazo con mensaje estándar ante datos erróneos.
  - Cierre de sesión y expiración segura de tokens (RNF-07).

## US-30 - Control de Acceso Diferenciado por Rol
- **Trazabilidad:** RF-12, RNF-07
- **Narrativa:** Como usuario del sistema, quiero ver solo las funciones de mi rol (administrador, empleado de mostrador o pasajero), para operar con mi interfaz específica.
- **Criterios de Aceptación:**
  - Vistas y menús adaptados según el rol autenticado.
  - Bloqueo y denegación de acceso (HTTP 403) ante intentos no autorizados por URL.

## US-31 - Gestión de Cuentas de Personal
- **Trazabilidad:** RF-12
- **Narrativa:** Como administrador, quiero crear y administrar cuentas de empleados de mostrador y de otros administradores, para habilitar al personal a operar el sistema.
- **Criterios de Aceptación:**
  - Exclusivo para administradores; creación de usuarios con rol Empleado de Mostrador o Administrador.
  - Deshabilitación de cuentas de personal conservando la trazabilidad histórica.

## US-32 - Búsqueda de Vuelos desde Mostrador
- **Trazabilidad:** RF-13
- **Narrativa:** Como empleado de mostrador, quiero buscar vuelos por origen, destino y fecha, para asistir a un pasajero en persona.
- **Criterios de Aceptación:**
  - Reutiliza la lógica de búsqueda pública integrada en la vista operativa de mostrador.

## US-33 - Registro de Venta Presencial en Mostrador
- **Trazabilidad:** RF-13
- **Narrativa:** Como empleado de mostrador, quiero registrar una venta a nombre de un pasajero, para atender a quienes no usan el canal digital.
- **Criterios de Aceptación:**
  - Aplica las mismas reglas: 1 a 9 pasajes, una sola clase y validación de cupos.
  - Emite pasajes y factura registrando la venta bajo la terminal de mostrador.

## US-34 - Consulta de Reservas Existentes en Mostrador
- **Trazabilidad:** RF-13
- **Narrativa:** Como empleado de mostrador, quiero consultar las reservas de un pasajero, para asistirlo en su consulta.
- **Criterios de Aceptación:**
  - Búsqueda por DNI, apellido o código de reserva.
  - El empleado visualiza el detalle del pasaje sin acceso a datos bancarios/pago (RNF-08).

## US-35 - Consulta Histórica de Compras
- **Trazabilidad:** RF-14
- **Narrativa:** Como pasajero, quiero ver el listado de mis compras desde mi cuenta, para no depender del correo recibido.
- **Criterios de Aceptación:**
  - Listado de compras pasadas y futuras asociadas únicamente a la cuenta con sesión activa.

## US-36 - Descarga de Pasajes y Factura desde la Cuenta
- **Trazabilidad:** RF-14, RNF-06
- **Narrativa:** Como pasajero, quiero descargar mis pasajes electrónicos y la factura, para tenerlos disponibles cuando los necesite.
- **Criterios de Aceptación:**
  - Descarga directa de archivos PDF de e-tickets y factura desde la vista "Mis Compras".
  - Interfaz operable de manera responsive desde navegadores móviles (RNF-06).
  - Se debe generar el archivo con los datos previamente a la descarga.

## US-37 - Selección de Asiento en Mapa de Cabina (Opcional)
- **Trazabilidad:** RFO-01
- **Narrativa:** Como pasajero, quiero elegir mi asiento en un mapa de la cabina, para decidir dónde me siento.
- **Criterios de Aceptación:**
  - Mapa interactivo de asientos filtrado por la clase comprada; bloqueo del asiento para otros compradores.

## US-38 - Check-in Online y Tarjeta de Embarque (Opcional)
- **Trazabilidad:** RFO-02
- **Narrativa:** Como pasajero, quiero hacer el check-in online y descargar mi tarjeta de embarque, para evitar la fila en el aeropuerto.
- **Criterios de Aceptación:**
  - Habilitación de check-in dentro de la ventana temporal configurada previas al vuelo.

## US-39 - Cambio o Cancelación a Pedido del Pasajero (Opcional)
- **Trazabilidad:** RFO-03
- **Narrativa:** Como pasajero, quiero solicitar el cambio de fecha o la cancelación de mi pasaje, para resolverlo si no puedo viajar.
- **Criterios de Aceptación:**
  - Cancelación/cambio voluntario desde el portal del cliente aplicando la política de penalidades comercial.

## US-40 - Catálogo Maestro de Aeropuertos y Flota (Opcional)
- **Trazabilidad:** RFO-04
- **Narrativa:** Como administrador, quiero administrar aeropuertos y aviones desde un catálogo, para no ingresarlos a mano al definir trayectos y vuelos.
- **Criterios de Aceptación:**
  - Autocompletado de aeropuertos y capacidad de aeronaves al definir trayectos y fechas reales.

## US-41 - Gestión de Equipaje con Cargo (Opcional)
- **Trazabilidad:** RFO-05
- **Narrativa:** Como pasajero, quiero agregar equipaje despachado adicional al comprar, para viajar con lo que necesito.
- **Criterios de Aceptación:**
  - Selección de valijas adicionales en bodega con adición al total y desglose en la factura.

## US-42 - Búsqueda Flexible por Fechas Cercanas (Opcional)
- **Trazabilidad:** RFO-06
- **Narrativa:** Como pasajero, quiero ver opciones y precios de los días previos y posteriores a mi fecha, para comparar antes de comprar.
- **Criterios de Aceptación:**
  - Grilla de alternativas de vuelos en un rango de $\pm 3$ días cuando no se encuentren vuelos en la fecha exacta.

## US-43 - Auditoría e Historial de Cambios sobre Vuelos (Opcional)
- **Trazabilidad:** RFO-07
- **Narrativa:** Como administrador, quiero consultar quién creó, modificó o canceló cada vuelo, con fecha y detalle, para explicar un cambio ante un reclamo.
- **Criterios de Aceptación:**
  - Registro inmutable de eventos (auditoría) indicando usuario, fecha, hora y valores modificados.