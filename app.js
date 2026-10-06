const UPDATE_SECONDS = 10;
const SIM_MINUTES_PER_TICK = 2;
const PAGE_SIZE = 20;
const MAX_VISIBLE_PATIENTS = 40;

let activeFilter = 'all';
let activeTriage = 'all';
let activeDoctor = 'all';
let currentPage = 1;
let impact = {discharges: 18, moves: 46, minutes: 384};
let nextId = 500;
let eventLog = [];
let previousRanks = new Map();

const services = ['Medicina Interna','Cardiología','Cirugía General','Neurología','Medicina Familiar','Ortopedia','Neumología','Gastroenterología'];
const locations = ['Box 03','Box 06','Box 09','Box 12','Box 17','Box 21','Observación 02','Observación 07','Observación 11','Sillas 04','Sillas 08','Fast Track 02'];
const doctors = ['Dra. Martínez','Dr. Rodríguez','Dra. Gómez','Dr. Herrera','Dra. López','Dr. Ramírez','Dra. Torres','Dr. Castro'];
const patients = [];

const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const rand = (a,b) => Math.floor(a + Math.random()*(b-a+1));
const chance = p => Math.random() < p;

function weightedTriage(){
  const r=Math.random();
  if(r<0.015) return 1;
  if(r<0.12) return 2;
  if(r<0.58) return 3;
  if(r<0.9) return 4;
  return 5;
}
function timeMinus(min){
  const d=new Date(Date.now()-min*60000);
  return d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false});
}
function nowTime(withSeconds=true){
  const opts={hour:'2-digit',minute:'2-digit',hour12:false};
  if(withSeconds) opts.second='2-digit';
  return new Date().toLocaleTimeString('es-CO',opts);
}
function stayText(m){
  const h=Math.floor(m/60), min=m%60;
  return h ? `${h} h ${String(min).padStart(2,'0')} min` : `${min} min`;
}

function basePatient(id){
  const stay=rand(18,680);
  return {
    id,
    location:pick(locations),
    service:pick(services),
    doctor:pick(doctors),
    stayMin:stay,
    triage:weightedTriage(),
    lab:'pending',
    image:'none',
    consult:'none',
    consultResult:'none',
    conduct:'pending',
    alert:'waiting',
    alertMin:0,
    stage:'triage',
    changed:false,
    events:[
      {t:timeMinus(stay),text:'Ingreso a Urgencias'},
      {t:timeMinus(Math.max(2,stay-rand(5,25))),text:'Triage registrado'}
    ]
  };
}

function configurePatient(p,kind){
  const stamp=timeMinus(rand(5,Math.max(6,p.stayMin-1)));

  if(kind==='critical'){
    p.stage='diagnostics';
    p.triage=Math.min(p.triage,2);
    p.lab='critical';
    p.image=chance(.6)?'reported':'performed';
    p.alert='critical';
    p.alertMin=rand(4,24);
    p.events.push({t:stamp,text:'Resultado crítico de laboratorio disponible'});
  } else if(kind==='imaging'){
    p.stage='diagnostics';
    p.lab='done';
    p.image='performed';
    p.consult=chance(.25)?'pending':'none';
    p.alert='imaging';
    p.alertMin=rand(8,95);
    p.events.push({t:stamp,text:'Imagen realizada · pendiente interpretación'});
  } else if(kind==='consult'){
    p.stage='consult';
    p.lab='done';
    p.image=chance(.6)?'reported':'not_required';
    p.consult='pending';
    p.alert='consult';
    p.alertMin=rand(10,110);
    p.events.push({t:stamp,text:'Interconsulta solicitada'});
  } else if(kind==='consult_discharge'){
    p.stage='redefinition';
    p.lab='done';
    p.image=chance(.7)?'reported':'not_required';
    p.consult='answered';
    p.consultResult='discharge';
    p.conduct='pending';
    p.alert='consult_discharge';
    p.alertMin=rand(8,80);
    p.events.push({t:stamp,text:'Especialidad respondió con concepto de egreso'});
  } else if(kind==='ready'){
    p.stage='redefinition';
    p.lab='done';
    p.image=chance(.65)?'reported':'not_required';
    p.consult=chance(.45)?'answered':'none';
    p.consultResult=p.consult==='answered'?'continue':'none';
    p.conduct='reevaluate';
    p.alert='ready';
    p.alertMin=rand(4,55);
    p.events.push({t:stamp,text:'Información clínica clave disponible'});
  } else if(kind==='discharge'){
    p.stage='destination';
    p.lab='done';
    p.image=chance(.6)?'reported':'not_required';
    p.consult=chance(.35)?'answered':'none';
    p.consultResult=p.consult==='answered'?'discharge':'none';
    p.conduct='discharge';
    p.alert='discharge';
    p.alertMin=rand(5,75);
    p.events.push({t:stamp,text:'Médico de Urgencias definió egreso · pendiente salida'});
  } else if(kind==='hospital'){
    p.stage='destination';
    p.lab='done';
    p.image=chance(.7)?'reported':'not_required';
    p.consult=chance(.5)?'answered':'none';
    p.consultResult=p.consult==='answered'?'hospitalize':'none';
    p.conduct='hospitalize';
    p.alert='hospital';
    p.alertMin=rand(20,180);
    p.events.push({t:stamp,text:'Médico de Urgencias definió hospitalización · pendiente cama'});
  } else {
    p.stage=pick(['triage','diagnostics','diagnostics','consult']);
    p.lab=chance(.55)?'done':'pending';
    p.image=chance(.35)?pick(['ordered','performed','reported']):'none';
    p.consult=chance(.2)?'pending':'none';
    p.alert='waiting';
    p.alertMin=0;
    p.events.push({t:stamp,text:'Atención en curso'});
  }
  return p;
}

function makePatient(id,kind='waiting'){
  return configurePatient(basePatient(id),kind);
}

function seedPatients(){
  const plan = [
    ['critical',6],
    ['imaging',26],
    ['consult',22],
    ['consult_discharge',18],
    ['ready',24],
    ['discharge',32],
    ['hospital',24],
    ['waiting',98]
  ];
  plan.forEach(([kind,n])=>{
    for(let i=0;i<n;i++){
      nextId++;
      patients.push(makePatient(nextId,kind));
    }
  });
}
seedPatients();

function alertTitle(p){
  return {
    critical:'Resultado crítico disponible',
    imaging:'Imagen realizada pendiente de interpretación',
    consult:'Interconsulta pendiente',
    consult_discharge:'Especialista sugiere egreso',
    ready:'Listo para redefinición médica',
    discharge:'Egreso definido por Urgencias',
    hospital:'Hospitalización definida esperando cama',
    waiting:'Atención en curso'
  }[p.alert] || 'Atención en curso';
}

function actionFor(p){
  return {
    critical:'Revisar resultado crítico y registrar conducta',
    imaging:'Gestionar interpretación de imagen',
    consult:'Gestionar respuesta de especialidad',
    consult_discharge:'Revisar interconsulta y definir conducta en Urgencias',
    ready:'Reevaluar y definir conducta',
    discharge:'Completar salida del paciente',
    hospital:'Continuar gestión de cama y traslado',
    waiting:'Continuar seguimiento'
  }[p.alert] || 'Continuar seguimiento';
}

function stateDetail(p){
  if(p.alert==='consult_discharge') return 'Especialidad ya respondió; Urgencias aún debe definir';
  if(p.alert==='ready') return 'Resultados e hitos clave disponibles';
  if(p.alert==='discharge') return 'Conducta de egreso ya registrada por Urgencias';
  if(p.alert==='hospital') return 'Hospitalización definida; falta cama / traslado';
  if(p.alert==='imaging') return 'Estudio realizado, informe pendiente';
  if(p.alert==='consult') return 'Solicitud enviada a especialidad';
  if(p.alert==='critical') return 'Requiere revisión prioritaria';
  return 'Proceso asistencial activo';
}

function priority(p){
  const base={
    critical:10,
    consult_discharge:9,
    ready:8,
    imaging:6,
    consult:5,
    discharge:4,
    hospital:3,
    waiting:1
  }[p.alert]||0;
  return base*10000 + p.alertMin*10 + p.stayMin/10;
}

function render(){
  renderHeadline();
  renderStages();
  renderTriage();
  renderActions();
  renderDoctorOptions();
  renderPatients();
  renderBottlenecks();
  renderEvents();
  renderImpact();
}

function renderHeadline(){
  const canAdvance=patients.filter(p=>['ready','consult_discharge','discharge'].includes(p.alert)).length;
  const barriers=patients.filter(p=>p.alert!=='waiting').length;
  document.querySelector('#kpiTotal').textContent=patients.length;
  document.querySelector('#kpiCanAdvance').textContent=canAdvance;
  document.querySelector('#kpiBarrier').textContent=barriers;
}

function renderStages(){
  const counts={
    triage:patients.filter(p=>p.stage==='triage').length,
    diagnostics:patients.filter(p=>p.stage==='diagnostics').length,
    consult:patients.filter(p=>p.stage==='consult').length,
    redefinition:patients.filter(p=>p.stage==='redefinition').length,
    destination:patients.filter(p=>p.stage==='destination').length
  };
  document.querySelector('#stageTriage').textContent=counts.triage;
  document.querySelector('#stageDiagnostics').textContent=counts.diagnostics;
  document.querySelector('#stageConsults').textContent=counts.consult;
  document.querySelector('#stageRedefinition').textContent=counts.redefinition;
  document.querySelector('#stageDestination').textContent=counts.destination;
}

function renderTriage(){
  for(let i=1;i<=5;i++){
    document.querySelector(`#triage${i}`).textContent=patients.filter(p=>p.triage===i).length;
  }
}

function renderActions(){
  document.querySelector('#actCritical').textContent=patients.filter(p=>p.alert==='critical').length;
  document.querySelector('#actImaging').textContent=patients.filter(p=>p.alert==='imaging').length;
  document.querySelector('#actConsultDischarge').textContent=patients.filter(p=>p.alert==='consult_discharge').length;
  document.querySelector('#actReady').textContent=patients.filter(p=>p.alert==='ready').length;
  document.querySelector('#actDischarge').textContent=patients.filter(p=>p.alert==='discharge').length;
  document.querySelector('#actHospital').textContent=patients.filter(p=>p.alert==='hospital').length;
}

function renderDoctorOptions(){
  const select=document.querySelector('#doctorFilter');
  if(select.options.length>1) return;
  doctors.forEach(d=>{
    const opt=document.createElement('option');
    opt.value=d;
    opt.textContent=d;
    select.appendChild(opt);
  });
}

function triageBadge(t){
  return `<span class="triage-badge t${t}">${t}</span>`;
}

function waitChip(p){
  if(!p.alertMin) return '<span class="wait-chip">En proceso</span>';
  const cls=p.alertMin>=60?'hot':p.alertMin>=30?'warn':'';
  return `<span class="wait-chip ${cls}">${p.alertMin} min</span>`;
}

function matchesAlertFilter(p){
  if(activeFilter==='all') return true;
  return p.alert===activeFilter;
}

function getFilteredRanked(){
  const sorted=[...patients].sort((a,b)=>priority(b)-priority(a));
  return sorted
    .filter(matchesAlertFilter)
    .filter(p=>activeTriage==='all'||String(p.triage)===activeTriage)
    .filter(p=>activeDoctor==='all'||p.doctor===activeDoctor)
    .slice(0,MAX_VISIBLE_PATIENTS);
}

function renderPatients(){
  const ranked=getFilteredRanked();
  const totalPages=Math.max(1,Math.ceil(ranked.length/PAGE_SIZE));
  if(currentPage>totalPages) currentPage=totalPages;

  const start=(currentPage-1)*PAGE_SIZE;
  const visible=ranked.slice(start,start+PAGE_SIZE);
  const body=document.querySelector('#patientsBody');
  body.innerHTML='';

  const filterText=[
    activeTriage!=='all'?`Triage ${activeTriage}`:null,
    activeDoctor!=='all'?activeDoctor:null
  ].filter(Boolean).join(' · ');

  document.querySelector('#visibleSummary').textContent=
    `Mostrando ${visible.length} pacientes de los ${Math.min(ranked.length,MAX_VISIBLE_PATIENTS)} más prioritarios${filterText?' · '+filterText:''} · ${patients.length} activos.`;

  const newRanks=new Map();
  ranked.forEach((p,idx)=>newRanks.set(p.id,idx));

  visible.forEach(p=>{
    const globalRank=newRanks.get(p.id);
    const oldRank=previousRanks.get(p.id);
    const tr=document.createElement('tr');

    if(oldRank!==undefined && globalRank<oldRank) tr.classList.add('row-rise');
    else if(p.changed) tr.classList.add('flash');

    tr.innerHTML=`
      <td>
        <span class="patient-name">Paciente ${String(p.id).padStart(3,'0')}</span>
        <span class="sub">${p.location} · ${p.service}</span>
      </td>
      <td>${triageBadge(p.triage)}</td>
      <td><span class="doctor-name">${p.doctor}</span></td>
      <td><b>${stayText(p.stayMin)}</b></td>
      <td>
        <span class="state-title">${oldRank!==undefined && globalRank<oldRank?'↑ ':''}${alertTitle(p)}</span>
        <span class="state-sub">${stateDetail(p)}</span>
      </td>
      <td>${waitChip(p)}</td>
      <td><span class="action-link">${actionFor(p)}</span></td>
    `;

    tr.onclick=()=>openPatient(p);
    body.appendChild(tr);
    setTimeout(()=>p.changed=false,1600);
  });

  previousRanks=newRanks;
  document.querySelector('#pageLabel').textContent=`Página ${currentPage} de ${totalPages}`;
  document.querySelector('#prevPage').disabled=currentPage<=1;
  document.querySelector('#nextPage').disabled=currentPage>=totalPages;
}

function renderBottlenecks(){
  const data=[
    ['Radiología',patients.filter(p=>p.alert==='imaging').length],
    ['Interconsultas',patients.filter(p=>p.alert==='consult').length],
    ['Concepto egreso',patients.filter(p=>p.alert==='consult_discharge').length],
    ['Reevaluación',patients.filter(p=>p.alert==='ready').length],
    ['Salida pendiente',patients.filter(p=>p.alert==='discharge').length],
    ['Esperando cama',patients.filter(p=>p.alert==='hospital').length]
  ];
  document.querySelector('#bottleneckTotal').textContent=data.reduce((a,b)=>a+b[1],0);
  const max=Math.max(1,...data.map(x=>x[1]));
  document.querySelector('#bottlenecks').innerHTML=data.map(([n,v])=>
    `<div class="brow"><span>${n}</span><div class="bar"><i style="width:${Math.max(5,v/max*100)}%"></i></div><b>${v}</b></div>`
  ).join('');
}

function renderEvents(){
  document.querySelector('#eventFeed').innerHTML=
    eventLog.slice(0,14).map(e=>
      `<div class="event-item"><time>${e.time}</time><div><b>${e.title}</b><span>${e.text}</span></div></div>`
    ).join('') ||
    '<div class="event-item"><time>ahora</time><div><b>Simulación iniciada</b><span>Esperando el siguiente evento.</span></div></div>';
}

function renderImpact(){
  document.querySelector('#impactDischarges').textContent=impact.discharges;
  document.querySelector('#impactMoves').textContent=impact.moves;
  document.querySelector('#impactMinutes').textContent=impact.minutes;
}

function logEvent(title,text,toast=false){
  eventLog.unshift({time:nowTime(false),title,text});
  eventLog=eventLog.slice(0,30);
  if(toast) showToast(title,text);
}

function showToast(title,text){
  const t=document.querySelector('#toast');
  t.innerHTML=`<strong>${title}</strong><span>${text}</span>`;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),4200);
}

const displayStatus={
  lab:{pending:'Pendiente',done:'Completo',critical:'Resultado crítico'},
  image:{none:'No solicitada',ordered:'Solicitada',performed:'Realizada sin informe',reported:'Interpretada',not_required:'No requerida'},
  consult:{none:'No solicitada',pending:'Pendiente',answered:'Respondida'},
  conduct:{pending:'Pendiente',reevaluate:'Reevaluar',discharge:'Egreso definido',hospitalize:'Hospitalizar'}
};

function openPatient(p){
  document.querySelector('#drawerTitle').textContent=`Paciente ${String(p.id).padStart(3,'0')}`;
  document.querySelector('#drawerSub').textContent=`${p.location} · ${p.service} · Triage ${p.triage} · ${p.doctor} · ${stayText(p.stayMin)}`;
  document.querySelector('#drawerLab').textContent=displayStatus.lab[p.lab]||p.lab;
  document.querySelector('#drawerImage').textContent=displayStatus.image[p.image]||p.image;
  document.querySelector('#drawerConsult').textContent=
    p.consultResult==='discharge'?'Respondida · concepto egreso':
    p.consultResult==='hospitalize'?'Respondida · hospitalizar':
    displayStatus.consult[p.consult]||p.consult;
  document.querySelector('#drawerConduct').textContent=displayStatus.conduct[p.conduct]||p.conduct;
  document.querySelector('#timeline').innerHTML=p.events.slice(-10).map(e=>
    `<div class="tl-event"><strong>${e.t}</strong><span>${e.text}</span></div>`
  ).join('');
  document.querySelector('#drawerAction').textContent=actionFor(p);
  document.querySelector('#drawer').classList.add('open');
}

document.querySelector('#drawerClose').onclick=()=>document.querySelector('#drawer').classList.remove('open');

function setFilter(filter){
  activeFilter=filter;
  currentPage=1;
  document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter===filter));
  renderPatients();
}

document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>setFilter(b.dataset.filter));
document.querySelectorAll('.action-card').forEach(b=>b.onclick=()=>{
  setFilter(b.dataset.filter);
  document.querySelector('.table-panel').scrollIntoView({behavior:'smooth',block:'start'});
});

document.querySelector('#triageFilter').onchange=e=>{
  activeTriage=e.target.value;
  currentPage=1;
  renderPatients();
};

document.querySelector('#doctorFilter').onchange=e=>{
  activeDoctor=e.target.value;
  currentPage=1;
  renderPatients();
};

document.querySelector('#prevPage').onclick=()=>{
  if(currentPage>1){currentPage--;renderPatients();}
};

document.querySelector('#nextPage').onclick=()=>{
  const pages=Math.max(1,Math.ceil(getFilteredRanked().length/PAGE_SIZE));
  if(currentPage<pages){currentPage++;renderPatients();}
};

const architectureModal=document.querySelector('#architectureModal');
document.querySelector('#architectureBtn').onclick=()=>{
  architectureModal.classList.add('open');
  architectureModal.setAttribute('aria-hidden','false');
};
document.querySelector('#architectureClose').onclick=closeArchitecture;
architectureModal.onclick=e=>{if(e.target===architectureModal)closeArchitecture();};
function closeArchitecture(){
  architectureModal.classList.remove('open');
  architectureModal.setAttribute('aria-hidden','true');
}

function simulationTick(){
  patients.forEach(p=>{
    p.stayMin+=SIM_MINUTES_PER_TICK;
    if(p.alertMin>0) p.alertMin+=SIM_MINUTES_PER_TICK;
  });

  const updates=rand(7,12);
  for(let i=0;i<updates;i++) advanceRandomPatient();

  let exits=rand(1,3);
  if(patients.length>252) exits++;
  for(let i=0;i<exits;i++) completeExit();

  let entries=rand(1,3);
  if(patients.length<248) entries+=2;
  for(let i=0;i<entries;i++) addPatient();

  while(patients.length>256) completeExit();
  while(patients.length<244) addPatient();

  document.querySelector('#lastUpdate').textContent=nowTime();
  document.querySelector('#liveLabel').textContent='Actualizando...';
  setTimeout(()=>document.querySelector('#liveLabel').textContent='Monitor activo · Demo simulada',1200);

  render();
}

function addPatient(){
  nextId++;
  const p=makePatient(nextId,'waiting');
  p.stayMin=rand(5,35);
  p.triage=weightedTriage();
  p.doctor=pick(doctors);
  p.events=[
    {t:nowTime(false),text:'Nuevo ingreso a Urgencias'},
    {t:nowTime(false),text:`Triage ${p.triage} registrado`}
  ];
  p.changed=true;
  patients.push(p);
  logEvent('Nuevo ingreso',`Paciente ${String(p.id).padStart(3,'0')} · Triage ${p.triage} · ${p.location}.`,chance(.2));
}

function completeExit(){
  const discharge=patients.filter(p=>p.alert==='discharge');
  const hospital=patients.filter(p=>p.alert==='hospital'&&p.alertMin>35);
  const candidates=chance(.75)&&discharge.length?discharge:hospital;

  if(!candidates.length) return;

  const p=pick(candidates);
  patients.splice(patients.indexOf(p),1);
  impact.moves++;

  if(p.alert==='discharge'){
    impact.discharges++;
    impact.minutes+=rand(8,32);
    logEvent('Salida completada',`Paciente ${String(p.id).padStart(3,'0')} salió de Urgencias y liberó capacidad.`,true);
  } else {
    logEvent('Traslado a hospitalización',`Paciente ${String(p.id).padStart(3,'0')} recibió cama y salió de Urgencias.`,chance(.25));
  }
}

function advanceRandomPatient(){
  const p=pick(patients);
  if(!p) return;

  const stamp=nowTime(false);
  let changed=true;

  if(p.alert==='critical'){
    p.lab='done';
    p.stage='redefinition';
    p.alert='ready';
    p.alertMin=0;
    p.conduct='reevaluate';
    p.events.push({t:stamp,text:'Resultado crítico validado · pendiente nueva conducta'});
    logEvent('Resultado crítico validado',`Paciente ${String(p.id).padStart(3,'0')} sube a redefinición.`,true);
    impact.moves++;
    impact.minutes+=rand(4,12);
  }

  else if(p.alert==='imaging'){
    p.image='reported';
    p.events.push({t:stamp,text:'Imagen interpretada'});

    if(p.lab==='done'&&(p.consult==='answered'||p.consult==='none')){
      p.stage='redefinition';

      if(p.consultResult==='discharge'){
        p.alert='consult_discharge';
        p.alertMin=0;
        p.conduct='pending';
        logEvent('Imagen + interconsulta completas',`Paciente ${String(p.id).padStart(3,'0')} tiene concepto de egreso pendiente de revisión por Urgencias.`,true);
      } else {
        p.alert='ready';
        p.alertMin=0;
        p.conduct='reevaluate';
        logEvent('Imagen interpretada',`Paciente ${String(p.id).padStart(3,'0')} quedó listo para redefinición.`,true);
      }

      impact.moves++;
    } else {
      p.alert='waiting';
      p.stage=p.consult==='pending'?'consult':'diagnostics';
      logEvent('Imagen interpretada',`Paciente ${String(p.id).padStart(3,'0')} ya tiene informe de Radiología.`);
    }
  }

  else if(p.alert==='consult'){
    p.consult='answered';
    p.consultResult=chance(.58)?'discharge':chance(.45)?'hospitalize':'continue';
    p.events.push({
      t:stamp,
      text:p.consultResult==='discharge'?'Interconsulta respondida · especialista sugiere egreso':
           p.consultResult==='hospitalize'?'Interconsulta respondida · especialista sugiere hospitalización':
           'Interconsulta respondida · continuar manejo'
    });

    if(p.consultResult==='discharge'){
      p.stage='redefinition';
      p.alert='consult_discharge';
      p.alertMin=0;
      p.conduct='pending';
      logEvent('Concepto de egreso',`Paciente ${String(p.id).padStart(3,'0')} espera revisión del médico de Urgencias.`,true);
      impact.moves++;
    }
    else if(p.lab==='done'&&(p.image==='reported'||p.image==='not_required'||p.image==='none')){
      p.stage='redefinition';
      p.alert='ready';
      p.alertMin=0;
      p.conduct='reevaluate';
      logEvent('Interconsulta respondida',`Paciente ${String(p.id).padStart(3,'0')} quedó listo para redefinición.`,true);
      impact.moves++;
    } else {
      p.alert='waiting';
      p.stage='diagnostics';
    }
  }

  else if(p.alert==='consult_discharge'){
    p.stage='destination';
    if(chance(.9)){
      p.conduct='discharge';
      p.alert='discharge';
      p.alertMin=0;
      p.events.push({t:stamp,text:'Médico de Urgencias revisó interconsulta y definió egreso'});
      logEvent('Egreso definido por Urgencias',`Paciente ${String(p.id).padStart(3,'0')} pasa a completar su salida.`,true);
    } else {
      p.conduct='reevaluate';
      p.alert='ready';
      p.alertMin=0;
      p.events.push({t:stamp,text:'Médico de Urgencias revisó interconsulta y mantiene reevaluación'});
      logEvent('Conducta redefinida',`Paciente ${String(p.id).padStart(3,'0')} requiere nueva reevaluación.`);
    }
    impact.moves++;
    impact.minutes+=rand(6,20);
  }

  else if(p.alert==='ready'){
    p.conduct=chance(.83)?'discharge':'hospitalize';
    p.stage='destination';
    p.alertMin=0;
    p.events.push({
      t:stamp,
      text:p.conduct==='discharge'?'Médico de Urgencias definió egreso':'Médico de Urgencias definió hospitalización'
    });

    if(p.conduct==='discharge'){
      p.alert='discharge';
      logEvent('Egreso definido por Urgencias',`Paciente ${String(p.id).padStart(3,'0')} pasa a completar su salida.`,true);
    } else {
      p.alert='hospital';
      logEvent('Hospitalización definida',`Paciente ${String(p.id).padStart(3,'0')} queda pendiente de cama.`);
    }

    impact.moves++;
    impact.minutes+=rand(5,18);
  }

  else if(p.alert==='waiting'){
    const choices=[];

    if(p.stage==='triage') choices.push('valuate','valuate');
    if(p.lab==='pending') choices.push('lab','lab');
    if(p.image==='ordered') choices.push('imagePerform');
    if(p.image==='performed') choices.push('imageReport');
    if(p.consult==='pending') choices.push('consult');

    if(!choices.length) choices.push('lab','consultRequest','imageOrder');

    const action=pick(choices);

    if(action==='valuate'){
      p.stage='diagnostics';
      p.events.push({t:stamp,text:'Valoración médica completada'});
      logEvent('Valoración completada',`Paciente ${String(p.id).padStart(3,'0')} inicia definición diagnóstica.`);
    }

    else if(action==='lab'){
      p.lab=chance(.04)?'critical':'done';
      p.events.push({t:stamp,text:p.lab==='critical'?'Resultado crítico disponible':'Laboratorios completos'});

      if(p.lab==='critical'){
        p.alert='critical';
        p.alertMin=0;
        logEvent('Resultado crítico',`Paciente ${String(p.id).padStart(3,'0')} requiere revisión inmediata.`,true);
      } else if((p.image==='reported'||p.image==='not_required'||p.image==='none')&&(p.consult==='answered'||p.consult==='none')&&chance(.55)){
        p.stage='redefinition';

        if(p.consultResult==='discharge'){
          p.alert='consult_discharge';
          p.conduct='pending';
          p.alertMin=0;
          logEvent('Paciente listo para revisión',`Paciente ${String(p.id).padStart(3,'0')} tiene concepto de egreso pendiente de Urgencias.`,chance(.3));
        } else {
          p.alert='ready';
          p.alertMin=0;
          p.conduct='reevaluate';
          logEvent('Laboratorios completos',`Paciente ${String(p.id).padStart(3,'0')} quedó listo para redefinición.`,chance(.3));
        }

        impact.moves++;
      } else {
        logEvent('Laboratorio actualizado',`Paciente ${String(p.id).padStart(3,'0')} ya tiene resultados disponibles.`);
      }
    }

    else if(action==='imageOrder'){
      p.image='ordered';
      p.stage='diagnostics';
      p.events.push({t:stamp,text:'Imagen solicitada'});
    }

    else if(action==='imagePerform'){
      p.image='performed';
      p.alert='imaging';
      p.alertMin=0;
      p.events.push({t:stamp,text:'Imagen realizada · pendiente interpretación'});
      logEvent('Imagen realizada',`Paciente ${String(p.id).padStart(3,'0')} queda pendiente de Radiología.`);
    }

    else if(action==='imageReport'){
      p.image='reported';
      p.events.push({t:stamp,text:'Imagen interpretada'});
      logEvent('Imagen interpretada',`Paciente ${String(p.id).padStart(3,'0')} ya tiene informe.`);
    }

    else if(action==='consultRequest'){
      p.consult='pending';
      p.stage='consult';
      p.alert='consult';
      p.alertMin=0;
      p.events.push({t:stamp,text:'Interconsulta solicitada'});
      logEvent('Nueva interconsulta',`Paciente ${String(p.id).padStart(3,'0')} espera especialidad.`);
    }
  }

  else if(p.alert==='discharge'){
    if(chance(.34)){
      impact.minutes+=rand(4,14);
      p.events.push({t:stamp,text:'Actividad de salida completada'});
      logEvent('Salida avanza',`Paciente ${String(p.id).padStart(3,'0')} completó una actividad posterior al egreso.`);
    } else changed=false;
  }

  else if(p.alert==='hospital'){
    if(chance(.18)){
      logEvent('Gestión de cama',`Paciente ${String(p.id).padStart(3,'0')} continúa pendiente de asignación.`);
    } else changed=false;
  }

  p.changed=changed;
}

function updateClock(){
  document.querySelector('#clock').textContent=nowTime();
}

setInterval(updateClock,1000);
setInterval(simulationTick,UPDATE_SECONDS*1000);

document.querySelector('#lastUpdate').textContent=nowTime();
logEvent('Monitor iniciado',`${patients.length} pacientes activos. Los eventos se actualizan automáticamente cada 10 segundos.`);
render();
updateClock();
