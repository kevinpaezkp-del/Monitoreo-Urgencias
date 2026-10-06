const UPDATE_SECONDS = 30;
let secondsLeft = UPDATE_SECONDS;
let activeFilter = 'all';
let impact = {discharges: 2, moves: 7, minutes: 96};
let nextId = 140;
let eventLog = [];

const services = ['Medicina Interna','Cardiología','Cirugía General','Neurología','Medicina Familiar','Ortopedia'];
const locations = ['Box 03','Box 06','Box 09','Box 12','Box 17','Observación 02','Observación 07','Sillas 04'];

const patients = [
  mkPatient(117,'Box 09','Medicina Interna',248,'done','not_required','answered','reevaluate','ready',22),
  mkPatient(121,'Reanimación 02','Urgencias',151,'critical','reported','none','pending','critical',17),
  mkPatient(134,'Box 04','Cardiología',302,'done','performed','none','pending','imaging',64),
  mkPatient(108,'Observación 07','Medicina Familiar',526,'done','not_required','none','discharge','discharge',41),
  mkPatient(126,'Box 18','Cirugía General',277,'done','reported','pending','pending','consult',84),
  mkPatient(131,'Observación 02','Cardiología',614,'done','reported','answered','discharge','discharge',29),
  mkPatient(136,'Box 06','Neurología',213,'pending','ordered','none','pending','waiting',12),
  mkPatient(138,'Sillas 04','Medicina Familiar',99,'done','not_required','none','reevaluate','ready',9),
  mkPatient(139,'Box 03','Ortopedia',184,'done','performed','pending','pending','imaging',36)
];

function mkPatient(id,location,service,stayMin,lab,image,consult,conduct,alert,alertMin=0){
  return {id, location, service, stayMin, lab, image, consult, conduct, alert, alertMin, changed:false, events:[
    {t:timeMinus(stayMin), text:'Ingreso a Urgencias'},
    {t:timeMinus(Math.max(15,stayMin-25)), text:'Valoración inicial'}
  ]};
}
function timeMinus(min){const d=new Date(Date.now()-min*60000);return d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false});}
function nowTime(){return new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}
function stayText(m){const h=Math.floor(m/60),min=m%60;return h?`${h} h ${String(min).padStart(2,'0')} min`:`${min} min`;}

const statusLabel={
 lab:{pending:['Pendiente','gray'],done:['Completo','ok'],critical:['Resultado crítico','danger']},
 image:{none:['No solicitada','gray'],ordered:['Solicitada','gray'],performed:['Realizada · sin informe','warn'],reported:['Interpretada','ok'],not_required:['No requerida','ok']},
 consult:{none:['No solicitada','gray'],pending:['Pendiente','warn'],answered:['Respondida','ok']},
 conduct:{pending:['Pendiente','gray'],reevaluate:['Reevaluar','info'],discharge:['Egreso definido','ok'],hospitalize:['Hospitalizar','info']}
};

function tag(type,value){const x=statusLabel[type][value]||[value,'gray'];return `<span class="tag ${x[1]}">${x[0]}</span>`;}
function alertText(p){
  const m=p.alertMin?` · ${p.alertMin} min`:'';
  return {
    critical:`Prioridad inmediata${m}`, ready:`Listo para redefinición${m}`, imaging:`Pendiente radiología${m}`,
    consult:`Interconsulta pendiente${m}`, discharge:`Completar salida${m}`, waiting:'En proceso'
  }[p.alert]||'En proceso';
}
function rowCategory(p){if(p.alert==='critical')return 'critical';if(p.alert==='ready')return 'ready';if(p.alert==='imaging')return 'imaging';if(p.alert==='discharge')return 'discharge';return 'other';}

function render(){
  renderKPIs(); renderPatients(); renderAlerts(); renderBottlenecks(); renderEvents(); renderImpact();
}
function renderKPIs(){
  document.querySelector('#kpiTotal').textContent=patients.length;
  document.querySelector('#kpiReady').textContent=patients.filter(p=>p.alert==='ready').length;
  document.querySelector('#kpiCritical').textContent=patients.filter(p=>['critical','ready'].includes(p.alert)&&p.alertMin>=15).length;
  document.querySelector('#kpiImaging').textContent=patients.filter(p=>p.alert==='imaging').length;
  document.querySelector('#kpiDischarge').textContent=patients.filter(p=>p.alert==='discharge').length;
  const actionable=patients.filter(p=>p.alertMin>0).map(p=>p.alertMin).sort((a,b)=>a-b);
  const med=actionable.length?actionable[Math.floor(actionable.length/2)]:0;
  document.querySelector('#kpiLatency').textContent=`${med} min`;
  document.querySelector('#kpiTotalSub').textContent=`${patients.filter(p=>p.location.includes('Observación')).length} en observación`;
}
function renderPatients(){
  const body=document.querySelector('#patientsBody'); body.innerHTML='';
  const list=[...patients].sort((a,b)=>priority(b)-priority(a));
  list.filter(p=>activeFilter==='all'||rowCategory(p)===activeFilter).forEach(p=>{
    const tr=document.createElement('tr'); if(p.changed)tr.classList.add('flash');
    tr.innerHTML=`<td><span class="patient-name">Paciente ${String(p.id).padStart(3,'0')}</span><span class="sub">${p.location} · ${p.service}</span></td>
      <td><b>${stayText(p.stayMin)}</b></td><td>${tag('lab',p.lab)}</td><td>${tag('image',p.image)}</td><td>${tag('consult',p.consult)}</td><td>${tag('conduct',p.conduct)}</td>
      <td><span class="tag ${p.alert==='critical'?'danger':p.alert==='imaging'||p.alert==='consult'?'warn':p.alert==='ready'?'info':p.alert==='discharge'?'ok':'gray'}">${alertText(p)}</span></td>`;
    tr.onclick=()=>openPatient(p); body.appendChild(tr);
    setTimeout(()=>p.changed=false,1200);
  });
}
function priority(p){return ({critical:6,ready:5,imaging:4,consult:3,discharge:2,waiting:1}[p.alert]||0)*1000+p.alertMin;}
function renderAlerts(){
  const host=document.querySelector('#alertsList'); host.innerHTML='';
  const alerts=[...patients].filter(p=>p.alert!=='waiting').sort((a,b)=>priority(b)-priority(a)).slice(0,7);
  if(!alerts.length){host.innerHTML='<div class="alert"><div class="alert-icon ok">✓</div><div><strong>Sin alertas prioritarias</strong><p>El flujo se encuentra estable en esta simulación.</p></div></div>';return;}
  alerts.forEach(p=>{
    const div=document.createElement('div'); div.className='alert';
    const cls=p.alert==='critical'?'danger':p.alert==='imaging'||p.alert==='consult'?'warn':p.alert==='discharge'?'ok':'info';
    const title={critical:'Resultado crítico sin cierre',ready:'Paciente listo para redefinición',imaging:'Imagen pendiente de interpretación',consult:'Interconsulta pendiente',discharge:'Egreso por completar'}[p.alert];
    div.innerHTML=`<div class="alert-icon ${cls}">${p.alert==='critical'?'!':p.alertMin||'✓'}</div><div><strong>${title}</strong><p>Paciente ${String(p.id).padStart(3,'0')} · ${alertText(p)}</p></div>`;
    div.onclick=()=>openPatient(p); host.appendChild(div);
  });
}
function renderBottlenecks(){
  const data=[['Radiología',patients.filter(p=>p.alert==='imaging').length],['Reevaluación médica',patients.filter(p=>p.alert==='ready').length],['Interconsulta',patients.filter(p=>p.alert==='consult').length],['Egreso',patients.filter(p=>p.alert==='discharge').length]];
  document.querySelector('#bottleneckTotal').textContent=data.reduce((a,b)=>a+b[1],0);
  const max=Math.max(1,...data.map(x=>x[1]));
  document.querySelector('#bottlenecks').innerHTML=data.map(([n,v])=>`<div class="brow"><span>${n}</span><div class="bar"><i style="width:${Math.max(7,v/max*100)}%"></i></div><b>${v}</b></div>`).join('');
}
function renderEvents(){document.querySelector('#eventFeed').innerHTML=eventLog.slice(0,6).map(e=>`<div class="event-item"><time>${e.time}</time><div><b>${e.title}</b><br>${e.text}</div></div>`).join('')||'<div class="event-item"><time>ahora</time><div><b>Simulación iniciada</b><br>Esperando el siguiente evento.</div></div>';}
function renderImpact(){document.querySelector('#impactDischarges').textContent=impact.discharges;document.querySelector('#impactMoves').textContent=impact.moves;document.querySelector('#impactMinutes').textContent=impact.minutes;}
function logEvent(title,text){eventLog.unshift({time:nowTime().slice(0,5),title,text}); eventLog=eventLog.slice(0,20);showToast(title,text);}
function showToast(title,text){const t=document.querySelector('#toast');t.innerHTML=`<strong>${title}</strong><span>${text}</span>`;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),5200);}

function openPatient(p){document.querySelector('#drawerTitle').textContent=`Paciente ${String(p.id).padStart(3,'0')}`;document.querySelector('#drawerSub').textContent=`${p.location} · ${p.service} · ${stayText(p.stayMin)}`;document.querySelector('#timeline').innerHTML=p.events.map(e=>`<div class="tl-event"><strong>${e.t}</strong><span>${e.text}</span></div>`).join('');document.querySelector('#drawerAction').textContent=actionFor(p);document.querySelector('#drawer').classList.add('open');}
function actionFor(p){return {critical:'Validar resultado crítico y registrar conducta.',ready:'Reevaluar: la información necesaria ya está disponible.',imaging:'Gestionar interpretación de imagen.',consult:'Gestionar respuesta de interconsulta.',discharge:'Completar actividades pendientes y liberar la salida.',waiting:'Continuar seguimiento del proceso.'}[p.alert]||'Continuar seguimiento.';}
document.querySelector('#drawerClose').onclick=()=>document.querySelector('#drawer').classList.remove('open');
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFilter=b.dataset.filter;renderPatients();});

function simulationTick(){
  patients.forEach(p=>{p.stayMin+=Math.floor(UPDATE_SECONDS/60)||1;if(p.alertMin>0)p.alertMin+=1;});
  const actions=[];
  if(Math.random()<.55) actions.push('new');
  actions.push('advance');
  if(Math.random()<.45) actions.push('advance');
  if(Math.random()<.22) actions.push('exit');
  actions.forEach(a=>a==='new'?addPatient():a==='exit'?completeExit():advancePatient());
  render();
}
function addPatient(){
  nextId++; const p=mkPatient(nextId,locations[Math.floor(Math.random()*locations.length)],services[Math.floor(Math.random()*services.length)],Math.floor(20+Math.random()*70),'pending','ordered','none','pending','waiting',0);
  p.events.push({t:nowTime().slice(0,5),text:'Órdenes iniciales registradas'});p.changed=true;patients.push(p);logEvent('Nuevo ingreso',`Paciente ${String(p.id).padStart(3,'0')} ingresó a ${p.location}.`);
}
function completeExit(){
  const candidates=patients.filter(p=>p.alert==='discharge');if(!candidates.length)return;
  const p=candidates[Math.floor(Math.random()*candidates.length)];patients.splice(patients.indexOf(p),1);impact.discharges++;impact.moves++;impact.minutes+=Math.floor(12+Math.random()*35);logEvent('Egreso completado',`Paciente ${String(p.id).padStart(3,'0')} salió de Urgencias y liberó capacidad.`);
}
function advancePatient(){
  if(!patients.length)return; const p=patients[Math.floor(Math.random()*patients.length)];
  const stamp=nowTime().slice(0,5); let changed=true;
  if(p.lab==='pending'){p.lab=Math.random()<.1?'critical':'done';p.alert=p.lab==='critical'?'critical':'waiting';p.alertMin=0;p.events.push({t:stamp,text:p.lab==='critical'?'Resultado crítico de laboratorio':'Laboratorios completos'});logEvent('Laboratorio actualizado',`Paciente ${String(p.id).padStart(3,'0')} · ${p.lab==='critical'?'resultado crítico':'resultados completos'}.`);}
  else if(p.image==='ordered'){p.image='performed';p.alert='imaging';p.alertMin=0;p.events.push({t:stamp,text:'Imagen realizada · pendiente interpretación'});logEvent('Imagen realizada',`Paciente ${String(p.id).padStart(3,'0')} espera interpretación de Radiología.`);}
  else if(p.image==='performed'){p.image='reported';p.events.push({t:stamp,text:'Imagen interpretada'});if(p.lab==='done'&&(p.consult==='answered'||p.consult==='none')){p.alert='ready';p.alertMin=0;p.conduct='reevaluate';logEvent('Paciente listo para redefinición',`Paciente ${String(p.id).padStart(3,'0')} ya tiene resultados clave disponibles.`);}else{p.alert='waiting';logEvent('Imagen interpretada',`Paciente ${String(p.id).padStart(3,'0')} ya tiene informe de Radiología.`);}}
  else if(p.consult==='pending'){p.consult='answered';p.events.push({t:stamp,text:'Interconsulta respondida'});if(p.lab==='done'&&(p.image==='reported'||p.image==='not_required')){p.alert='ready';p.alertMin=0;p.conduct='reevaluate';logEvent('Interconsulta respondida',`Paciente ${String(p.id).padStart(3,'0')} quedó listo para reevaluación.`);}else{p.alert='waiting';}}
  else if(p.alert==='critical'){p.lab='done';p.alert='ready';p.alertMin=0;p.conduct='reevaluate';p.events.push({t:stamp,text:'Resultado crítico validado · pendiente nueva conducta'});logEvent('Resultado crítico validado',`Paciente ${String(p.id).padStart(3,'0')} requiere nueva conducta.`);}
  else if(p.alert==='ready'){p.conduct=Math.random()<.83?'discharge':'hospitalize';p.events.push({t:stamp,text:p.conduct==='discharge'?'Egreso definido':'Hospitalización definida'});if(p.conduct==='discharge'){p.alert='discharge';p.alertMin=0;logEvent('Egreso definido',`Paciente ${String(p.id).padStart(3,'0')} entra a ruta de salida.`);}else{p.alert='waiting';logEvent('Hospitalización definida',`Paciente ${String(p.id).padStart(3,'0')} queda pendiente de cama.`);}impact.moves++;impact.minutes+=Math.floor(5+Math.random()*18);}
  else if(p.alert==='waiting'){
    if(p.consult==='none'&&Math.random()<.35){p.consult='pending';p.alert='consult';p.alertMin=0;p.events.push({t:stamp,text:'Interconsulta solicitada'});logEvent('Nueva interconsulta',`Paciente ${String(p.id).padStart(3,'0')} · solicitud enviada.`);}
    else if(p.image==='none'||p.image==='not_required'){p.image='ordered';p.events.push({t:stamp,text:'Imagen solicitada'});logEvent('Nueva orden de imagen',`Paciente ${String(p.id).padStart(3,'0')} · estudio solicitado.`);}
    else changed=false;
  } else changed=false;
  p.changed=changed;
}

function tickClock(){document.querySelector('#clock').textContent=nowTime();secondsLeft--;if(secondsLeft<=0){secondsLeft=UPDATE_SECONDS;simulationTick();document.querySelector('#liveLabel').textContent='Actualizado ahora';setTimeout(()=>document.querySelector('#liveLabel').textContent='Simulación activa',2200);}document.querySelector('#countdown').textContent=`00:${String(secondsLeft).padStart(2,'0')}`;}
setInterval(tickClock,1000);
logEvent('Simulación activa','Los eventos cambian automáticamente cada 30 segundos.');render();tickClock();