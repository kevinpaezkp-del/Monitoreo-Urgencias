(function menteApp(){
  "use strict";
  const SOURCE = window.MENTE_DATA || {columns:[],rows:[],slides:[],prompts:[]};
  const COLS = ["Solicitud","Origen","Destino","Prioridad","Estado","Responsable","FechaSolicitud","FechaCierre"];
  const DIMENSIONS = ["Estado","Prioridad","Origen","Destino","Responsable"];
  let records = (SOURCE.rows || []).map(r=>({...r}));
  let slideIndex=0, toastTimer=0;
  const filters={};DIMENSIONS.forEach(x=>filters[x]=new Set());
  const $=(s)=>document.querySelector(s);
  const $all=(s)=>Array.from(document.querySelectorAll(s));
  const clean=(v)=>v==null?"":String(v).trim();
  const bucket=(v)=>clean(v)||"Sin dato";
  const esc=(s)=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const colorFor=(label)=>({Creado:"#eaa74c",Asignado:"#3c6ddb",Cerrado:"#23a77c",Alta:"#dd2d5a",Media:"#e5b64f",Baja:"#42a58b",Urgencias:"#de335b",UCI:"#7355cc","Hospitalización":"#3c6ddb",Quirófano:"#43a17b"})[label]||"#54749f";
  const toDateString=(d)=>{let pad=v=>String(v).padStart(2,"0");return d instanceof Date&&!isNaN(d)?d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes()):""};
  function parseDate(value){
    if(value==null||value==="")return null;
    if(value instanceof Date)return isNaN(value)?null:value;
    if(typeof value==="number"&&Number.isFinite(value)){const utc=new Date(Math.round((value-25569)*86400000));if(isNaN(utc))return null;return new Date(utc.getUTCFullYear(),utc.getUTCMonth(),utc.getUTCDate(),utc.getUTCHours(),utc.getUTCMinutes(),utc.getUTCSeconds());}
    const s=clean(value);
    const iso=s.match(/^(\d{4})-(\d\d?)-(\d\d?)(?:[ T](\d\d?):(\d\d)(?::(\d\d))?)?/);
    const es=s.match(/^(\d\d?)\/(\d\d?)\/(\d{4})(?:[ T](\d\d?):(\d\d)(?::(\d\d))?)?/);
    let p;
    if(iso)p=[+iso[1],+iso[2],+iso[3],+(iso[4]||0),+(iso[5]||0),+(iso[6]||0)];
    else if(es)p=[+es[3],+es[2],+es[1],+(es[4]||0),+(es[5]||0),+(es[6]||0)];
    if(p){const d=new Date(p[0],p[1]-1,p[2],p[3],p[4],p[5]);return d.getFullYear()===p[0]&&d.getMonth()===p[1]-1&&d.getDate()===p[2]&&d.getHours()===p[3]&&d.getMinutes()===p[4]?d:null;}
    const d=new Date(s);return isNaN(d)?null:d;
  }
  function fmtDate(v){const d=parseDate(v);return d?toDateString(d):"—";}
  function hours(r){
    if(bucket(r.Estado)!=="Cerrado")return null;
    const a=parseDate(r.FechaSolicitud),b=parseDate(r.FechaCierre);
    if(!a||!b||b<a)return null;
    return (b-a)/3600000;
  }
  function announce(msg,error=false){const t=$("#toast");t.textContent=msg;t.style.background=error?"#a52346":"#132852";t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3400);}
  function go(tab){if(!document.getElementById(tab))tab="inicio";$all(".page").forEach(x=>x.classList.toggle("active",x.id===tab));$all(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));if(location.hash!=="#"+tab)history.replaceState(null,"","#"+tab);window.scrollTo({top:0,behavior:"auto"});}
  function renderSlide(){
    const d=SOURCE.slides[slideIndex];if(!d)return;
    $("#slideCategory").textContent=d.category||"LABORATORIO";
    $("#slideTitle").textContent=d.title||"";
    $("#slideWatermark").textContent=String(slideIndex+1).padStart(2,"0");
    $("#slideCount").textContent=String(slideIndex+1).padStart(2,"0")+" / "+SOURCE.slides.length;
    let entries=(d.lines||[]).filter(t=>t&&!/^laCardio\s*\//i.test(t));
    const groups=[];
    for(let i=0;i<entries.length;i++){
      let line=entries[i].trim();
      if(line.length<31&&entries[i+1]&&entries[i+1].length>25&&entries[i+1].length<180){line+=" — "+entries[++i];}
      groups.push(line);
    }
    $("#slideContent").innerHTML=groups.map((t,i)=>"<p class='"+(i===0||/^Paso|^Objetivo|^Vista|^Prueba|^Campo|^Laboratorio/.test(t)?"heading":"smallcell")+"'>"+esc(t)+"</p>").join("");
    $("#slideContent").scrollTop=0;
    $("#slideDots").innerHTML=SOURCE.slides.map((_,i)=>"<span"+(i===slideIndex?' class="on"':"")+"></span>").join("");
    $("#slidePrev").disabled=slideIndex===0;$("#slideNext").disabled=slideIndex===SOURCE.slides.length-1;
  }
  function displayPrompts(){
    $("#promptCards").innerHTML=(SOURCE.prompts||[]).map(p=>"<article class='promptcard'><span class='id'>PROMPT 0"+p.number+"</span><h3>"+esc(p.title)+"</h3><p>"+(p.number===1?"Dashboard HTML completo: filtros, fechas válidas, actualización y guardado.":p.number===2?"Construir gráficas directamente desde Excel.":p.number===3?"Crear la lista de Slack desde la base CSV.":p.number===4?"Visualización dentro de Slackbot usando una lista existente.":"Completar o editar información con control y verificación.")+"</p><details><summary>Mostrar el prompt completo</summary><pre>"+esc(p.text)+"</pre></details><button class='btn primary copyPrompt' data-prompt='"+p.number+"'>Copiar prompt ↗</button></article>").join("");
  }
  function buildFilterControls(){
    const el=$("#filterControls");
    el.innerHTML=DIMENSIONS.map(dim=>{
      const opts=[...new Set(records.map(r=>bucket(r[dim])))].sort((a,b)=>a.localeCompare(b,"es"));
      return "<div class='filtergroup'><h4>"+esc(dim)+"</h4>"+opts.map(v=>"<label class='filtercheck'><input type='checkbox' data-dim='"+esc(dim)+"' data-val='"+esc(v)+"'"+(filters[dim].has(v)?" checked":"")+"><span>"+esc(v)+"</span></label>").join("")+"</div>";
    }).join("");
  }
  function filteredRows(){
    const from=$("#dateFrom").value,to=$("#dateTo").value,q=$("#searchInput").value.trim().toLowerCase();
    return records.filter(r=>{
      for(const dim of DIMENSIONS)if(filters[dim].size&&!filters[dim].has(bucket(r[dim])))return false;
      if(q&&!COLS.some(c=>clean(r[c]).toLowerCase().includes(q)))return false;
      if(from||to){const d=parseDate(r.FechaSolicitud);if(!d)return false;const key=toDateString(d).slice(0,10);if(from&&key<from)return false;if(to&&key>to)return false;}
      return true;
    });
  }
  const count=(a,field)=>{const m={};for(const r of a){const v=bucket(r[field]);m[v]=(m[v]||0)+1;}return m;};
  const metric=(label,num,sub,accent=false)=>"<article class='kpi"+(accent?" accent":"")+"'><div class='label'>"+esc(label)+"</div><div class='num'>"+esc(num)+"</div><div class='sub'>"+esc(sub)+"</div></article>";
  function barRows(el,totals,field,rows){
    const ordered=Object.entries(totals).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"es"));
    if(!ordered.length){el.innerHTML="<p class='tiny-note'>No hay datos para los filtros aplicados.</p>";return;}
    const max=Math.max(1,...ordered.map(x=>x[1]));
    el.innerHTML=ordered.map(([key,n])=>"<div class='barrow'><label title='"+esc(key)+"'>"+esc(key)+"</label><div class='bartrack' title='"+n+" de "+rows.length+"'><div class='barfill' style='width:"+(100*n/max).toFixed(2)+"%;background:"+colorFor(key)+"'></div></div><strong>"+n+"</strong></div>").join("");
  }
  function renderDashboard(){
    const a=filteredRows(),states=count(a,"Estado"),priority=count(a,"Prioridad"),origins=count(a,"Origen");
    const valid=a.map(hours).filter(h=>h!=null&&Number.isFinite(h));
    const closed=states.Cerrado||0;
    const invalid=closed-valid.length;
    const average=valid.length?valid.reduce((s,v)=>s+v,0)/valid.length:null;
    const fmt=n=>n.toLocaleString("es-CO");
    $("#kpiCards").innerHTML=metric("Total solicitudes",fmt(a.length),"Con filtros aplicados")+
      metric("Creadas",fmt(states.Creado||0),"Estado = Creado")+
      metric("Asignadas",fmt(states.Asignado||0),"Estado = Asignado")+
      metric("Cerradas",fmt(closed),"Estado = Cerrado")+
      metric("% cierre",a.length?(100*closed/a.length).toFixed(1)+" %":"—","Cerradas / visibles",true)+
      metric("Tiempo medio cierre",average==null?"—":average.toFixed(2)+" h","Solo "+valid.length+" cerradas válidas",true);
    barRows($("#chartState"),states,"Estado",a);barRows($("#chartPriority"),priority,"Prioridad",a);barRows($("#chartOrigin"),origins,"Origen",a);
    $("#showingCount").textContent="Mostrando "+a.length+" de "+records.length+" registros";
    const active=DIMENSIONS.reduce((n,c)=>n+filters[c].size,0)+(($("#dateFrom").value)?1:0)+(($("#dateTo").value)?1:0)+(($("#searchInput").value)?1:0);
    $("#filterCount").textContent=active?active+" criterios activos":"Sin filtros";
    $("#durationQuality").textContent=valid.length+" de "+closed+" cerradas con fechas utilizables."+(invalid?" "+invalid+" excluida(s) por fechas ausentes, inválidas o invertidas.":"");
    $("#detailRows").innerHTML=a.length?a.map(r=>{
      const h=hours(r);const list=COLS.map(c=>{const val=bucket(r[c]);return "<td>"+(c==="Estado"||c==="Prioridad"?"<span class='tag "+esc(val.replace(/[^a-zA-Z]/g,""))+"'>"+esc(val)+"</span>":esc(c.startsWith("Fecha")?(parseDate(r[c])?fmtDate(r[c]):"—"):val))+"</td>";});
      return "<tr>"+list.join("")+"<td>"+(h==null?"—":h.toFixed(2))+"</td></tr>";
    }).join(""):"<tr><td colspan='9' style='padding:35px;text-align:center'>No hay registros con los filtros seleccionados.</td></tr>";
    const badStates=a.length-(states.Creado||0)-(states.Asignado||0)-(states.Cerrado||0);
    const msg=$("#dataMessage"); if(badStates>0){msg.hidden=false;msg.textContent="Atención: "+badStates+" registro(s) tienen estado no estándar o vacío; no se incluyen en las tres categorías de estado.";}else if(!a.length){msg.hidden=false;msg.textContent="No hay registros para este conjunto de filtros.";}else msg.hidden=true;
    $("#baseStatus").textContent=records.length+" registros cargados · "+a.length+" visibles";
    const dates=records.map(r=>parseDate(r.FechaSolicitud)).filter(Boolean);const top=dates.length?new Date(Math.max(...dates.map(x=>x.getTime()))):null;
    $("#baseDate").textContent=top?"Última solicitud en la base: "+toDateString(top):"Sin fechas de solicitud válidas";
  }
  function clear(){
    DIMENSIONS.forEach(x=>filters[x].clear());$("#dateFrom").value="";$("#dateTo").value="";$("#searchInput").value="";
    buildFilterControls();renderDashboard();
  }
  function csvCells(line,delimiter){let out=[],value="",inside=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&inside&&line[i+1]==='"'){value+='"';i++;}else if(c==='"')inside=!inside;else if(c===delimiter&&!inside){out.push(value);value="";}else value+=c;}out.push(value);return out;}
  function parseCSV(text){
    text=text.replace(/^\ufeff/,""); const header=(text.split(/\r?\n/)[0]||"");
    const delim=[";",",","\t"].sort((a,b)=>header.split(b).length-header.split(a).length)[0];
    const lines=[];let current="",quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){current+='""';i++;}else if(c==='"'){quoted=!quoted;current+=c;}else if((c==="\n"||c==="\r")&&!quoted){if(current.trim())lines.push(current);current="";if(c==="\r"&&text[i+1]==="\n")i++;}else current+=c;}
    if(current.trim())lines.push(current);
    if(!lines.length)throw Error("El CSV está vacío.");
    const heads=csvCells(lines.shift(),delim).map(x=>x.replace(/^\ufeff/,"").trim());return lines.map(line=>{const arr=csvCells(line,delim);const row={};heads.forEach((h,i)=>row[h]=arr[i]??"");return row;});
  }
  function normalizeDataset(input){
    if(!input.length)throw Error("El archivo no contiene solicitudes.");
    const headings=Object.keys(input[0]);const match={};
    for(const col of COLS){let k=headings.find(x=>x.toLowerCase().replace(/[\s_\-]/g,"")===col.toLowerCase());if(!k)throw Error("Falta la columna obligatoria «"+col+"». Columnas encontradas: "+headings.join(", "));match[col]=k;}
    const out=input.filter(r=>COLS.some(c=>clean(r[match[c]]))).map(r=>{
      const obj={};for(const col of COLS){
        let val=r[match[col]];
        if(col.startsWith("Fecha")){const d=parseDate(val);val=val==null||val===""?"":(d?toDateString(d):String(val));}
        obj[col]=clean(val);
      }return obj;
    });
    if(!out.length)throw Error("Ninguna fila contenía datos de solicitudes.");
    return out;
  }
  async function importFile(file){
    if(!file)return;
    try{
      const ext=(file.name.split(".").pop()||"").toLowerCase();let objects;
      if(ext==="csv")objects=parseCSV(await file.text());
      else if(ext==="xlsx"||ext==="xls"){
        if(!window.XLSX)throw Error("No se pudo cargar el lector de Excel. Comprueba la conexión a Internet o utiliza CSV.");
        const bytes=await file.arrayBuffer();const wb=XLSX.read(bytes,{type:"array",cellDates:true});
        let selected=null;
        for(const sheetName of wb.SheetNames){const obj=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{defval:"",raw:true});if(!obj.length)continue;const names=Object.keys(obj[0]).map(x=>x.toLowerCase().replace(/[\s_\-]/g,""));if(COLS.every(c=>names.includes(c.toLowerCase()))){selected=obj;break;}}
        if(!selected)throw Error("No se encontró una hoja con las ocho columnas del taller. Revisa encabezados y primera fila.");
        objects=selected;
      }else throw Error("Selecciona un archivo Excel (.xlsx, .xls) o CSV.");
      const converted=normalizeDataset(objects);
      records=converted;clear();announce("Base actualizada: "+records.length+" solicitudes.");
    }catch(e){announce("Error al cargar: "+e.message,true);}
    finally{$("#fileUpload").value="";}
  }
  function csvValue(s){const v=clean(s);return /[",;\n\r]/.test(v)?'"'+v.replaceAll('"','""')+'"':v;}
  function asCSV(list){return "\ufeff"+COLS.join(",")+"\r\n"+list.map(r=>COLS.map(k=>csvValue(r[k])).join(",")).join("\r\n");}
  function download(content,name,type){
    const url=URL.createObjectURL(new Blob([content],{type:type||"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=name;a.style.display="none";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
  }
  function downloadExcel(){
    if(!window.XLSX){announce("No se cargó Excel: descarga el CSV disponible en esta página.",true);return;}
    const wb=XLSX.utils.book_new();const originals=SOURCE.rows;
    const tableRows=originals.map(r=>Object.fromEntries(COLS.map(c=>[c,r[c]||""])));
    const add=(name,data)=>{const sheet=XLSX.utils.aoa_to_sheet([COLS,...data.map(r=>COLS.map(c=>r[c]))]);sheet["!cols"]=[{wch:37},{wch:20},{wch:20},{wch:14},{wch:15},{wch:19},{wch:22},{wch:22}];XLSX.utils.book_append_sheet(wb,sheet,name);};
    add("01_BASE_32",tableRows);add("02_PEGAR_28",tableRows.slice(4));
    const dict=[["Campo","Tipo","Configuración"],["Solicitud","Texto","Obligatorio"],["Origen","Elección","Urgencias | Hospitalización | UCI | Quirófano"],["Destino","Elección","Hospitalización | UCI | Imágenes | Quirófano"],["Prioridad","Elección","Alta | Media | Baja"],["Estado","Elección","Creado | Asignado | Cerrado; predeterminado Creado"],["Responsable","Elección","Sin asignar | Equipo A | Equipo B | Equipo C"],["FechaSolicitud","Fecha y hora","Obligatoria"],["FechaCierre","Fecha y hora","Opcional; solo para cerrados"]];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(dict),"03_DICCIONARIO");
    const instructions=[["MENTE ESTRATÉGICA · LABORATORIO","Solicitudes de traslado interno; datos ficticios"],["Paso 1","Crear lista SharePoint con 8 campos"],["Paso 2","Registrar manualmente TR-001 a TR-004"],["Paso 3","Pegar filas de la hoja 02_PEGAR_28"],["Paso 4","Crear vistas, exportar a Excel y probar flujo"],["Paso 5","Reutilizar la misma base con Slackbot"],["Nota","La base no contiene nombres ni datos de pacientes"]];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(instructions),"00_INSTRUCCIONES");
    XLSX.writeFile(wb,"Base_Traslados_Mente_Estrategica.xlsx");
    announce("Excel generado con 32 registros.");
  }
  function copyText(t){
    if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t).then(()=>announce("Prompt copiado al portapapeles.")).catch(()=>fallback());
    return fallback();
    function fallback(){const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.append(ta);ta.select();document.execCommand("copy");ta.remove();announce("Prompt copiado.");}
  }
  async function saveStandalone(){
    try{
      const [cssRes,jsRes]=await Promise.all([fetch("style.css"),fetch("app.js")]);
      if(!cssRes.ok||!jsRes.ok)throw Error("No se pudieron obtener los recursos de esta página.");
      const css=await cssRes.text(),js=await jsRes.text();
      const d={...SOURCE,rows:records};
      const safeJson=JSON.stringify(d).replace(/</g,"\\u003c");
      let doc="<!doctype html>\n"+document.documentElement.outerHTML;
      doc=doc.replace(/<link\b[^>]*href=["']style\.css["'][^>]*>/i,"<style>"+css+"</style>");
      doc=doc.replace(/<script\b[^>]*src=["']data\.js["'][^>]*><\/script>/i,"<script>window.MENTE_DATA = "+safeJson+";<\/script>");
      doc=doc.replace(/<script\b[^>]*src=["']app\.js["'][^>]*><\/script>/i,"<script>"+js.replaceAll("</script>","<\\/script>")+"<\/script>");
      const required=["window.MENTE_DATA = "+safeJson,"function menteApp","<style>"];
      if(!required.every(v=>doc.includes(v)))throw Error("No fue posible integrar los datos en la copia.");
      download(doc,"Mente_Estrategica_Dashboard_actualizado.html","text/html;charset=utf-8");
      announce("HTML descargado: datos actuales y cálculos dinámicos.");
    }catch(e){announce("No se pudo guardar el HTML: "+e.message,true);}
  }
  document.addEventListener("DOMContentLoaded",()=>{
    $all(".tab").forEach(el=>el.addEventListener("click",()=>go(el.dataset.tab)));
    $all("[data-go]").forEach(el=>el.addEventListener("click",()=>go(el.dataset.go)));
    $("#slidePrev").addEventListener("click",()=>{slideIndex=Math.max(0,slideIndex-1);renderSlide();});
    $("#slideNext").addEventListener("click",()=>{slideIndex=Math.min(SOURCE.slides.length-1,slideIndex+1);renderSlide();});
    $("#fullScreenBtn").addEventListener("click",()=>{const el=$("#slidePanel");if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen().catch(()=>announce("Pantalla completa no disponible.",true));});
    document.addEventListener("keydown",e=>{if(!$("#presentacion").classList.contains("active")||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==="ArrowRight"){slideIndex=Math.min(slideIndex+1,SOURCE.slides.length-1);renderSlide();}if(e.key==="ArrowLeft"){slideIndex=Math.max(0,slideIndex-1);renderSlide();}});
    $("#filterControls").addEventListener("change",e=>{if(!e.target.matches("input[type=checkbox]"))return;const {dim,val}=e.target.dataset;if(e.target.checked)filters[dim].add(val);else filters[dim].delete(val);renderDashboard();});
    $("#clearFilters").addEventListener("click",clear);
    ["dateFrom","dateTo"].forEach(id=>$("#"+id).addEventListener("change",renderDashboard));
    $("#searchInput").addEventListener("input",renderDashboard);
    $("#fileUpload").addEventListener("change",e=>importFile(e.target.files[0]));
    $("#saveHtml").addEventListener("click",saveStandalone);
    $("#downloadExcel").addEventListener("click",downloadExcel);
    $("#download28").addEventListener("click",()=>{download(asCSV(SOURCE.rows.slice(4)),"Traslados_28_para_SharePoint.csv","text/csv;charset=utf-8");announce("Descargados 28 registros.");});
    $("#promptCards").addEventListener("click",e=>{const b=e.target.closest(".copyPrompt");if(!b)return;const p=SOURCE.prompts.find(p=>String(p.number)===b.dataset.prompt);if(p)copyText(p.text);});
    renderSlide();displayPrompts();buildFilterControls();renderDashboard();go(location.hash.replace("#","")||"inicio");
  });
})();
