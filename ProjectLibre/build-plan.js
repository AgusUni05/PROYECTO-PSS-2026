/**
 * Genera projectlibre/AuraHealth_v5.xml — plan del proyecto en formato MS Project XML (MSPDI),
 * que ProjectLibre abre con Archivo > Abrir.
 *
 * Uso:  node projectlibre/build-plan.js
 *
 * El calendario modela la dedicacion real del equipo: 2,5 h por dia habil (09:00-11:30),
 * de modo que 1 dia de duracion equivale a 2,5 horas de trabajo.
 * Un punto de historia equivale a 3,30 horas.
 *
 * Regla de asignacion: CADA USER STORY TIENE UN UNICO IMPLEMENTADOR.
 * Cada tarea de historia lleva exactamente una asignacion de recurso, y su duracion
 * es la que le lleva a esa persona sola: puntos x 3,30 h / 2,5 h por dia.
 */

const fs = require('fs');
const path = require('path');

const H_POR_PUNTO = 3.3;
const H_POR_DIA = 2.5;
const RECURSOS = ['I1', 'I2', 'I3', 'I4', 'I5'];

// pred: [[clave, tipo, lagDias]] — tipo 'FC' (fin-comienzo) o 'CC' (comienzo-comienzo)
const SPRINTS = [
  {
    n: 1,
    nombre: 'Sprint 1 - Cimientos y agenda',
    refinement: 'Refinement Sprint 1 - conocimiento de las US',
    demo: 'Demo Sprint 1 (jue 08/10)',
    cierre: 'Testing de regresion y cierre Sprint 1',
    tareas: [
      {id: 'US-01', nom: 'US-01 Registro y gestion de la cuenta de usuario', pts: 4, due: 'I1', pred: [['REF1', 'FC', 0]]},
      {id: 'US-02', nom: 'US-02 Inicio de sesion con interfaz segun rol', pts: 3, due: 'I2', pred: [['US-01', 'CC', 2]]},
      {id: 'US-03', nom: 'US-03 Alta y baja de usuarios internos', pts: 3, due: 'I2', pred: [['US-02', 'CC', 2]]},
      {id: 'US-06', nom: 'US-06 Carga de disponibilidad mensual y validacion de jornadas', pts: 5, due: 'I5', pred: [['US-03', 'CC', 2]]},
      {id: 'US-08', nom: 'US-08 Generacion automatica de turnos de 30 minutos', pts: 4, due: 'I3', pred: [['US-06', 'FC', 0]]},
      {id: 'US-11', nom: 'US-11 Vista de agenda del profesional', pts: 4, due: 'I4', pred: [['US-08', 'CC', 2]]},
    ],
  },
  {
    n: 2,
    nombre: 'Sprint 2 - Ciclo de reserva de turnos',
    refinement: 'Refinement Sprint 2 - conocimiento de las US',
    demo: 'Demo Sprint 2 (jue 22/10)',
    cierre: 'Testing de regresion y cierre Sprint 2',
    tareas: [
      {id: 'US-21', nom: 'US-21 Servicio de envio de notificaciones por email', pts: 3, due: 'I1', pred: [['US-01', 'CC', 2]]},
      {id: 'US-10', nom: 'US-10 Apertura automatica de la agenda', pts: 2, due: 'I3', pred: [['US-08', 'FC', 0]]},
      {id: 'US-12', nom: 'US-12 Busqueda de disponibilidad de turnos', pts: 2, due: 'I4', pred: [['US-10', 'FC', 0]]},
      {id: 'US-13', nom: 'US-13 Reserva de turno', pts: 3, due: 'I2', pred: [['US-12', 'CC', 2]]},
      {id: 'US-14', nom: 'US-14 Confirmacion de reserva por email', pts: 2, due: 'I3', pred: [['US-13', 'FC', 0], ['US-21', 'FC', 0]]},
      {id: 'US-15', nom: 'US-15 Recordatorio automatico de turno', pts: 2, due: 'I5', pred: [['US-13', 'FC', 0], ['US-21', 'FC', 0]]},
      {id: 'US-16', nom: 'US-16 Cancelacion de turno por el paciente', pts: 2, due: 'I4', pred: [['US-13', 'FC', 0], ['US-21', 'FC', 0]]},
      {id: 'US-18', nom: 'US-18 Registro del estado del turno', pts: 2, due: 'I1', pred: [['US-13', 'FC', 0]]},
      {id: 'US-20', nom: 'US-20 Control de concurrencia en la reserva', pts: 2, due: 'I2', pred: [['US-13', 'FC', 0]]},
      {id: 'US-64', nom: 'US-64 Reserva de turno a nombre de otra persona', pts: 2, due: 'I5', pred: [['US-13', 'FC', 0]]},
      {id: 'BUG1a', nom: 'Correccion de bugs del Sprint 1 (I3)', pts: 1, due: 'I3', pred: [['US-13', 'FC', 0]]},
      {id: 'BUG1b', nom: 'Correccion de bugs del Sprint 1 (I4)', pts: 1, due: 'I4', pred: [['US-13', 'FC', 0]]},
      {id: 'BUG1c', nom: 'Correccion de bugs del Sprint 1 (I5)', pts: 1, due: 'I5', pred: [['US-13', 'FC', 0]]},
    ],
  },
  {
    n: 3,
    nombre: 'Sprint 3 - Pagos, historial clinico y reportes',
    refinement: 'Refinement Sprint 3 - conocimiento de las US',
    demo: 'Demo Sprint 3 (jue 12/11)',
    cierre: 'Testing de regresion y cierre Sprint 3',
    tareas: [
      {id: 'US-33', nom: 'US-33 Definicion del costo de la consulta por el medico', pts: 2, due: 'I5', pred: [['US-03', 'FC', 0]]},
      {id: 'US-32', nom: 'US-32 Gestion de la cobertura medica', pts: 2, due: 'I1', pred: [['US-64', 'FC', 0]]},
      {id: 'US-39', nom: 'US-39 Ficha de diagnostico del paciente', pts: 3, due: 'I3', pred: [['US-18', 'FC', 0]]},
      {id: 'US-45', nom: 'US-45 Reporte de turnos por especialidad', pts: 2, due: 'I4', pred: [['US-18', 'FC', 0]]},
      {id: 'US-34', nom: 'US-34 Calculo del importe segun cobertura', pts: 3, due: 'I1', pred: [['US-18', 'FC', 0], ['US-32', 'FC', 0], ['US-33', 'FC', 0]]},
      {id: 'US-40', nom: 'US-40 Consulta de la ficha del paciente', pts: 2, due: 'I3', pred: [['US-39', 'CC', 2]]},
      {id: 'US-41', nom: 'US-41 Historial clinico del paciente', pts: 2, due: 'I4', pred: [['US-39', 'CC', 2]]},
      {id: 'US-35', nom: 'US-35 Registro del pago en efectivo o por transferencia', pts: 2, due: 'I2', pred: [['US-34', 'FC', 0]]},
      {id: 'US-44', nom: 'US-44 Auditoria de accesos al historial', pts: 1, due: 'I4', pred: [['US-40', 'FC', 0], ['US-41', 'FC', 0]]},
      {id: 'US-36', nom: 'US-36 Comprobante de pago en PDF', pts: 2, due: 'I2', pred: [['US-35', 'FC', 0]]},
      {id: 'US-47', nom: 'US-47 Reporte de pagos realizados', pts: 1, due: 'I2', pred: [['US-35', 'FC', 0]]},
      {id: 'BUG2', nom: 'Correccion de bugs del Sprint 2', pts: 3, due: 'I5', pred: [['US-34', 'FC', 0]]},
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

addTask({key: 'ROOT', nom: 'Sala Medica Privada - Enunciado 2 (v5)', nivel: 1, summary: true});

for (const sp of SPRINTS) {
  const n = sp.n;
  addTask({key: 'SPR' + n, nom: sp.nombre, nivel: 2, summary: true});
  addTask({
    key: 'REF' + n, nom: sp.refinement, nivel: 3, dias: 1, horas: 0,
    pred: n === 1 ? [] : [['CIE' + (n - 1), 'FC', 0]],
  });
  for (const t of sp.tareas) {
    addTask({
      key: t.id, nom: t.nom, nivel: 3,
      dias: t.pts * H_POR_PUNTO / H_POR_DIA,
      horas: t.pts * H_POR_PUNTO,
      pred: t.pred, due: t.due, pts: t.pts,
    });
  }
  const ultimas = sp.tareas.map(t => t.id);
  addTask({key: 'DEM' + n, nom: sp.demo, nivel: 3, dias: 1, horas: 0, pred: ultimas.map(k => [k, 'FC', 0])});
  addTask({key: 'CIE' + n, nom: sp.cierre, nivel: 3, dias: 1, horas: 0, pred: [['DEM' + n, 'FC', 0]]});
}

addTask({key: 'CIERRE', nom: 'Cierre del proyecto e informe final', nivel: 2, dias: 5, horas: 0, pred: [['CIE3', 'FC', 0]]});

// ---------------------------------------------------------------- utilidades
const MIN_POR_DIA = H_POR_DIA * 60;

function dur(dias) { const m = Math.round(dias * MIN_POR_DIA); return `PT${Math.floor(m / 60)}H${m % 60}M0S`; }
function horas(h) { const m = Math.round(h * 60); return `PT${Math.floor(m / 60)}H${m % 60}M0S`; }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function weekDay(type, working) {
  if (!working) return `      <WeekDay><DayType>${type}</DayType><DayWorking>0</DayWorking></WeekDay>`;
  return `      <WeekDay><DayType>${type}</DayType><DayWorking>1</DayWorking>
        <WorkingTimes><WorkingTime><FromTime>09:00:00</FromTime><ToTime>11:30:00</ToTime></WorkingTime></WorkingTimes>
      </WeekDay>`;
}

// ---------------------------------------------------------------- salida MSPDI
const out = [];
out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
out.push('<Project xmlns="http://schemas.microsoft.com/project">');
out.push('  <Name>AuraHealth_v5.xml</Name>');
out.push('  <Title>Sala Medica Privada - plan de sprints v5</Title>');
out.push('  <Author>Comision de Analisis y Management</Author>');
out.push('  <ScheduleFromStart>1</ScheduleFromStart>');
out.push('  <StartDate>2026-09-28T09:00:00</StartDate>');
out.push('  <CalendarUID>1</CalendarUID>');
out.push('  <DefaultStartTime>09:00:00</DefaultStartTime>');
out.push('  <DefaultFinishTime>11:30:00</DefaultFinishTime>');
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
out.push('      <Name>Sala Medica - 2,5 h por dia</Name>');
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
    out.push(`      <Work>${horas(t.horas || 0)}</Work>`);
    out.push('      <EffortDriven>0</EffortDriven>');
    if (t.pts) {
      const h = (t.pts * H_POR_PUNTO).toFixed(1).replace('.', ',');
      const d = t.dias.toFixed(1).replace('.', ',');
      out.push(`      <Notes>${t.pts} puntos x 3,30 h = ${h} h. Implementador unico: ${t.due}, ${d} dias a 2,5 h por dia.</Notes>`);
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
  if (!t.due) continue;
  const ri = RECURSOS.indexOf(t.due);
  auid += 1;
  out.push('    <Assignment>');
  out.push(`      <UID>${auid}</UID>`);
  out.push(`      <TaskUID>${t.uid}</TaskUID>`);
  out.push(`      <ResourceUID>${ri + 1}</ResourceUID>`);
  out.push('      <Units>1</Units>');
  out.push(`      <Work>${horas(t.horas)}</Work>`);
  out.push('    </Assignment>');
}
out.push('  </Assignments>');
out.push('</Project>');

const dest = path.join(__dirname, 'AuraHealth_v5.xml');
fs.writeFileSync(dest, out.join('\n') + '\n', 'utf8');

// ---------------------------------------------------------------- verificacion
const conDuenio = tasks.filter(t => t.pts);
const historias = conDuenio.filter(t => t.key.startsWith('US-'));
const porRec = {};
let totalH = 0, totalP = 0;
for (const t of conDuenio) {
  totalP += t.pts; totalH += t.horas;
  porRec[t.due] = (porRec[t.due] || 0) + t.horas;
}
console.log(`OK  ${path.basename(dest)}  (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
console.log(`    ${tasks.length} tareas · ${historias.length} User Stories · ${totalP} puntos · ${totalH.toFixed(1)} h`);
console.log(`    ${auid} asignaciones para ${conDuenio.length} tareas con dueno` +
  (auid === conDuenio.length ? '  (un implementador por tarea)' : '  !! revisar'));
console.log('    horas por implementador:',
  RECURSOS.map(r => `${r} ${(porRec[r] || 0).toFixed(1)}`).join(' · '), '| tope 52,5 h');
