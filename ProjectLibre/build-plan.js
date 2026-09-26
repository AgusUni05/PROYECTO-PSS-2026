/**
 * Genera ProjectLibre/AuraHealth_v6.xml — plan del proyecto en formato MS Project XML (MSPDI),
 * que ProjectLibre abre con Archivo > Abrir.
 *
 * Uso:  node ProjectLibre/build-plan.js
 *
 * v6 — reincorpora al alcance el modulo de vacunas (US-24, US-63, US-28, US-29, US-57),
 * el modulo de reportes (US-48, US-49, US-50), US-17, US-30 y US-62. US-22 entra arrastrada
 * por US-30: el aviso a los pacientes afectados es un criterio de aceptacion de US-30.
 * La aplicacion movil NO se implementa como modulo: la web es responsive (RNF-08 transversal).
 *
 * Supuestos que cambian respecto de v5, necesarios para absorber el alcance ampliado:
 *   1. Jornada de 2,65 h por dia habil (09:00-11:39) en lugar de 2,5. Dentro del rango
 *      declarado por el equipo, de 2 a 3 h.
 *   2. El Sprint 3 implementa durante la semana del parcial (02-06/11): 12 dias de
 *      implementacion en lugar de 7. El proyecto pasa de 21 a 26 dias.
 *   3. Se relaja la regla de un unico implementador. Cada historia conserva un dueno
 *      responsable --el primero de su equipo-- pero las de 3 puntos las ejecuta una pareja
 *      y las de 4 o 5 un trio. La verificacion cruzada (condicion 3 de la definicion de
 *      terminado) la hace un integrante ajeno al equipo de la historia.
 *
 * El script hace dos cosas: escribe el XML y verifica el plan. La verificacion comprueba
 * que ningun integrante supere el tope de horas de su sprint y calcula el cronograma con
 * una pasada hacia adelante que respeta precedencias, ventanas de sprint y la regla de que
 * cada integrante trabaja en una historia por vez.
 *
 * Un punto de historia equivale a 3,30 horas.
 */

const fs = require('fs');
const path = require('path');

const H_POR_PUNTO = 3.3;
const H_POR_DIA = 2.65;
const RECURSOS = ['I1', 'I2', 'I3', 'I4', 'I5'];

// Dias de implementacion de cada sprint y su ventana en dias continuos (1 a 26).
const DIAS_IMPL = {1: 7, 2: 7, 3: 12};
const VENTANA = {1: [0, 7], 2: [7, 14], 3: [14, 26]};

// eq: equipo de la historia; el PRIMERO es el dueno responsable, el resto copilotos.
// pred: [[clave, 'FC' | 'CC', lagEnDias]]
const SPRINTS = [
  {
    n: 1,
    nombre: 'Sprint 1 - Cimientos y agenda',
    refinement: 'Refinement Sprint 1 - conocimiento de las US',
    demo: 'Demo Sprint 1 (jue 08/10)',
    cierre: 'Testing de regresion y cierre Sprint 1',
    tareas: [
      {id: 'US-01', nom: 'US-01 Registro y gestion de la cuenta de usuario', pts: 4, eq: ['I1', 'I3', 'I5'], pred: []},
      {id: 'US-02', nom: 'US-02 Inicio de sesion con interfaz segun rol', pts: 3, eq: ['I2', 'I4'], pred: [['US-01', 'CC', 2]]},
      {id: 'US-03', nom: 'US-03 Alta y baja de usuarios internos', pts: 3, eq: ['I2', 'I4'], pred: [['US-02', 'CC', 2]]},
      {id: 'US-06', nom: 'US-06 Carga de disponibilidad mensual y validacion de jornadas', pts: 5, eq: ['I5', 'I1', 'I3'], pred: [['US-03', 'CC', 2]]},
      {id: 'US-08', nom: 'US-08 Generacion automatica de turnos de 30 minutos', pts: 4, eq: ['I3', 'I1', 'I5'], pred: [['US-06', 'CC', 2]]},
      {id: 'US-11', nom: 'US-11 Vista de agenda del profesional', pts: 4, eq: ['I4', 'I2'], pred: [['US-08', 'CC', 2]]},
    ],
  },
  {
    n: 2,
    nombre: 'Sprint 2 - Ciclo de reserva de turnos',
    refinement: 'Refinement Sprint 2 - conocimiento de las US',
    demo: 'Demo Sprint 2 (jue 22/10)',
    cierre: 'Testing de regresion y cierre Sprint 2',
    tareas: [
      {id: 'US-21', nom: 'US-21 Servicio de envio de notificaciones por email', pts: 3, eq: ['I1', 'I3'], pred: [['US-01', 'CC', 2]]},
      {id: 'US-24', nom: 'US-24 Catalogo de vacunas', pts: 2, eq: ['I1'], pred: [['US-03', 'FC', 0]]},
      {id: 'US-10', nom: 'US-10 Apertura automatica de la agenda', pts: 2, eq: ['I3'], pred: [['US-08', 'FC', 0]]},
      {id: 'US-12', nom: 'US-12 Busqueda de disponibilidad de turnos', pts: 2, eq: ['I4'], pred: [['US-10', 'CC', 1]]},
      {id: 'US-13', nom: 'US-13 Reserva de turno', pts: 3, eq: ['I2', 'I5'], pred: [['US-12', 'CC', 2]]},
      {id: 'US-14', nom: 'US-14 Confirmacion de reserva por email', pts: 2, eq: ['I3'], pred: [['US-13', 'CC', 2], ['US-21', 'FC', 0]]},
      {id: 'US-15', nom: 'US-15 Recordatorio automatico de turno', pts: 2, eq: ['I5'], pred: [['US-13', 'CC', 2], ['US-21', 'FC', 0]]},
      {id: 'US-16', nom: 'US-16 Cancelacion de turno por el paciente', pts: 2, eq: ['I4'], pred: [['US-13', 'CC', 2]]},
      {id: 'US-18', nom: 'US-18 Registro del estado del turno', pts: 2, eq: ['I1'], pred: [['US-13', 'CC', 2]]},
      {id: 'US-20', nom: 'US-20 Control de concurrencia en la reserva', pts: 2, eq: ['I2'], pred: [['US-13', 'FC', 0]]},
      {id: 'US-64', nom: 'US-64 Reserva de turno a nombre de otra persona', pts: 2, eq: ['I2'], pred: [['US-13', 'FC', 0]]},
      {id: 'BUG1a', nom: 'Reserva para bugs del Sprint 1 (I4)', pts: 1, eq: ['I4'], pred: []},
      {id: 'BUG1b', nom: 'Reserva para bugs del Sprint 1 (I5, bloque 1)', pts: 1, eq: ['I5'], pred: []},
      {id: 'BUG1c', nom: 'Reserva para bugs del Sprint 1 (I5, bloque 2)', pts: 1, eq: ['I5'], pred: []},
    ],
  },
  {
    n: 3,
    nombre: 'Sprint 3 - Vacunas, dinero, datos clinicos y reportes',
    refinement: 'Refinement Sprint 3 - conocimiento de las US',
    demo: 'Demo Sprint 3 (jue 12/11)',
    cierre: 'Testing de regresion y cierre Sprint 3',
    tareas: [
      {id: 'US-63', nom: 'US-63 Agenda del vacunatorio', pts: 3, eq: ['I5', 'I1'], pred: [['US-08', 'FC', 0]]},
      {id: 'US-33', nom: 'US-33 Definicion del costo de la consulta por el medico', pts: 2, eq: ['I5'], pred: [['US-03', 'FC', 0]]},
      {id: 'US-32', nom: 'US-32 Gestion de la cobertura medica', pts: 2, eq: ['I1'], pred: [['US-03', 'FC', 0]]},
      {id: 'US-39', nom: 'US-39 Ficha de diagnostico del paciente', pts: 3, eq: ['I3', 'I4'], pred: [['US-18', 'CC', 1]]},
      {id: 'US-45', nom: 'US-45 Reporte de turnos por especialidad', pts: 2, eq: ['I4'], pred: [['US-18', 'FC', 0]]},
      {id: 'US-48', nom: 'US-48 Reporte de asistencia de pacientes', pts: 1, eq: ['I1'], pred: [['US-18', 'FC', 0]]},
      {id: 'US-30', nom: 'US-30 Bloqueo de turnos disponibles de una franja publicada', pts: 2, eq: ['I5'], pred: [['US-10', 'FC', 0], ['US-13', 'FC', 0]]},
      {id: 'US-28', nom: 'US-28 Turno de vacunacion', pts: 3, eq: ['I5', 'I3'], pred: [['US-13', 'FC', 0], ['US-24', 'FC', 0], ['US-63', 'FC', 0]]},
      {id: 'US-34', nom: 'US-34 Calculo del importe segun cobertura', pts: 3, eq: ['I1', 'I2'], pred: [['US-32', 'CC', 1], ['US-33', 'CC', 1], ['US-18', 'FC', 0]]},
      {id: 'US-22', nom: 'US-22 Aviso por modificacion de agenda', pts: 1, eq: ['I3'], pred: [['US-21', 'FC', 0], ['US-30', 'FC', 0]]},
      {id: 'US-40', nom: 'US-40 Consulta de la ficha del paciente', pts: 2, eq: ['I3'], pred: [['US-39', 'CC', 2]]},
      {id: 'US-41', nom: 'US-41 Historial clinico del paciente', pts: 2, eq: ['I4'], pred: [['US-39', 'CC', 2]]},
      {id: 'US-62', nom: 'US-62 Adjuntar estudios a la ficha', pts: 3, eq: ['I3', 'I2'], pred: [['US-39', 'FC', 0]]},
      {id: 'US-29', nom: 'US-29 Registro de aplicacion de dosis', pts: 1, eq: ['I4'], pred: [['US-28', 'CC', 1]]},
      {id: 'US-17', nom: 'US-17 Gestion de turnos desde mostrador', pts: 3, eq: ['I5', 'I4'], pred: [['US-16', 'FC', 0], ['US-28', 'FC', 0]]},
      {id: 'US-35', nom: 'US-35 Registro del pago en efectivo o por transferencia', pts: 2, eq: ['I2'], pred: [['US-34', 'CC', 1]]},
      {id: 'US-44', nom: 'US-44 Auditoria de accesos al historial', pts: 1, eq: ['I4'], pred: [['US-40', 'FC', 0], ['US-41', 'FC', 0]]},
      {id: 'US-57', nom: 'US-57 Carnet de vacunacion del paciente', pts: 1, eq: ['I3'], pred: [['US-29', 'FC', 0]]},
      {id: 'US-36', nom: 'US-36 Comprobante de pago en PDF', pts: 2, eq: ['I2'], pred: [['US-35', 'FC', 0]]},
      {id: 'US-47', nom: 'US-47 Reporte de pagos realizados', pts: 1, eq: ['I2'], pred: [['US-35', 'FC', 0]]},
      {id: 'US-49', nom: 'US-49 Filtros comunes de reportes', pts: 1, eq: ['I1'], pred: [['US-45', 'FC', 0], ['US-47', 'FC', 0], ['US-48', 'FC', 0]]},
      {id: 'US-50', nom: 'US-50 Exportacion de reportes', pts: 1, eq: ['I2'], pred: [['US-49', 'FC', 0]]},
      {id: 'BUG2a', nom: 'Reserva para bugs del Sprint 2 (I1, bloque 1)', pts: 1, eq: ['I1'], pred: []},
      {id: 'BUG2b', nom: 'Reserva para bugs del Sprint 2 (I1, bloque 2)', pts: 1, eq: ['I1'], pred: []},
      {id: 'BUG2c', nom: 'Reserva para bugs del Sprint 2 (I5)', pts: 1, eq: ['I5'], pred: []},
    ],
  },
];

// ---------------------------------------------------------------- construccion
const tasks = [];
const byKey = {};
let uid = 0;

function addTask(o) {
  uid += 1;
  const t = Object.assign({uid, id: uid}, o);
  tasks.push(t);
  if (o.key) byKey[o.key] = t;
  return t;
}

addTask({key: 'ROOT', nom: 'Sala Medica Privada - Enunciado 2 (v6)', nivel: 1, summary: true});

for (const sp of SPRINTS) {
  const n = sp.n;
  addTask({key: 'SPR' + n, nom: sp.nombre, nivel: 2, summary: true});
  addTask({
    key: 'REF' + n, nom: sp.refinement, nivel: 3, dias: 1, horas: 0,
    pred: n === 1 ? [] : [['CIE' + (n - 1), 'FC', 0]],
  });
  for (const t of sp.tareas) {
    const horas = t.pts * H_POR_PUNTO;
    addTask({
      key: t.id, nom: t.nom, nivel: 3,
      dias: horas / (t.eq.length * H_POR_DIA),
      horas, eq: t.eq, pts: t.pts, sprint: n,
      pred: t.pred.length ? t.pred : [['REF' + n, 'FC', 0]],
    });
  }
  addTask({key: 'DEM' + n, nom: sp.demo, nivel: 3, dias: 1, horas: 0, pred: sp.tareas.map(t => [t.id, 'FC', 0])});
  addTask({key: 'CIE' + n, nom: sp.cierre, nivel: 3, dias: 1, horas: 0, pred: [['DEM' + n, 'FC', 0]]});
}

addTask({key: 'CIERRE', nom: 'Cierre del proyecto e informe final', nivel: 2, dias: 5, horas: 0, pred: [['CIE3', 'FC', 0]]});

// ---------------------------------------------------------------- utilidades
const MIN_POR_DIA = Math.round(H_POR_DIA * 60);

function dur(dias) { const m = Math.round(dias * MIN_POR_DIA); return `PT${Math.floor(m / 60)}H${m % 60}M0S`; }
function horasFmt(h) { const m = Math.round(h * 60); return `PT${Math.floor(m / 60)}H${m % 60}M0S`; }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const coma = (n, d = 1) => n.toFixed(d).replace('.', ',');

function weekDay(type, working) {
  if (!working) return `      <WeekDay><DayType>${type}</DayType><DayWorking>0</DayWorking></WeekDay>`;
  return `      <WeekDay><DayType>${type}</DayType><DayWorking>1</DayWorking>
        <WorkingTimes><WorkingTime><FromTime>09:00:00</FromTime><ToTime>11:39:00</ToTime></WorkingTime></WorkingTimes>
      </WeekDay>`;
}

// ------------------------------------------------- cronograma: pasada hacia adelante
// Numera los dias de implementacion de forma continua. Una historia no arranca antes del
// primer dia de su sprint, ni antes de que su equipo quede libre, ni antes de que sus
// predecesoras lo permitan. Los hitos (refinement, demo, cierre) no consumen horas.
function planificar(hDia) {
  const items = tasks.filter(t => t.pts);
  const ini = {}, fin = {}, libre = {};
  RECURSOS.forEach(r => libre[r] = 0);
  const pendiente = items.slice();
  let t = 0, vueltas = 0;
  while (pendiente.length && ++vueltas < 20000) {
    const listas = pendiente.filter(x =>
      t >= VENTANA[x.sprint][0] - 1e-9 &&
      (x.pred || []).every(([k, tipo, lag]) => {
        if (!byKey[k].pts) return true;                        // hito
        return tipo === 'FC' ? fin[k] !== undefined && fin[k] <= t + 1e-9
                             : ini[k] !== undefined && ini[k] + lag <= t + 1e-9;
      }));
    for (const x of listas) {
      if (!x.eq.every(r => libre[r] <= t + 1e-9)) continue;
      const dias = x.horas / (x.eq.length * hDia);
      ini[x.key] = t; fin[x.key] = t + dias;
      x.eq.forEach(r => libre[r] = t + dias);
      pendiente.splice(pendiente.indexOf(x), 1);
    }
    const proximos = [];
    RECURSOS.forEach(r => { if (libre[r] > t + 1e-9) proximos.push(libre[r]); });
    for (const x of pendiente) {
      if (VENTANA[x.sprint][0] > t + 1e-9) proximos.push(VENTANA[x.sprint][0]);
      for (const [k, tipo, lag] of (x.pred || []))
        if (tipo === 'CC' && ini[k] !== undefined && ini[k] + lag > t + 1e-9) proximos.push(ini[k] + lag);
    }
    if (!proximos.length) break;
    t = Math.min(...proximos);
  }
  return {ini, fin, sinUbicar: pendiente.map(x => x.key)};
}

const plan = planificar(H_POR_DIA);
if (plan.sinUbicar.length) console.warn('!! sin ubicar:', plan.sinUbicar.join(', '));

// ---------------------------------------------------------------- salida MSPDI
const out = [];
out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
out.push('<Project xmlns="http://schemas.microsoft.com/project">');
out.push('  <Name>AuraHealth_v6.xml</Name>');
out.push('  <Title>Sala Medica Privada - plan de sprints v6</Title>');
out.push('  <Author>Comision de Analisis y Management</Author>');
out.push('  <ScheduleFromStart>1</ScheduleFromStart>');
out.push('  <StartDate>2026-09-28T09:00:00</StartDate>');
out.push('  <CalendarUID>1</CalendarUID>');
out.push('  <DefaultStartTime>09:00:00</DefaultStartTime>');
out.push('  <DefaultFinishTime>11:39:00</DefaultFinishTime>');
out.push(`  <MinutesPerDay>${MIN_POR_DIA}</MinutesPerDay>`);
out.push(`  <MinutesPerWeek>${MIN_POR_DIA * 5}</MinutesPerWeek>`);
out.push('  <DaysPerMonth>20</DaysPerMonth>');
out.push('  <DefaultTaskType>1</DefaultTaskType>');
out.push('  <DurationFormat>7</DurationFormat>');
out.push('  <WorkFormat>2</WorkFormat>');
out.push('  <NewTasksEffortDriven>0</NewTasksEffortDriven>');
out.push('  <Calendars>');
out.push('    <Calendar>');
out.push('      <UID>1</UID>');
out.push('      <Name>Sala Medica - 2,65 h por dia</Name>');
out.push('      <IsBaseCalendar>1</IsBaseCalendar>');
out.push('      <BaseCalendarUID>-1</BaseCalendarUID>');
out.push('      <WeekDays>');
out.push(weekDay(1, false));
for (let d = 2; d <= 6; d++) out.push(weekDay(d, true));
out.push(weekDay(7, false));
out.push('      </WeekDays>');
out.push('    </Calendar>');
out.push('  </Calendars>');

out.push('  <Tasks>');
for (const t of tasks) {
  out.push('    <Task>');
  out.push(`      <UID>${t.uid}</UID>`);
  out.push(`      <ID>${t.id}</ID>`);
  out.push(`      <Name>${esc(t.nom)}</Name>`);
  out.push('      <Active>1</Active>');
  out.push('      <Manual>0</Manual>');
  out.push('      <Type>1</Type>');
  out.push('      <IsNull>0</IsNull>');
  out.push('      <CreateDate>2026-09-27T09:00:00</CreateDate>');
  out.push(`      <OutlineLevel>${t.nivel}</OutlineLevel>`);
  out.push('      <Priority>500</Priority>');
  out.push(`      <Summary>${t.summary ? 1 : 0}</Summary>`);
  out.push('      <Milestone>0</Milestone>');
  out.push('      <ConstraintType>0</ConstraintType>');
  if (!t.summary) {
    out.push(`      <Duration>${dur(t.dias)}</Duration>`);
    out.push('      <DurationFormat>7</DurationFormat>');
    out.push(`      <Work>${horasFmt(t.horas || 0)}</Work>`);
    out.push('      <EffortDriven>0</EffortDriven>');
    if (t.pts) {
      const rol = t.eq.length === 1 ? `Implementador unico: ${t.eq[0]}`
        : `Dueno: ${t.eq[0]}. Copiloto${t.eq.length > 2 ? 's' : ''}: ${t.eq.slice(1).join(', ')}`;
      out.push(`      <Notes>${t.pts} puntos x 3,30 h = ${coma(t.horas)} h. ${rol}. ` +
        `${coma(t.horas / t.eq.length)} h cada uno, ${coma(t.dias)} dias a 2,65 h por dia. ` +
        `Ventana calculada: dias ${coma(plan.ini[t.key])} a ${coma(plan.fin[t.key])} de 26.</Notes>`);
    }
  }
  for (const [k, tipo, lag] of (t.pred || [])) {
    const p = byKey[k];
    if (!p) { console.warn('predecesora inexistente:', k, '->', t.key); continue; }
    out.push('      <PredecessorLink>');
    out.push(`        <PredecessorUID>${p.uid}</PredecessorUID>`);
    out.push(`        <Type>${tipo === 'CC' ? 3 : 1}</Type>`);
    out.push('        <CrossProject>0</CrossProject>');
    out.push(`        <LinkLag>${lag * MIN_POR_DIA * 10}</LinkLag>`);
    out.push('        <LagFormat>7</LagFormat>');
    out.push('      </PredecessorLink>');
  }
  out.push('    </Task>');
}
out.push('  </Tasks>');

out.push('  <Resources>');
RECURSOS.forEach((sigla, i) => {
  out.push('    <Resource>');
  out.push(`      <UID>${i + 1}</UID>`);
  out.push(`      <ID>${i + 1}</ID>`);
  out.push(`      <Name>${sigla}</Name>`);
  out.push(`      <Initials>${sigla}</Initials>`);
  out.push('      <Type>1</Type>');
  out.push('      <IsNull>0</IsNull>');
  out.push('      <MaxUnits>1</MaxUnits>');
  out.push('      <CalendarUID>1</CalendarUID>');
  out.push('    </Resource>');
});
out.push('  </Resources>');

out.push('  <Assignments>');
let auid = 0;
for (const t of tasks) {
  if (!t.eq) continue;
  for (const sigla of t.eq) {
    auid += 1;
    out.push('    <Assignment>');
    out.push(`      <UID>${auid}</UID>`);
    out.push(`      <TaskUID>${t.uid}</TaskUID>`);
    out.push(`      <ResourceUID>${RECURSOS.indexOf(sigla) + 1}</ResourceUID>`);
    out.push('      <Units>1</Units>');
    out.push(`      <Work>${horasFmt(t.horas / t.eq.length)}</Work>`);
    out.push('    </Assignment>');
  }
}
out.push('  </Assignments>');
out.push('</Project>');

const dest = path.join(__dirname, 'AuraHealth_v6.xml');
fs.writeFileSync(dest, out.join('\n') + '\n', 'utf8');

// Sidecar con los datos del plan, para que los documentos de docs-src se generen
// desde la misma fuente que el XML.
const datos = {
  hPorPunto: H_POR_PUNTO, hPorDia: H_POR_DIA, recursos: RECURSOS,
  diasImpl: DIAS_IMPL, ventana: VENTANA,
  historias: {},
};
for (const t of tasks.filter(x => x.pts)) {
  datos.historias[t.key] = {
    pts: t.pts, horas: t.horas, sprint: t.sprint, eq: t.eq,
    dueno: t.eq[0], copilotos: t.eq.slice(1),
    hCadaUno: t.horas / t.eq.length, dias: t.dias,
    ini: plan.ini[t.key], fin: plan.fin[t.key],
    cierraEnSprint: plan.fin[t.key] <= VENTANA[t.sprint][1] + 0.05,
    pred: (t.pred || []).filter(([k]) => byKey[k].pts),
  };
}
fs.writeFileSync(path.join(__dirname, 'plan-v6.json'), JSON.stringify(datos, null, 2), 'utf8');

// ---------------------------------------------------------------- verificacion
const conEquipo = tasks.filter(t => t.pts);
const historias = conEquipo.filter(t => t.key.startsWith('US-'));
const gastado = {};
RECURSOS.forEach(r => gastado[r] = {1: 0, 2: 0, 3: 0});
let totalH = 0, totalP = 0;
for (const t of conEquipo) {
  totalP += t.pts; totalH += t.horas;
  t.eq.forEach(r => gastado[r][t.sprint] += t.horas / t.eq.length);
}

console.log(`OK  ${path.basename(dest)}  (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
console.log(`    ${tasks.length} tareas - ${historias.length} User Stories - ${totalP} puntos - ${coma(totalH)} h`);
console.log(`    ${auid} asignaciones para ${conEquipo.length} tareas con equipo`);

console.log('');
console.log('    sprint dias  demanda  capacidad  ocup.   horas por integrante (I1..I5)   tope');
let excede = 0;
for (const n of [1, 2, 3]) {
  const cap = DIAS_IMPL[n] * RECURSOS.length * H_POR_DIA;
  const tope = DIAS_IMPL[n] * H_POR_DIA;
  const dem = RECURSOS.reduce((a, r) => a + gastado[r][n], 0);
  if (RECURSOS.some(r => gastado[r][n] > tope + 0.01)) excede += 1;
  console.log(`      ${n}     ${String(DIAS_IMPL[n]).padStart(2)}   ${coma(dem).padStart(6)} h ${coma(cap).padStart(7)} h  ${String(Math.round(dem / cap * 100)).padStart(3)}%   ` +
    RECURSOS.map(r => coma(gastado[r][n]).padStart(5)).join(' ') + `   ${coma(tope)}`);
}
console.log(excede ? `    !! ${excede} sprint(s) con un integrante por encima del tope`
                   : '    OK  ningun integrante supera el tope de horas de su sprint');

console.log('');
console.log('    cronograma a 2,65 h/dia (dias de implementacion continuos, 26 disponibles)');
for (const n of [1, 2, 3]) {
  const dels = conEquipo.filter(t => t.sprint === n);
  const cierre = Math.max(...dels.map(t => plan.fin[t.key]));
  const fuera = dels.filter(t => plan.fin[t.key] > VENTANA[n][1] + 0.05);
  console.log(`      Sprint ${n}: cierra el dia ${coma(cierre).padStart(4)} (limite ${VENTANA[n][1]})` +
    (fuera.length ? `  se corren ${fuera.length}: ${fuera.map(t => t.key).join(', ')}`
                  : '  todas las historias cierran en su sprint'));
}
const finProy = Math.max(...Object.values(plan.fin));
console.log(`      Fin del proyecto: dia ${coma(finProy)} de 26  ` +
  (finProy <= 26 ? 'ENTRA' : `FALTAN ${coma(finProy - 26)} DIAS`));

console.log('');
console.log('    sensibilidad a la dedicacion diaria');
for (const h of [2.0, 2.5, 2.65, 2.8, 3.0]) {
  const p = planificar(h);
  const f = Math.max(...Object.values(p.fin));
  const dentro = historias.filter(t => p.fin[t.key] <= VENTANA[t.sprint][1] + 0.05).length;
  console.log(`      ${coma(h, 2)} h/dia -> fin dia ${coma(f).padStart(4)} de 26 - ${String(dentro).padStart(2)} de 39 US cierran en su sprint`);
}

console.log('');
console.log('    reparto por integrante (dueno / copiloto)');
for (const r of RECURSOS) {
  const suyas = historias.filter(t => t.eq[0] === r).map(t => t.key.replace('US-', ''));
  const copi = historias.filter(t => t.eq.slice(1).includes(r)).map(t => t.key.replace('US-', ''));
  const h = [1, 2, 3].reduce((a, n) => a + gastado[r][n], 0);
  console.log(`      ${r}  ${coma(h).padStart(5)} h  dueno de ${String(suyas.length).padStart(2)} (${suyas.join(' ')})  copiloto en ${copi.length} (${copi.join(' ') || '-'})`);
}
