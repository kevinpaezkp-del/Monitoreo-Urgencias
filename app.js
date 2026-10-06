const UPDATE_SECONDS = 10;
const SIM_MINUTES_PER_TICK = 2;
const PAGE_SIZE = 20;
const MAX_VISIBLE_PATIENTS = 40;

let activeFilter = 'all';
let activeTriage = 'all';
let activeDoctor = 'all';
let currentPage = 1;
let impact = {resolved: 31, moves: 74, minutes: 512};
let nextId = 700;
let eventLog = [];
let previousRanks = new Map();

const services = [
  'Medicina Interna','Cardiología','Cirugía General','Neurología',
  'Medicina Familiar','Ortopedia','Neumología','Gastroenterología'
];

const locations = [
  'Box 03','Box 06','Box 09','Box 12','Box 17','Box 21',
  'Observación 02','Observación 07','Observación 11','Sillas 04',
  'Sillas 08','Fast Track 02'
];

const doctors = [
  'Dra. Martínez','Dr. Rodríguez','Dra. Gómez','Dr. Herrera',
  'Dra. López','Dr. Ramírez','Dra. Torres','Dr. Castro'
];

const patients = [];

const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const rand = (a,b) => Math.floor(a + Math.random()*(b-a+1));
const chance = p => Math.random() < p;

function weightedTriage(){
  const r=Math.random();
  if(r<0.015) return 1;
  if(r<0.12) return 2;
  if(r<0.58) return 3;
  if(r<0.90) return 4;
  return 5;
}

function nowTime(withSeconds=true){
  const opts={hour:'2-digit',minute:'2-digit',hour12:false};
  if(withSeconds) opts.second='2-digit';
  return new Date().toLocaleTimeString('es-CO',opts);
}

function timeAgo(minutesAgo){
  const d=new Date(Date.now()-minutesAgo*60000);
  return d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false});
}

function stayText(m){
  const h=Math.floor(m/60), min=m%60;
  return h ? `${h} h ${String(min).padStart(2,'0')} min` : `${min} min`;
}

function makeBasePatient(id){
  const stayMin=rand(35,720);
  const p={
    id,
    location:pick(locations),
    service:pick(services),
    doctor:pick(doctors),
    stayMin,
    triage:weightedTriage(),
    lab:'none',
    image:'none',
    consult:'none',
    conduct:'pending',
    alert:'in_progress',
    alertMin:0,
    stage:'diagnostics',
    changed:false,
    events:[]
  };

  addInitialEvent(p, stayMin, 'Ingreso a Urgencias');
  addInitialEvent(p, Math.max(1,stayMin-rand(5,14)), `Triage ${p.triage} registrado`);
  return p;
}

function addInitialEvent(p,minutesAgo,text){
  p.events.push({t:timeAgo(minutesAgo),text});
}

function configurePatient(p,state){
  const s=p.stayMin;
  const t1=Math.max(2,s-rand(12,28));
  const t2=Math.max(2,s-rand(30,55));
  const t3=Math.max(2,s-rand(58,95));
  const t4=Math.max(2,s-rand(100,145));
  const t5=Math.max(2,s-rand(150,210));

  if(state==='assessment'){
    p.stage='assessment';
    p.alert='assessment';
    p.alertMin=rand(5,45);
    p.doctor='Pendiente asignación';
    p.events.push({t:timeAgo(t1),text:'Pendiente valoración médica inicial'});
  }

  else if(state==='lab_pending'){
    p.stage='diagnostics';
    p.alert='lab_pending';
    p.alertMin=rand(12,85);
    p.lab='pending';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    p.events.push({t:timeAgo(t2),text:'Laboratorios solicitados'});
    if(chance(.75)) p.events.push({t:timeAgo(t3),text:'Muestra tomada · resultado pendiente'});
  }

  else if(state==='lab_ready'){
    p.stage='redefinition';
    p.alert='lab_ready';
    p.alertMin=rand(4,55);
    p.lab='ready';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    p.events.push({t:timeAgo(t2),text:'Laboratorios solicitados'});
    p.events.push({t:timeAgo(t3),text:'Muestra tomada'});
    p.events.push({t:timeAgo(t4),text:'Resultados de laboratorio disponibles'});
  }

  else if(state==='image_pending'){
    p.stage='diagnostics';
    p.alert='image_pending';
    p.alertMin=rand(8,95);
    p.lab=chance(.55)?'ready':'done';
    p.image='ordered';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    if(p.lab!=='none') p.events.push({t:timeAgo(t2),text:'Laboratorios disponibles'});
    p.events.push({t:timeAgo(t3),text:'Imagen diagnóstica solicitada'});
  }

  else if(state==='image_interpretation'){
    p.stage='diagnostics';
    p.alert='image_interpretation';
    p.alertMin=rand(8,110);
    p.lab='done';
    p.image='performed';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    p.events.push({t:timeAgo(t2),text:'Laboratorios revisados'});
    p.events.push({t:timeAgo(t3),text:'Imagen diagnóstica solicitada'});
    p.events.push({t:timeAgo(t4),text:'Imagen realizada · pendiente interpretación'});
  }

  else if(state==='consult_pending'){
    p.stage='consult';
    p.alert='consult_pending';
    p.alertMin=rand(12,130);
    p.lab='done';
    p.image=chance(.55)?'reported':'not_required';
    p.consult='pending';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    p.events.push({t:timeAgo(t2),text:'Ayudas diagnósticas revisadas'});
    if(p.image==='reported') p.events.push({t:timeAgo(t3),text:'Imagen interpretada'});
    p.events.push({t:timeAgo(t4),text:'Interconsulta solicitada'});
  }

  else if(state==='consult_answered'){
    p.stage='redefinition';
    p.alert='consult_answered';
    p.alertMin=rand(5,95);
    p.lab='done';
    p.image=chance(.55)?'reported':'not_required';
    p.consult='answered';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    p.events.push({t:timeAgo(t2),text:'Ayudas diagnósticas revisadas'});
    p.events.push({t:timeAgo(t3),text:'Interconsulta solicitada'});
    p.events.push({t:timeAgo(t4),text:'Especialidad respondió la interconsulta'});
    p.events.push({t:timeAgo(t5),text:'Pendiente revisión por médico de Urgencias para definir conducta'});
  }

  else if(state==='ready_redefine'){
    p.stage='redefinition';
    p.alert='ready_redefine';
    p.alertMin=rand(4,65);
    p.lab='done';
    p.image=chance(.6)?'reported':'not_required';
    p.consult=chance(.35)?'answered':'none';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    p.events.push({t:timeAgo(t2),text:'Laboratorios disponibles'});
    if(p.image==='reported') p.events.push({t:timeAgo(t3),text:'Imagen interpretada'});
    if(p.consult==='answered') p.events.push({t:timeAgo(t4),text:'Interconsulta respondida'});
    p.events.push({t:timeAgo(t5),text:'Información necesaria disponible · pendiente redefinición'});
  }

  else if(state==='critical'){
    p.stage='redefinition';
    p.alert='critical';
    p.alertMin=rand(2,25);
    p.lab='critical';
    p.image=chance(.4)?'reported':'none';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    p.events.push({t:timeAgo(t2),text:'Laboratorios solicitados'});
    p.events.push({t:timeAgo(t3),text:'Muestra procesada'});
    p.events.push({t:timeAgo(t4),text:'Resultado crítico disponible'});
  }

  else if(state==='bed_wait'){
    p.stage='destination';
    p.alert='bed_wait';
    p.alertMin=rand(35,220);
    p.lab='done';
    p.image=chance(.65)?'reported':'not_required';
    p.consult=chance(.45)?'answered':'none';
    p.conduct='hospitalize';
    p.events.push({t:timeAgo(t1),text:'Valoración médica completada'});
    p.events.push({t:timeAgo(t2),text:'Ayudas diagnósticas revisadas'});
    if(p.consult==='answered') p.events.push({t:timeAgo(t3),text:'Interconsulta respondida'});
    p.events.push({t:timeAgo(t4),text:'Médico de Urgencias definió hospitalización'});
    p.events.push({t:timeAgo(t5),text:'Solicitud de cama activa'});
  }

  else {
    p.stage=pick(['assessment','diagnostics','diagnostics','consult']);
    p.alert='in_progress';
    p.lab=chance(.45)?'pending':'none';
    p.image=chance(.3)?'ordered':'none';
    p.consult=chance(.15)?'pending':'none';
    p.events.push({t:timeAgo(t1),text:'Atención clínica en curso'});
    if(p.lab==='pending') p.events.push({t:timeAgo(t2),text:'Laboratorios solicitados'});
    if(p.image==='ordered') p.events.push({t:timeAgo(t3),text:'Imagen diagnóstica solicitada'});
    if(p.consult==='pending') p.events.push({t:timeAgo(t4),text:'Interconsulta solicitada'});
  }

  p.events.sort((a,b)=>a.t.localeCompare(b.t));
  return p;
}

function makePatient(id,state){
  return configurePatient(makeBasePatient(id),state);
}

function seedPatients(){
  const plan=[
    ['critical',6],
    ['assessment',18],
    ['lab_pending',30],
    ['lab_ready',28],
    ['image_pending',22],
    ['image_interpretation',24],
    ['consult_pending',24],
    ['consult_answered',26],
    ['ready_redefine',24],
    ['bed_wait',18],
    ['in_progress',50]
  ];

  // total = 270 initially; trim to 250 after shuffling for natural mix
  plan.forEach(([state,n])=>{
    for(let i=0;i<n;i++){
      nextId++;
      patients.push(makePatient(nextId,state));
    }
  });

  while(patients.length>250){
    const idx=rand(0,patients.length-1);
    if(patients[idx].alert==='in_progress') patients.splice(idx,1);
    else {
      const genericIdx=patients.findIndex(x=>x.alert==='in_progress');
      if(genericIdx>=0) patients.splice(genericIdx,1);
      else patients.splice(idx,1);
    }
  }
}
seedPatients();

function alertTitle(p){
  return {
    assessment:'Pendiente valoración médica',
    lab_pending:'Laboratorio pendiente',
    lab_ready:'Laboratorio listo para revisar',
    image_pending:'Imagen pendiente de realización',
    image_interpretation:'Imagen pendiente de interpretación',
    consult_pending:'Interconsulta pendiente',
    consult_answered:'Interconsulta respondida',
    ready_redefine:'Listo para redefinir conducta',
    critical:'Resultado crítico disponible',
    bed_wait:'Hospitalización definida · esperando cama',
    in_progress:'Atención en curso'
  }[p.alert] || 'Atención en curso';
}

function stateDetail(p){
  return {
    assessment:'Aún no inicia valoración médica',
    lab_pending:'Orden activa · resultado aún no disponible',
    lab_ready:'Resultado nuevo · pendiente revisión médica',
    image_pending:'Estudio solicitado · aún no realizado',
    image_interpretation:'Estudio realizado · informe pendiente',
    consult_pending:'Solicitud enviada · especialidad sin respuesta',
    consult_answered:'Especialidad respondió · Urgencias debe revisar y definir',
    ready_redefine:'Información necesaria disponible',
    critical:'Requiere revisión prioritaria',
    bed_wait:'Conducta definida · falta disponibilidad de cama',
    in_progress:'Proceso asistencial activo'
  }[p.alert] || 'Proceso asistencial activo';
}

function actionFor(p){
  return {
    assessment:'Realizar valoración médica',
    lab_pending:'Seguimiento a laboratorio',
    lab_ready:'Revisar resultado y redefinir',
    image_pending:'Gestionar realización del estudio',
    image_interpretation:'Gestionar / revisar interpretación',
    consult_pending:'Seguimiento a interconsulta',
    consult_answered:'Revisar respuesta y definir conducta',
    ready_redefine:'Reevaluar y definir conducta',
    critical:'Revisar resultado crítico',
    bed_wait:'Continuar gestión de cama',
    in_progress:'Continuar seguimiento'
  }[p.alert] || 'Continuar seguimiento';
}

function priority(p){
  const base={
    critical:11,
    consult_answered:10,
    lab_ready:9,
    ready_redefine:8,
    image_interpretation:7,
    assessment:6,
    consult_pending:5,
    lab_pending:4,
    image_pending:4,
    bed_wait:3,
    in_progress:1
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
  const requiresReview=patients.filter(p=>['critical','lab_ready','consult_answered','ready_redefine'].includes(p.alert)).length;
  const barriers=patients.filter(p=>['assessment','lab_pending','image_pending','image_interpretation','consult_pending','bed_wait'].includes(p.alert)).length;
  document.querySelector('#kpiTotal').textContent=patients.length;
  document.querySelector('#kpiCanAdvance').textContent=requiresReview;
  document.querySelector('#kpiBarrier').textContent=barriers;
}

function renderStages(){
  document.querySelector('#stageAssessment').textContent=patients.filter(p=>p.stage==='assessment').length;
  document.querySelector('#stageDiagnostics').textContent=patients.filter(p=>p.stage==='diagnostics').length;
  document.querySelector('#stageConsults').textContent=patients.filter(p=>p.stage==='consult').length;
  document.querySelector('#stageRedefinition').textContent=patients.filter(p=>p.stage==='redefinition').length;
  document.querySelector('#stageDestination').textContent=patients.filter(p=>p.stage==='destination').length;
}

function renderTriage(){
  for(let i=1;i<=5;i++){
    document.querySelector(`#triage${i}`).textContent=patients.filter(p=>p.triage===i).length;
  }
}

function renderActions(){
  document.querySelector('#actLabPending').textContent=patients.filter(p=>p.alert==='lab_pending').length;
  document.querySelector('#actLabReady').textContent=patients.filter(p=>p.alert==='lab_ready').length;
  document.querySelector('#actImagePending').textContent=patients.filter(p=>p.alert==='image_pending').length;
  document.querySelector('#actImageInterpretation').textContent=patients.filter(p=>p.alert==='image_interpretation').length;
  document.querySelector('#actConsultPending').textContent=patients.filter(p=>p.alert==='consult_pending').length;
  document.querySelector('#actConsultAnswered').textContent=patients.filter(p=>p.alert==='consult_answered').length;
}

function renderDoctorOptions(){
  const select=document.querySelector('#doctorFilter');
  if(select.options.length>1) return;

  [...doctors,'Pendiente asignación'].forEach(d=>{
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

function matchesProcessFilter(p){
  if(activeFilter==='all') return true;

  const groups={
    assessment:['assessment'],
    lab:['lab_pending','lab_ready','critical'],
    image:['image_pending','image_interpretation'],
    consult:['consult_pending','consult_answered'],
    redefine:['ready_redefine','lab_ready','consult_answered','critical'],
    bed_wait:['bed_wait']
  };

  if(groups[activeFilter]) return groups[activeFilter].includes(p.alert);
  return p.alert===activeFilter;
}

function eligiblePatients(){
  return patients
    .filter(matchesProcessFilter)
    .filter(p=>activeTriage==='all'||String(p.triage)===activeTriage)
    .filter(p=>activeDoctor==='all'||p.doctor===activeDoctor);
}

function getDiverseRanked(){
  const eligible=eligiblePatients();

  if(activeFilter!=='all'){
    return eligible.sort((a,b)=>priority(b)-priority(a)).slice(0,MAX_VISIBLE_PATIENTS);
  }

  const statusOrder=[
    'critical','consult_answered','lab_ready','image_interpretation',
    'ready_redefine','assessment','lab_pending','image_pending',
    'consult_pending','bed_wait','in_progress'
  ];

  const buckets={};
  statusOrder.forEach(s=>{
    buckets[s]=eligible
      .filter(p=>p.alert===s)
      .sort((a,b)=>priority(b)-priority(a));
  });

  const result=[];
  let round=0;

  while(result.length<MAX_VISIBLE_PATIENTS){
    let added=false;

    for(const state of statusOrder){
      const bucket=buckets[state];
      if(bucket && bucket[round]){
        result.push(bucket[round]);
        added=true;
        if(result.length>=MAX_VISIBLE_PATIENTS) break;
      }
    }

    if(!added) break;
    round++;
  }

  return result;
}

function renderPatients(){
  const ranked=getDiverseRanked();
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
    `Mostrando ${visible.length} pacientes de una vista priorizada de ${Math.min(ranked.length,MAX_VISIBLE_PATIENTS)}${filterText?' · '+filterText:''} · ${patients.length} activos.`;

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
    ['Valoración',patients.filter(p=>p.alert==='assessment').length],
    ['Laboratorio',patients.filter(p=>p.alert==='lab_pending').length],
    ['Imagen',patients.filter(p=>['image_pending','image_interpretation'].includes(p.alert)).length],
    ['Interconsulta',patients.filter(p=>p.alert==='consult_pending').length],
    ['Revisión médica',patients.filter(p=>['lab_ready','consult_answered','ready_redefine'].includes(p.alert)).length],
    ['Esperando cama',patients.filter(p=>p.alert==='bed_wait').length]
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
  document.querySelector('#impactResolved').textContent=impact.resolved;
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

function displayLab(p){
  return {
    none:'No solicitado',
    pending:'Pendiente',
    ready:'Resultado listo',
    done:'Revisado',
    critical:'Resultado crítico'
  }[p.lab] || '—';
}

function displayImage(p){
  return {
    none:'No solicitada',
    ordered:'Solicitada',
    performed:'Realizada · sin informe',
    reported:'Interpretada',
    not_required:'No requerida'
  }[p.image] || '—';
}

function displayConsult(p){
  return {
    none:'No solicitada',
    pending:'Pendiente',
    answered:'Respondida'
  }[p.consult] || '—';
}

function displayConduct(p){
  return {
    pending:'Pendiente de definición',
    hospitalize:'Hospitalización definida',
    observe:'Continuar observación',
    ambulatory:'Manejo ambulatorio definido'
  }[p.conduct] || 'Pendiente de definición';
}

function openPatient(p){
  document.querySelector('#drawerTitle').textContent=`Paciente ${String(p.id).padStart(3,'0')}`;
  document.querySelector('#drawerSub').textContent=
    `${p.location} · ${p.service} · Triage ${p.triage} · ${p.doctor} · ${stayText(p.stayMin)}`;

  document.querySelector('#drawerLab').textContent=displayLab(p);
  document.querySelector('#drawerImage').textContent=displayImage(p);
  document.querySelector('#drawerConsult').textContent=displayConsult(p);
  document.querySelector('#drawerConduct').textContent=displayConduct(p);

  document.querySelector('#timeline').innerHTML=p.events.slice(-12).map(e=>
    `<div class="tl-event"><strong>${e.t}</strong><span>${e.text}</span></div>`
  ).join('');

  document.querySelector('#drawerAction').textContent=actionFor(p);
  document.querySelector('#drawer').classList.add('open');
}

document.querySelector('#drawerClose').onclick=()=>document.querySelector('#drawer').classList.remove('open');

function setFilter(filter){
  activeFilter=filter;
  currentPage=1;

  document.querySelectorAll('.filter').forEach(x=>{
    x.classList.toggle('active',x.dataset.filter===filter);
  });

  renderPatients();
}

document.querySelectorAll('.filter').forEach(b=>{
  b.onclick=()=>setFilter(b.dataset.filter);
});

document.querySelectorAll('.action-card').forEach(b=>{
  b.onclick=()=>{
    setFilter(b.dataset.filter);
    document.querySelector('.table-panel').scrollIntoView({behavior:'smooth',block:'start'});
  };
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
  if(currentPage>1){
    currentPage--;
    renderPatients();
  }
};

document.querySelector('#nextPage').onclick=()=>{
  const pages=Math.max(1,Math.ceil(getDiverseRanked().length/PAGE_SIZE));
  if(currentPage<pages){
    currentPage++;
    renderPatients();
  }
};

const architectureModal=document.querySelector('#architectureModal');

document.querySelector('#architectureBtn').onclick=()=>{
  architectureModal.classList.add('open');
  architectureModal.setAttribute('aria-hidden','false');
};

document.querySelector('#architectureClose').onclick=closeArchitecture;

architectureModal.onclick=e=>{
  if(e.target===architectureModal) closeArchitecture();
};

function closeArchitecture(){
  architectureModal.classList.remove('open');
  architectureModal.setAttribute('aria-hidden','true');
}

function appendPatientEvent(p,text){
  p.events.push({t:nowTime(false),text});
}

function resolvePatient(p,outcome){
  impact.resolved++;
  impact.moves++;
  impact.minutes+=rand(5,22);

  if(outcome==='hospitalize'){
    p.alert='bed_wait';
    p.stage='destination';
    p.conduct='hospitalize';
    p.alertMin=0;
    appendPatientEvent(p,'Médico de Urgencias definió hospitalización');
    appendPatientEvent(p,'Solicitud de cama activada');
    logEvent('Conducta definida',`Paciente ${String(p.id).padStart(3,'0')} queda pendiente de cama.`,true);
  }

  else if(outcome==='observe'){
    p.alert='in_progress';
    p.stage='diagnostics';
    p.conduct='observe';
    p.alertMin=0;
    appendPatientEvent(p,'Médico de Urgencias define continuar observación');
    logEvent('Conducta definida',`Paciente ${String(p.id).padStart(3,'0')} continúa en observación.`);
  }

  else {
    p.conduct='ambulatory';
    appendPatientEvent(p,'Médico de Urgencias define manejo ambulatorio');
    logEvent('Conducta definida',`Paciente ${String(p.id).padStart(3,'0')} completa su atención y sale del flujo.`,true);
    patients.splice(patients.indexOf(p),1);
  }
}

function simulationTick(){
  patients.forEach(p=>{
    p.stayMin+=SIM_MINUTES_PER_TICK;
    if(p.alertMin>0) p.alertMin+=SIM_MINUTES_PER_TICK;
  });

  for(let i=0;i<rand(8,13);i++) advanceRandomPatient();

  for(let i=0;i<rand(1,3);i++) addPatient();

  if(patients.length>254){
    const candidates=patients.filter(p=>p.alert==='bed_wait'&&p.alertMin>60);
    if(candidates.length){
      const p=pick(candidates);
      appendPatientEvent(p,'Cama asignada · traslado a hospitalización');
      logEvent('Paciente trasladado',`Paciente ${String(p.id).padStart(3,'0')} sale de Urgencias hacia hospitalización.`);
      patients.splice(patients.indexOf(p),1);
      impact.moves++;
    }
  }

  while(patients.length<246) addPatient();

  document.querySelector('#lastUpdate').textContent=nowTime();
  document.querySelector('#liveLabel').textContent='Actualizando...';
  setTimeout(()=>document.querySelector('#liveLabel').textContent='Monitor activo · Demo simulada',1200);

  render();
}

function addPatient(){
  nextId++;
  const p=makePatient(nextId,'assessment');
  p.stayMin=rand(5,25);
  p.triage=weightedTriage();
  p.doctor='Pendiente asignación';
  p.events=[
    {t:nowTime(false),text:'Nuevo ingreso a Urgencias'},
    {t:nowTime(false),text:`Triage ${p.triage} registrado`}
  ];
  p.changed=true;
  patients.push(p);

  logEvent(
    'Nuevo ingreso',
    `Paciente ${String(p.id).padStart(3,'0')} · Triage ${p.triage} · pendiente valoración.`,
    chance(.2)
  );
}

function advanceRandomPatient(){
  const p=pick(patients);
  if(!p) return;

  p.changed=true;

  if(p.alert==='assessment'){
    p.doctor=pick(doctors);
    p.alert=chance(.45)?'lab_pending':chance(.5)?'image_pending':'in_progress';
    p.stage='diagnostics';
    p.alertMin=0;
    appendPatientEvent(p,`Valoración médica completada por ${p.doctor}`);

    if(p.alert==='lab_pending'){
      p.lab='pending';
      appendPatientEvent(p,'Laboratorios solicitados');
      if(chance(.65)) appendPatientEvent(p,'Muestra tomada · resultado pendiente');
      logEvent('Valoración completada',`Paciente ${String(p.id).padStart(3,'0')} queda pendiente de laboratorio.`);
    }

    else if(p.alert==='image_pending'){
      p.image='ordered';
      appendPatientEvent(p,'Imagen diagnóstica solicitada');
      logEvent('Nueva orden de imagen',`Paciente ${String(p.id).padStart(3,'0')} espera realización del estudio.`);
    }

    else {
      appendPatientEvent(p,'Manejo inicial en curso');
    }

    impact.moves++;
  }

  else if(p.alert==='lab_pending'){
    p.lab=chance(.05)?'critical':'ready';
    p.alert=p.lab==='critical'?'critical':'lab_ready';
    p.stage='redefinition';
    p.alertMin=0;
    appendPatientEvent(p,p.lab==='critical'?'Resultado crítico disponible':'Resultados de laboratorio disponibles');

    logEvent(
      p.lab==='critical'?'Resultado crítico':'Laboratorio listo',
      `Paciente ${String(p.id).padStart(3,'0')} tiene un nuevo resultado para revisar.`,
      p.lab==='critical'||chance(.25)
    );
    impact.moves++;
  }

  else if(p.alert==='lab_ready'){
    if(chance(.35)){
      p.image='ordered';
      p.alert='image_pending';
      p.stage='diagnostics';
      p.alertMin=0;
      appendPatientEvent(p,'Médico revisó laboratorios y solicitó imagen');
      logEvent('Nueva orden de imagen',`Paciente ${String(p.id).padStart(3,'0')} avanza a estudio diagnóstico.`);
    }

    else if(chance(.35)){
      p.consult='pending';
      p.alert='consult_pending';
      p.stage='consult';
      p.alertMin=0;
      appendPatientEvent(p,'Médico revisó laboratorios y solicitó interconsulta');
      logEvent('Interconsulta solicitada',`Paciente ${String(p.id).padStart(3,'0')} espera respuesta de especialidad.`);
    }

    else {
      p.alert='ready_redefine';
      p.stage='redefinition';
      p.alertMin=0;
      appendPatientEvent(p,'Laboratorios revisados · paciente listo para redefinir conducta');
      logEvent('Listo para redefinir',`Paciente ${String(p.id).padStart(3,'0')} ya tiene información suficiente.`,true);
    }

    p.lab='done';
    impact.moves++;
  }

  else if(p.alert==='image_pending'){
    p.image='performed';
    p.alert='image_interpretation';
    p.stage='diagnostics';
    p.alertMin=0;
    appendPatientEvent(p,'Imagen realizada · pendiente interpretación');
    logEvent('Imagen realizada',`Paciente ${String(p.id).padStart(3,'0')} queda pendiente del informe.`,chance(.25));
    impact.moves++;
  }

  else if(p.alert==='image_interpretation'){
    p.image='reported';
    p.alertMin=0;
    appendPatientEvent(p,'Imagen interpretada');

    if(chance(.38)){
      p.consult='pending';
      p.alert='consult_pending';
      p.stage='consult';
      appendPatientEvent(p,'Interconsulta solicitada después de revisar imagen');
      logEvent('Imagen interpretada',`Paciente ${String(p.id).padStart(3,'0')} avanza a interconsulta.`);
    } else {
      p.alert='ready_redefine';
      p.stage='redefinition';
      appendPatientEvent(p,'Informe de imagen disponible · pendiente redefinición médica');
      logEvent('Imagen interpretada',`Paciente ${String(p.id).padStart(3,'0')} quedó listo para redefinir conducta.`,true);
    }

    impact.moves++;
  }

  else if(p.alert==='consult_pending'){
    p.consult='answered';
    p.alert='consult_answered';
    p.stage='redefinition';
    p.alertMin=0;
    appendPatientEvent(p,'Especialidad respondió la interconsulta');
    appendPatientEvent(p,'Pendiente revisión por médico de Urgencias');

    logEvent(
      'Interconsulta respondida',
      `Paciente ${String(p.id).padStart(3,'0')} requiere revisión del médico de Urgencias para definir conducta.`,
      true
    );

    impact.moves++;
  }

  else if(p.alert==='consult_answered'){
    appendPatientEvent(p,'Médico de Urgencias revisó la respuesta de interconsulta');

    const r=Math.random();
    if(r<0.62) resolvePatient(p,'ambulatory');
    else if(r<0.84) resolvePatient(p,'hospitalize');
    else resolvePatient(p,'observe');
  }

  else if(p.alert==='ready_redefine'){
    appendPatientEvent(p,'Médico de Urgencias reevaluó al paciente');

    const r=Math.random();
    if(r<0.60) resolvePatient(p,'ambulatory');
    else if(r<0.82) resolvePatient(p,'hospitalize');
    else resolvePatient(p,'observe');
  }

  else if(p.alert==='critical'){
    p.lab='done';
    p.alert='ready_redefine';
    p.stage='redefinition';
    p.alertMin=0;
    appendPatientEvent(p,'Resultado crítico revisado por el equipo');
    appendPatientEvent(p,'Pendiente redefinición de conducta');
    logEvent('Crítico revisado',`Paciente ${String(p.id).padStart(3,'0')} queda listo para redefinir conducta.`,true);
    impact.moves++;
    impact.minutes+=rand(4,12);
  }

  else if(p.alert==='bed_wait'){
    if(chance(.18)){
      appendPatientEvent(p,'Gestión de cama actualizada · aún sin disponibilidad');
      logEvent('Gestión de cama',`Paciente ${String(p.id).padStart(3,'0')} continúa pendiente de traslado.`);
    } else {
      p.changed=false;
    }
  }

  else {
    const choices=['lab','image','consult','redefine'];
    const action=pick(choices);

    if(action==='lab'){
      p.lab='pending';
      p.alert='lab_pending';
      p.stage='diagnostics';
      p.alertMin=0;
      appendPatientEvent(p,'Laboratorios solicitados');
      if(chance(.55)) appendPatientEvent(p,'Muestra tomada');
      logEvent('Laboratorio solicitado',`Paciente ${String(p.id).padStart(3,'0')} queda pendiente de resultado.`);
    }

    else if(action==='image'){
      p.image='ordered';
      p.alert='image_pending';
      p.stage='diagnostics';
      p.alertMin=0;
      appendPatientEvent(p,'Imagen diagnóstica solicitada');
      logEvent('Imagen solicitada',`Paciente ${String(p.id).padStart(3,'0')} espera realización del estudio.`);
    }

    else if(action==='consult'){
      p.consult='pending';
      p.alert='consult_pending';
      p.stage='consult';
      p.alertMin=0;
      appendPatientEvent(p,'Interconsulta solicitada');
      logEvent('Interconsulta solicitada',`Paciente ${String(p.id).padStart(3,'0')} espera especialidad.`);
    }

    else {
      p.alert='ready_redefine';
      p.stage='redefinition';
      p.alertMin=0;
      appendPatientEvent(p,'Información disponible · pendiente redefinición médica');
      logEvent('Listo para redefinir',`Paciente ${String(p.id).padStart(3,'0')} requiere nueva decisión clínica.`,chance(.2));
    }

    impact.moves++;
  }
}

function updateClock(){
  document.querySelector('#clock').textContent=nowTime();
}

setInterval(updateClock,1000);
setInterval(simulationTick,UPDATE_SECONDS*1000);

document.querySelector('#lastUpdate').textContent=nowTime();
logEvent(
  'Monitor iniciado',
  `${patients.length} pacientes activos con estados simulados a lo largo de todo el flujo.`
);

render();
updateClock();
